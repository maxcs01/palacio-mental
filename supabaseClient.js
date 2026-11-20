import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eagzlhcnuawbdzjyluxg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zj7ON3Z22KRpauwIlcAMqw_x_qkWC8x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 15
    }
  }
});

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function signInEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpEmail(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}

export async function loadCloudWorld(ownerId) {
  const { data, error } = await supabase
    .from('worlds')
    .select('id, data, updated_at')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCloudWorld(ownerId, worldData) {
  const { error } = await supabase
    .from('worlds')
    .upsert(
      {
        owner_id: ownerId,
        name: 'Cidade Médica',
        data: worldData,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'owner_id' }
    );
  if (error) throw error;
}

/**
 * Multiplayer híbrido (até 10 pessoas, sem chat livre):
 * - Presence: lista confiável de quem está online (entrada/saída/heartbeat)
 * - Broadcast: movimentação instantânea, acenos/emotes, chamados e sincronização de edições
 */
export function connectWorldPresence(
  worldOwnerId,
  myProfile,
  { onPeersUpdate, onBroadcast, onStatusChange, onSubscribed } = {}
) {
  const channelName = `world:${worldOwnerId}`;
  const channel = supabase.channel(channelName, {
    config: {
      presence: { key: myProfile.id },
      broadcast: { self: false, ack: false }
    }
  });

  let myState = { ...myProfile, updatedAt: Date.now() };
  let lastBroadcastSerialized = '';
  let lastTrackedModeKey = '';
  let subscribed = false;
  let closed = false;

  // Mapa unificado de colegas (Presence + atualizações ao vivo via Broadcast)
  const peersMap = new Map();
  peersMap.set(myProfile.id, { ...myState });

  function emitPeers() {
    if (!onPeersUpdate) return;
    const list = Array.from(peersMap.values()).slice(0, 10);
    onPeersUpdate(list);
  }

  function syncFromPresence() {
    const raw = channel.presenceState();
    const presentIds = new Set([myProfile.id]);

    Object.entries(raw).forEach(([key, arr]) => {
      const meta = Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null;
      if (!meta) return;
      const id = meta.id || key;
      presentIds.add(id);
      const prev = peersMap.get(id);
      // Preserva posição mais recente vinda via broadcast se for mais nova
      if (prev && (prev.updatedAt || 0) > (meta.updatedAt || 0)) {
        peersMap.set(id, { ...meta, ...prev, name: meta.name || prev.name, color: meta.color || prev.color });
      } else {
        peersMap.set(id, { ...meta, id });
      }
    });

    // Remove quem desconectou (mas mantém colegas recentes via broadcast por até 12s contra flicker)
    const now = Date.now();
    for (const [id, peer] of peersMap.entries()) {
      if (!presentIds.has(id) && now - (peer.lastSeen || peer.updatedAt || 0) > 12000) {
        peersMap.delete(id);
      }
    }
    emitPeers();
  }

  channel.on('presence', { event: 'sync' }, syncFromPresence);

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    syncFromPresence();
    // Quando um colega entra, reenvia nossa posição atual para ele nos ver na hora
    if (subscribed) {
      channel.send({ type: 'broadcast', event: 'peer_state', payload: myState }).catch(() => {});
    }
    if (onBroadcast && Array.isArray(newPresences)) {
      newPresences.forEach((p) => {
        if (p?.id && p.id !== myProfile.id) {
          onBroadcast('peer_join', p);
        }
      });
    }
  });

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    if (Array.isArray(leftPresences)) {
      leftPresences.forEach((p) => {
        if (p?.id && p.id !== myProfile.id) {
          peersMap.delete(p.id);
          if (onBroadcast) onBroadcast('peer_leave', p);
        }
      });
    }
    syncFromPresence();
  });

  // Broadcast instantâneo de posição/estado
  channel.on('broadcast', { event: 'peer_state' }, ({ payload }) => {
    if (!payload || !payload.id || payload.id === myProfile.id) return;
    const prev = peersMap.get(payload.id) || {};
    peersMap.set(payload.id, {
      ...prev,
      ...payload,
      lastSeen: Date.now()
    });
    emitPeers();
  });

  // Emotes, chamados e interações diretas
  ['peer_emote', 'peer_ping', 'world_sync', 'world_request'].forEach((evt) => {
    channel.on('broadcast', { event: evt }, ({ payload }) => {
      if (evt === 'peer_emote' && payload?.id && payload.id !== myProfile.id) {
        const prev = peersMap.get(payload.id) || { id: payload.id };
        peersMap.set(payload.id, {
          ...prev,
          name: payload.name || prev.name,
          color: payload.color || prev.color,
          emote: payload.emote || '',
          lastSeen: Date.now()
        });
        emitPeers();
      }
      if (onBroadcast) onBroadcast(evt, payload);
    });
  });

  // Heartbeat leve a cada 4s para manter presence + posição sincronizados
  const heartbeat = setInterval(() => {
    if (closed || !subscribed) return;
    myState.updatedAt = Date.now();
    channel.send({ type: 'broadcast', event: 'peer_state', payload: myState }).catch(() => {});
  }, 4000);

  if (onStatusChange) onStatusChange('connecting');

  channel.subscribe(async (status) => {
    if (closed) return;
    if (status === 'SUBSCRIBED') {
      subscribed = true;
      if (onStatusChange) onStatusChange('connected');
      myState.updatedAt = Date.now();
      try {
        await channel.track(myState);
      } catch (e) {
        console.warn('Falha no track inicial:', e);
      }
      channel.send({ type: 'broadcast', event: 'peer_state', payload: myState }).catch(() => {});
      if (onSubscribed) onSubscribed();
    } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
      subscribed = false;
      if (onStatusChange) onStatusChange('error');
    }
  });

  return {
    updatePosition(patch, forceTrack = false) {
      myState = { ...myState, ...patch, updatedAt: Date.now() };
      peersMap.set(myProfile.id, { ...myState });

      const broadcastPayload = {
        id: myState.id,
        name: myState.name,
        color: myState.color,
        x: myState.x,
        y: myState.y,
        mode: myState.mode,
        buildingId: myState.buildingId,
        roomId: myState.roomId,
        rgx: myState.rgx,
        rgy: myState.rgy,
        emote: myState.emote || '',
        updatedAt: myState.updatedAt
      };
      const serialized = JSON.stringify({ ...broadcastPayload, updatedAt: 0 });
      const modeKey = `${myState.name}|${myState.color}|${myState.mode}|${myState.buildingId}|${myState.roomId}`;

      if (!subscribed) return;

      if (serialized !== lastBroadcastSerialized || forceTrack) {
        lastBroadcastSerialized = serialized;
        channel.send({ type: 'broadcast', event: 'peer_state', payload: broadcastPayload }).catch(() => {});
      }

      // Atualiza presence apenas quando muda de local/perfil ou forçado (evita throttle do Presence)
      if (forceTrack || modeKey !== lastTrackedModeKey) {
        lastTrackedModeKey = modeKey;
        channel.track(broadcastPayload).catch(() => {});
      }
    },
    broadcast(event, payload) {
      if (!subscribed) return;
      channel.send({ type: 'broadcast', event, payload }).catch(() => {});
    },
    isSubscribed() {
      return subscribed;
    },
    leave() {
      closed = true;
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    }
  };
}
