import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eagzlhcnuawbdzjyluxg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zj7ON3Z22KRpauwIlcAMqw_x_qkWC8x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

// Multiplayer estilo Habbo (até 10 pessoas, sem chat) via Supabase Realtime Presence
export function connectWorldPresence(worldOwnerId, myProfile, onPeersUpdate) {
  const channel = supabase.channel(`world:${worldOwnerId}`, {
    config: { presence: { key: myProfile.id } }
  });

  channel.on('presence', { event: 'sync' }, () => {
    const raw = channel.presenceState();
    const peers = [];
    Object.values(raw).forEach((arr) => {
      if (arr && arr[0]) peers.push(arr[0]);
    });
    // Limite máximo de 10 pessoas no mundo
    onPeersUpdate(peers.slice(0, 10));
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(myProfile);
    }
  });

  return {
    updatePosition(pos) {
      channel.track({ ...myProfile, ...pos }).catch(() => {});
    },
    leave() {
      supabase.removeChannel(channel);
    }
  };
}
