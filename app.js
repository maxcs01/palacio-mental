import {
  OBJECT_CATALOG,
  ROOM_THEMES,
  CITY_LOTS,
  DEFAULT_CLINICAL_ROOMS,
  loadState,
  saveState,
  getBuildingCondition
} from './data.js';
import {
  drawIsoBox,
  drawPixelBuilding,
  drawHouse,
  drawMuseum,
  drawTree,
  drawAvatar,
  drawCar,
  drawRoomObject,
  drawIllustratedRoomShell,
  getRoomTheme
} from './sprites.js';
import { ambientMusic } from './audio.js';
import {
  getSessionUser,
  signInEmail,
  signUpEmail,
  signOutUser,
  loadCloudWorld,
  saveCloudWorld,
  connectWorldPresence
} from './supabaseClient.js';
import { saveLocalPdf, buildPdfViewerElement } from './pdfViewer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensões lógicas do canvas (CSS px) + DPR para nitidez HD
let canvasCssW = 800;
let canvasCssH = 600;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

// Dimensões fixas do mundo (24x16 tiles de 48px = 1152x768)
const TILE = 48;
const WORLD_W = 24 * TILE;
const WORLD_H = 16 * TILE;

let state = loadState();

// Navegação atual: 'city' | 'reception' | 'room'
let view = {
  mode: 'city',
  buildingId: null,
  floorId: null,
  apartmentId: null,
  roomId: null
};

// Câmera da cidade e câmera interna (recepção/quarto)
const cam = {
  x: WORLD_W / 2,
  y: WORLD_H / 2,
  zoom: 1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  moved: false
};

const innerCam = {
  zoom: 1,
  x: 0,
  y: 0
};

function resetInnerCam() {
  innerCam.zoom = 1;
  innerCam.x = 0;
  innerCam.y = 0;
}

function clampInnerCam() {
  innerCam.zoom = Math.max(0.65, Math.min(3.2, innerCam.zoom));
  innerCam.x = Math.max(-360, Math.min(360, innerCam.x));
  innerCam.y = Math.max(-280, Math.min(280, innerCam.y));
}

// Jogador e entidades vivas
const player = { x: 12 * TILE, y: 9.5 * TILE, targetX: null, targetY: null, speed: 155 };
const roomPlayer = { gx: 3.5, gy: 4.5, targetGx: null, targetGy: null, speed: 3.3 };
const keys = {};

const cars = [
  { x: 0, y: 8 * TILE + 8, vx: 75, color: '#ef4444', dir: 1 },
  { x: WORLD_W - 40, y: 8 * TILE + 26, vx: -65, color: '#eab308', dir: -1 },
  { x: 14 * TILE + 6, y: 0, vy: 55, color: '#22c55e', dir: 1, vertical: true }
];

const pedestrians = [
  { x: 9 * TILE, y: 7.4 * TILE, vx: 22, minX: 7 * TILE, maxX: 14 * TILE, shirt: '#f472b6' },
  { x: 15 * TILE, y: 10.3 * TILE, vx: -18, minX: 10 * TILE, maxX: 17 * TILE, shirt: '#facc15' },
  { x: 11.2 * TILE, y: 9.2 * TILE, vx: 0, shirt: '#34d399' },
  { x: 11.7 * TILE, y: 9.2 * TILE, vx: 0, shirt: '#fb923c' }
];

const ducks = [
  { x: 12.2 * TILE, y: 8.6 * TILE, angle: 0 },
  { x: 12.8 * TILE, y: 8.8 * TILE, angle: 2.2 }
];

let trafficLightGreen = true;
let trafficTimer = 0;

// Estado do Estúdio de Edição de Quartos
let editMode = false;
let editorTab = 'add'; // 'add' | 'move' | 'style'
let selectedPaletteType = OBJECT_CATALOG[0].id;
let movingObjectId = null;
let hoveredRoomTile = null; // { gx, gy, occupied }

// ---------------- MULTIPLAYER ESTILO HABBO (ATÉ 10 PESSOAS) ----------------
const urlParams = new URLSearchParams(window.location.search);
const sharedWorldOwnerId = urlParams.get('world');
const sharedRole = sharedWorldOwnerId ? (urlParams.get('role') === 'editor' ? 'editor' : 'viewer') : 'owner';

function getOrCreateLocalWorldId() {
  let id = localStorage.getItem('palacio_guest_world_v1');
  if (!id) {
    id = `sala-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('palacio_guest_world_v1', id);
  }
  return id;
}

const myPeerId = `peer-${Math.random().toString(36).slice(2, 8)}`;
let myAvatar = JSON.parse(localStorage.getItem('palacio_avatar_v1') || '{"name":"Você","color":"#38bdf8"}');
let remotePeers = [];
const peerSmoothPos = new Map(); // interpolação suave dos avatares remotos
let presenceConn = null;
let connectedWorldId = null;
let multiplayerStatus = 'offline'; // 'offline' | 'connecting' | 'connected' | 'error'
let lastPresenceSent = 0;
let myEmote = '';
let myEmoteTimer = null;

// Elementos de UI
const breadcrumbEl = document.getElementById('breadcrumb');
const btnFriends = document.getElementById('btnFriends');
const btnAccount = document.getElementById('btnAccount');
const btnDayNight = document.getElementById('btnDayNight');
const btnMusic = document.getElementById('btnMusic');
const btnBack = document.getElementById('btnBack');
const btnRonda = document.getElementById('btnRonda');
const cityHud = document.getElementById('cityHud');
const receptionHud = document.getElementById('receptionHud');
const roomHud = document.getElementById('roomHud');
const btnToggleEdit = document.getElementById('btnToggleEdit');
const btnRoomRonda = document.getElementById('btnRoomRonda');
const objectPaletteEl = document.getElementById('objectPalette');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const toastStack = document.getElementById('toastStack');
const onlineBar = document.getElementById('onlineBar');
const onlineBarTitle = document.getElementById('onlineBarTitle');
const onlinePeersStrip = document.getElementById('onlinePeersStrip');

// Elementos do Estúdio de Edição
const editBanner = document.getElementById('editBanner');
const editBannerText = document.getElementById('editBannerText');
const btnExitEditTop = document.getElementById('btnExitEditTop');
const roomEditorPanel = document.getElementById('roomEditorPanel');
const editorRoomMeta = document.getElementById('editorRoomMeta');
const btnCloseEdit = document.getElementById('btnCloseEdit');
const btnToggleDrawer = document.getElementById('btnToggleDrawer');
const tabAdd = document.getElementById('tabAdd');
const tabMove = document.getElementById('tabMove');
const tabStyle = document.getElementById('tabStyle');
const moveStatusBox = document.getElementById('moveStatusBox');
const btnCancelMove = document.getElementById('btnCancelMove');
const themeGrid = document.getElementById('themeGrid');
const inpRenameRoom = document.getElementById('inpRenameRoom');
const btnRenameRoom = document.getElementById('btnRenameRoom');
const roomObjectsList = document.getElementById('roomObjectsList');

// ---------------- TOASTS & INTERAÇÕES MULTIPLAYER ----------------
function showToast(message, actionLabel = '', onAction = null, durationMs = 4800) {
  const item = document.createElement('div');
  item.className = 'toast-item';
  const span = document.createElement('span');
  span.textContent = message;
  item.appendChild(span);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.className = 'btn-primary btn-sm';
    btn.textContent = actionLabel;
    btn.onclick = () => {
      item.remove();
      onAction();
    };
    item.appendChild(btn);
  }

  toastStack.appendChild(item);
  setTimeout(() => {
    item.remove();
  }, durationMs);
}

function getMyLocationPayload() {
  return {
    id: myPeerId,
    name: myAvatar.name,
    color: myAvatar.color,
    x: Math.round(player.x),
    y: Math.round(player.y),
    mode: view.mode,
    buildingId: view.buildingId,
    roomId: view.roomId,
    rgx: Number(roomPlayer.gx.toFixed(2)),
    rgy: Number(roomPlayer.gy.toFixed(2)),
    emote: myEmote
  };
}

function pushMyPresenceNow(forceTrack = false) {
  if (!presenceConn) return;
  presenceConn.updatePosition(getMyLocationPayload(), forceTrack);
}

function triggerEmote(text, targetPeerId = null) {
  myEmote = text;
  if (myEmoteTimer) clearTimeout(myEmoteTimer);
  if (presenceConn) {
    presenceConn.updatePosition({ emote: myEmote });
    presenceConn.broadcast('peer_emote', {
      id: myPeerId,
      name: myAvatar.name,
      color: myAvatar.color,
      emote: myEmote,
      targetPeerId,
      location: getMyLocationPayload()
    });
  }
  myEmoteTimer = setTimeout(() => {
    myEmote = '';
    if (presenceConn) {
      presenceConn.updatePosition({ emote: '' });
      presenceConn.broadcast('peer_emote', { id: myPeerId, emote: '' });
    }
  }, 4500);
}

function callPeerHere(peer) {
  if (!presenceConn) return;
  triggerEmote('📣 Vem cá!', peer.id);
  presenceConn.broadcast('peer_ping', {
    fromId: myPeerId,
    fromName: myAvatar.name,
    targetId: peer.id,
    location: getMyLocationPayload()
  });
  showToast(`📣 Chamado enviado para ${peer.name || 'colega'}!`);
}

function formatPeerLocation(peer) {
  if (!peer) return 'Na cidade';
  if (peer.mode === 'city' || !peer.mode) return 'Na cidade';
  const b = state.buildings.find((x) => x.id === peer.buildingId);
  if (peer.mode === 'reception') return b ? `Recepção • ${b.name}` : 'Na recepção';
  if (peer.mode === 'room' && b) {
    for (const f of b.floors) {
      for (const ap of f.apartments) {
        const rm = ap.rooms.find((r) => r.id === peer.roomId);
        if (rm) return `${b.name} → ${rm.name}`;
      }
    }
    return `Em ${b.name}`;
  }
  return 'Estudando';
}

function goHome() {
  setEditMode(false);
  view = { mode: 'city', buildingId: null, floorId: null, apartmentId: null, roomId: null };
  updateTopbar();
  pushMyPresenceNow(true);
}

function goToPeer(peer) {
  if (!peer) return;
  if (peer.mode === 'reception' && peer.buildingId) {
    enterBuilding(peer.buildingId);
  } else if (peer.mode === 'room' && peer.buildingId && peer.roomId) {
    const b = state.buildings.find((x) => x.id === peer.buildingId);
    if (b) {
      for (const f of b.floors) {
        for (const ap of f.apartments) {
          const rm = ap.rooms.find((r) => r.id === peer.roomId);
          if (rm) {
            enterRoom(b.id, f.id, ap.id, rm.id);
            roomPlayer.gx = typeof peer.rgx === 'number' ? Math.max(0.6, peer.rgx - 0.7) : 3.5;
            roomPlayer.gy = typeof peer.rgy === 'number' ? peer.rgy : 4.5;
            pushMyPresenceNow(true);
            return;
          }
        }
      }
    }
    showToast('O quarto desse colega ainda está sincronizando...');
  } else {
    goHome();
    if (typeof peer.x === 'number' && typeof peer.y === 'number') {
      player.targetX = Math.min(WORLD_W - TILE, peer.x + 26);
      player.targetY = peer.y;
      cam.x = peer.x;
      cam.y = peer.y;
      clampCamera();
    }
  }
}

function renderOnlineBar() {
  const others = remotePeers.filter((p) => p.id !== myPeerId);
  const totalOnline = others.length + 1;
  const dot = multiplayerStatus === 'connected' ? '🟢' : multiplayerStatus === 'connecting' ? '🟡' : '👥';
  btnFriends.textContent = others.length > 0 ? `${dot} Amigos (${totalOnline}/10)` : '👥 Amigos';

  if (others.length === 0) {
    onlineBar.classList.add('hidden');
    return;
  }

  onlineBar.classList.remove('hidden');
  onlineBarTitle.textContent = `${others.length} colega${others.length > 1 ? 's' : ''} online`;
  onlinePeersStrip.innerHTML = '';

  others.slice(0, 5).forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'peer-chip';
    btn.innerHTML = `
      <span class="peer-chip-info">
        <span class="peer-color-dot" style="background:${p.color || '#f43f5e'}"></span>
        <span>
          <strong>${escapeHtml(p.name || 'Amigo')}</strong>
          <span class="peer-chip-loc">📍 ${escapeHtml(formatPeerLocation(p))}</span>
        </span>
      </span>
      <span style="font-size:11px;color:var(--accent)">Interagir</span>
    `;
    btn.onclick = () => openPeerModal(p);
    onlinePeersStrip.appendChild(btn);
  });
}

function openPeerModal(peer) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="card-box">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="peer-color-dot" style="width:16px;height:16px;background:${peer.color || '#f43f5e'}"></span>
        <div>
          <strong>${escapeHtml(peer.name || 'Amigo')}</strong>
          <div style="font-size:12px;color:var(--muted)">📍 ${escapeHtml(formatPeerLocation(peer))}</div>
        </div>
      </div>
      <div class="row-actions" style="margin-top:6px;">
        <button class="btn-primary" id="btnPeerGo">📍 Ir até ${escapeHtml(peer.name || 'colega')}</button>
        <button class="btn-secondary" id="btnPeerCall">📣 Chamar para cá</button>
      </div>
      <div class="row-actions">
        <button class="btn-ghost" id="btnPeerWave">👋 Acenar</button>
        <button class="btn-ghost" id="btnPeerIdea">💡 Entendi!</button>
        <button class="btn-ghost" id="btnPeerFire">🔥 Foco!</button>
        <button class="btn-ghost" id="btnPeerClap">👏 Boa revisão!</button>
      </div>
    </div>
  `;
  openModal('👤 Colega de Estudo', wrap);
  document.getElementById('btnPeerGo').onclick = () => { closeModal(); goToPeer(peer); };
  document.getElementById('btnPeerCall').onclick = () => { callPeerHere(peer); closeModal(); };
  document.getElementById('btnPeerWave').onclick = () => { triggerEmote('👋', peer.id); closeModal(); };
  document.getElementById('btnPeerIdea').onclick = () => { triggerEmote('💡 Entendi!', peer.id); closeModal(); };
  document.getElementById('btnPeerFire').onclick = () => { triggerEmote('🔥 Foco!', peer.id); closeModal(); };
  document.getElementById('btnPeerClap').onclick = () => { triggerEmote('👏 Boa!', peer.id); closeModal(); };
}

// ---------------- UTILIDADES ----------------
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentBuilding() {
  return state.buildings.find((b) => b.id === view.buildingId) || null;
}

function getCurrentFloor() {
  const b = getCurrentBuilding();
  return b ? b.floors.find((f) => f.id === view.floorId) || null : null;
}

function getCurrentApartment() {
  const f = getCurrentFloor();
  return f ? f.apartments.find((a) => a.id === view.apartmentId) || null : null;
}

function getCurrentRoom() {
  const a = getCurrentApartment();
  return a ? a.rooms.find((r) => r.id === view.roomId) || null : null;
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvasCssW = Math.max(320, Math.floor(rect.width));
  canvasCssH = Math.max(240, Math.floor(rect.height));
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvasCssW * dpr);
  canvas.height = Math.round(canvasCssH * dpr);
  clampCamera();
}

function getMinZoom() {
  return Math.max(canvasCssW / WORLD_W, canvasCssH / WORLD_H, 0.55);
}

function clampCamera() {
  const minZ = getMinZoom();
  cam.zoom = Math.max(minZ, Math.min(2.6, cam.zoom));
  const halfW = canvasCssW / (2 * cam.zoom);
  const halfH = canvasCssH / (2 * cam.zoom);
  cam.x = Math.max(halfW, Math.min(WORLD_W - halfW, cam.x));
  cam.y = Math.max(halfH, Math.min(WORLD_H - halfH, cam.y));
}

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const cx = sx - rect.left;
  const cy = sy - rect.top;
  return {
    x: cam.x + (cx - canvasCssW / 2) / cam.zoom,
    y: cam.y + (cy - canvasCssH / 2) / cam.zoom
  };
}

function updateTopbar() {
  btnDayNight.textContent = state.isNight ? '🌙' : '☀️';
  if (view.mode === 'city') {
    breadcrumbEl.textContent = 'Cidade Médica';
    btnBack.classList.add('hidden');
    btnRonda.classList.remove('hidden');
    cityHud.classList.remove('hidden');
    receptionHud.classList.add('hidden');
    roomHud.classList.add('hidden');
    editBanner.classList.add('hidden');
    roomEditorPanel.classList.add('hidden');
  } else if (view.mode === 'reception') {
    const b = getCurrentBuilding();
    breadcrumbEl.textContent = `Cidade → ${b ? b.name : ''} (Recepção)`;
    btnBack.classList.remove('hidden');
    btnRonda.classList.add('hidden');
    cityHud.classList.add('hidden');
    receptionHud.classList.remove('hidden');
    roomHud.classList.add('hidden');
    editBanner.classList.add('hidden');
    roomEditorPanel.classList.add('hidden');
  } else if (view.mode === 'room') {
    const b = getCurrentBuilding();
    const a = getCurrentApartment();
    const r = getCurrentRoom();
    breadcrumbEl.textContent = `${b?.name || ''} → ${a?.name || ''} → ${r?.name || ''}`;
    btnBack.classList.remove('hidden');
    btnRonda.classList.add('hidden');
    cityHud.classList.add('hidden');
    receptionHud.classList.add('hidden');
    roomHud.classList.toggle('hidden', editMode);
    editBanner.classList.toggle('hidden', !editMode);
    roomEditorPanel.classList.toggle('hidden', !editMode);
    if (editMode) refreshEditorPanel();
  }
}

function openModal(title, htmlOrNode) {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  if (typeof htmlOrNode === 'string') {
    modalBody.innerHTML = htmlOrNode;
  } else {
    modalBody.appendChild(htmlOrNode);
  }
  modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

// ---------------- ESTÚDIO DE EDIÇÃO DO QUARTO ----------------
function setEditMode(on) {
  if (on && sharedRole === 'viewer') {
    showToast('Você entrou como Visitante neste mundo (somente leitura).');
    return;
  }
  editMode = Boolean(on);
  movingObjectId = null;
  hoveredRoomTile = null;
  if (editMode) {
    roomEditorPanel.classList.remove('collapsed');
    btnToggleDrawer.textContent = '▾';
  }
  updateTopbar();
  updateEditorBanner();
}

function setEditorTab(tab) {
  editorTab = tab;
  movingObjectId = null;
  document.querySelectorAll('.editor-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.editorTab === tab);
  });
  tabAdd.classList.toggle('hidden', tab !== 'add');
  tabMove.classList.toggle('hidden', tab !== 'move');
  tabStyle.classList.toggle('hidden', tab !== 'style');
  refreshEditorPanel();
  updateEditorBanner();
}

function updateEditorBanner() {
  if (!editMode) return;
  if (editorTab === 'add') {
    const cat = OBJECT_CATALOG.find((c) => c.id === selectedPaletteType);
    editBannerText.textContent = `Adicionar "${cat?.shortName || 'Móvel'}": toque num espaço livre • ou toque num objeto para editar`;
  } else if (editorTab === 'move') {
    const room = getCurrentRoom();
    const obj = room?.objects.find((o) => o.id === movingObjectId);
    if (obj) {
      editBannerText.textContent = `Movendo "${obj.title || 'Objeto'}": toque no novo ladrilho livre`;
    } else {
      editBannerText.textContent = 'Mover: toque primeiro no objeto que deseja mudar de lugar';
    }
  } else {
    editBannerText.textContent = 'Estilo do Quarto: personalize a textura do ambiente ou gerencie os objetos';
  }
}

function refreshEditorPanel() {
  const room = getCurrentRoom();
  if (!room) return;

  const count = room.objects.length;
  editorRoomMeta.textContent = `${room.name} • ${count} objeto${count === 1 ? '' : 's'}`;

  // Atualiza status da aba Mover
  const movingObj = room.objects.find((o) => o.id === movingObjectId);
  if (movingObj) {
    moveStatusBox.innerHTML = `<strong>Selecionado: ${escapeHtml(movingObj.title || 'Objeto')}</strong><br /><span>Agora toque em qualquer ladrilho livre no quarto para reposicionar.</span>`;
    btnCancelMove.classList.remove('hidden');
  } else {
    moveStatusBox.innerHTML = `<strong>1. Toque no objeto</strong> que você quer mudar de lugar.<br /><span>Depois toque no ladrilho livre de destino.</span>`;
    btnCancelMove.classList.add('hidden');
  }

  // Atualiza temas visuais
  const currentTheme = room.theme || 'clinic';
  themeGrid.innerHTML = '';
  ROOM_THEMES.forEach((th) => {
    const card = document.createElement('button');
    card.className = `theme-card ${th.id === currentTheme ? 'active' : ''}`;
    card.innerHTML = `
      <div class="theme-swatches">
        ${th.swatch.map((c) => `<span class="theme-swatch-dot" style="background:${c}"></span>`).join('')}
      </div>
      <strong>${th.name}</strong>
      <small>${th.desc}</small>
    `;
    card.onclick = () => {
      room.theme = th.id;
      persistState();
      refreshEditorPanel();
    };
    themeGrid.appendChild(card);
  });

  // Atualiza input de renomear
  if (document.activeElement !== inpRenameRoom) {
    inpRenameRoom.value = room.name || '';
  }

  // Atualiza lista de objetos do quarto
  roomObjectsList.innerHTML = '';
  if (room.objects.length === 0) {
    roomObjectsList.innerHTML = '<p class="editor-tip">Nenhum objeto neste quarto ainda. Use a aba ➕ Móveis!</p>';
  } else {
    room.objects.forEach((obj) => {
      const cat = OBJECT_CATALOG.find((c) => c.id === obj.type);
      const row = document.createElement('div');
      row.className = 'room-obj-row';
      row.innerHTML = `
        <img src="${cat?.thumb || '/assets/book.jpg'}" alt="${escapeHtml(cat?.shortName || '')}" />
        <div class="room-obj-row-info">
          <strong>${escapeHtml(obj.title || cat?.name || 'Objeto')}</strong>
          <small>${escapeHtml(cat?.shortName || obj.type)} • (${obj.gx + 1}, ${obj.gy + 1})</small>
        </div>
        <button class="btn-ghost btn-sm" data-act="edit" title="Editar">✏️</button>
        <button class="btn-ghost btn-sm" data-act="del" title="Remover">🗑️</button>
      `;
      row.querySelector('[data-act="edit"]').onclick = () => openObjectModal(obj, room);
      row.querySelector('[data-act="del"]').onclick = () => {
        room.objects = room.objects.filter((o) => o.id !== obj.id);
        if (movingObjectId === obj.id) movingObjectId = null;
        persistState();
        refreshEditorPanel();
      };
      roomObjectsList.appendChild(row);
    });
  }
}

// ---------------- NAVEGAÇÃO E MODAIS ----------------
function enterBuilding(buildingId) {
  setEditMode(false);
  resetInnerCam();
  view = { mode: 'reception', buildingId, floorId: null, apartmentId: null, roomId: null };
  updateTopbar();
  pushMyPresenceNow(true);
}

function openDecayConfigModal(building) {
  const currentLimit = building.decayDays || state.decayThresholdDays || 14;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p style="color:var(--muted);font-size:13px;">Defina em quantos dias sem revisão o prédio <strong>${escapeHtml(building.name)}</strong> começa a ficar velho.</p>
    <div class="row-actions">
      <button class="btn-secondary preset-day" data-d="7">7 dias</button>
      <button class="btn-secondary preset-day" data-d="14">14 dias</button>
      <button class="btn-secondary preset-day" data-d="21">21 dias</button>
      <button class="btn-secondary preset-day" data-d="30">30 dias</button>
    </div>
    <div class="field">
      <label>Ou digite um prazo personalizado (dias)</label>
      <input id="customDecayInput" type="number" min="1" max="365" value="${currentLimit}" />
    </div>
    <button id="btnSaveDecay" class="btn-primary">Salvar Prazo</button>
  `;
  openModal(`⚙️ Prazo — ${building.name}`, wrap);

  wrap.querySelectorAll('.preset-day').forEach((btn) => {
    btn.onclick = () => {
      document.getElementById('customDecayInput').value = btn.dataset.d;
    };
  });
  document.getElementById('btnSaveDecay').onclick = () => {
    const val = parseInt(document.getElementById('customDecayInput').value, 10);
    if (!val || val < 1) return alert('Informe um número válido de dias.');
    building.decayDays = val;
    persistState();
    closeModal();
  };
}

function openReceptionModal() {
  const b = getCurrentBuilding();
  if (!b) return;
  const cond = getBuildingCondition(b, state.decayThresholdDays);
  const condText = cond === 'new' ? 'Novo (em dia)' : cond === 'worn' ? 'Meio desgastado' : 'Velho (precisa revisar!)';
  const condClass = cond === 'new' ? 'status-new' : cond === 'worn' ? 'status-worn' : 'status-old';

  const wrap = document.createElement('div');
  wrap.className = 'card-box';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <div>
        <strong>Recepção — ${escapeHtml(b.name)}</strong><br/>
        <small style="color:var(--muted)">Quadro de Índice dos Andares na Parede</small>
      </div>
      <span class="status-pill ${condClass}">${condText}</span>
    </div>
  `;

  if (b.floors.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum andar criado ainda. Adicione o 1º andar abaixo.';
    wrap.appendChild(empty);
  } else {
    b.floors.forEach((f) => {
      const fBox = document.createElement('div');
      fBox.className = 'card-box';
      fBox.innerHTML = `<strong>${escapeHtml(f.name)}</strong>`;
      f.apartments.forEach((ap) => {
        const apRow = document.createElement('div');
        apRow.style.marginTop = '6px';
        apRow.innerHTML = `<div style="font-size:13px;color:var(--accent);margin-bottom:4px;">🚪 Apartamento: <strong>${escapeHtml(ap.name)}</strong></div>`;
        const btnWrap = document.createElement('div');
        btnWrap.className = 'row-actions';
        ap.rooms.forEach((rm) => {
          const btn = document.createElement('button');
          btn.className = rm.isBibliography ? 'btn-secondary' : 'btn-primary';
          btn.textContent = rm.isBibliography ? `📚 ${rm.name}` : `${rm.name} (${rm.objects.length})`;
          btn.onclick = () => {
            closeModal();
            enterRoom(b.id, f.id, ap.id, rm.id);
          };
          btnWrap.appendChild(btn);
        });
        const addRoomBtn = document.createElement('button');
        addRoomBtn.className = 'btn-secondary';
        addRoomBtn.textContent = '+ Cômodo/Quarto';
        addRoomBtn.onclick = () => {
          const name = prompt('Nome do novo cômodo/quarto (ex: Complicações, Quarto da Aguda):');
          if (!name) return;
          ap.rooms.push({ id: uid('r'), name: name.trim(), theme: 'clinic', objects: [] });
          persistState();
          openReceptionModal();
        };
        btnWrap.appendChild(addRoomBtn);
        apRow.appendChild(btnWrap);
        fBox.appendChild(apRow);
      });

      const addApBtn = document.createElement('button');
      addApBtn.className = 'btn-secondary';
      addApBtn.textContent = '+ Novo Apartamento (Doença)';
      addApBtn.onclick = () => {
        const name = prompt('Nome da doença / apartamento (ex: Asma, DPOC):');
        if (!name) return;
        f.apartments.push({
          id: uid('a'),
          name: name.trim(),
          rooms: DEFAULT_CLINICAL_ROOMS.map((rn) => ({
            id: uid('r'),
            name: rn,
            theme: rn === 'Bibliografia' ? 'library' : 'clinic',
            isBibliography: rn === 'Bibliografia',
            pdfs: rn === 'Bibliografia' ? [] : undefined,
            objects: []
          }))
        });
        persistState();
        openReceptionModal();
      };
      fBox.appendChild(addApBtn);
      wrap.appendChild(fBox);
    });
  }

  const actions = document.createElement('div');
  actions.className = 'row-actions';
  const addFloorBtn = document.createElement('button');
  addFloorBtn.className = 'btn-primary';
  addFloorBtn.textContent = '+ Adicionar Andar';
  addFloorBtn.onclick = () => {
    const name = prompt(`Nome do novo andar em ${b.name} (ex: 3º Andar — Arritmias):`);
    if (!name) return;
    b.floors.push({ id: uid('f'), name: name.trim(), apartments: [] });
    persistState();
    openReceptionModal();
  };
  actions.appendChild(addFloorBtn);
  wrap.appendChild(actions);

  openModal(`🏥 Recepção: ${b.name}`, wrap);
}

function enterRoom(buildingId, floorId, apartmentId, roomId) {
  resetInnerCam();
  view = { mode: 'room', buildingId, floorId, apartmentId, roomId };
  editMode = false;
  movingObjectId = null;
  hoveredRoomTile = null;
  updateTopbar();
  pushMyPresenceNow(true);

  const room = getCurrentRoom();
  if (room && room.isBibliography) {
    openBibliographyModal(room);
  }
}

function openBibliographyModal(room) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p style="color:var(--muted)">Guarde aqui os PDFs de referência deste assunto (por link do Google Drive ou subindo o arquivo).</p>`;

  const list = document.createElement('div');
  list.className = 'card-box';
  if (!room.pdfs || room.pdfs.length === 0) {
    list.innerHTML = '<small style="color:var(--muted)">Nenhum PDF adicionado ainda.</small>';
  } else {
    room.pdfs.forEach((p) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.innerHTML = `<span>📄 <strong>${escapeHtml(p.name)}</strong></span>`;
      const openBtn = document.createElement('button');
      openBtn.className = 'btn-primary';
      openBtn.textContent = 'Abrir PDF';
      openBtn.onclick = () => openPdfViewer({
        title: p.name,
        url: p.url,
        localPdfId: p.sourceType === 'local' ? p.id : null
      });
      row.appendChild(openBtn);
      list.appendChild(row);
    });
  }
  wrap.appendChild(list);

  const linkBox = document.createElement('div');
  linkBox.className = 'card-box';
  linkBox.innerHTML = `
    <strong>Adicionar por Link (Google Drive / URL)</strong>
    <div class="field"><label>Nome do material</label><input id="bibName" placeholder="Ex: Diretriz Pneumonia 2026" /></div>
    <div class="field"><label>Link do PDF</label><input id="bibUrl" placeholder="https://drive.google.com/..." /></div>
    <button id="bibAddLink" class="btn-primary">Salvar Link</button>
  `;
  wrap.appendChild(linkBox);

  const upBox = document.createElement('div');
  upBox.className = 'card-box';
  upBox.innerHTML = `
    <strong>Subir Arquivo PDF do dispositivo</strong>
    <input id="bibFile" type="file" accept="application/pdf" />
  `;
  wrap.appendChild(upBox);

  openModal(`📚 Bibliografia — ${room.name}`, wrap);

  document.getElementById('bibAddLink').onclick = () => {
    const name = document.getElementById('bibName').value.trim();
    const url = document.getElementById('bibUrl').value.trim();
    if (!name || !url) return alert('Preencha nome e link.');
    room.pdfs = room.pdfs || [];
    room.pdfs.push({ id: uid('pdf'), name, sourceType: 'link', url });
    persistState();
    openBibliographyModal(room);
  };

  document.getElementById('bibFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const id = uid('pdf');
    await saveLocalPdf(id, file);
    room.pdfs = room.pdfs || [];
    room.pdfs.push({ id, name: file.name, sourceType: 'local', url: '' });
    persistState();
    openBibliographyModal(room);
  };
}

async function openPdfViewer({ title, url = '', page = 1, quote = '', localPdfId = null }) {
  const el = await buildPdfViewerElement({ title, url, page, quote, localPdfId });
  openModal(`📄 ${title || 'PDF'}`, el);
}

function openObjectModal(obj, room) {
  const cat = OBJECT_CATALOG.find((c) => c.id === obj.type);
  const wrap = document.createElement('div');

  if (!editMode) {
    wrap.innerHTML = `
      <div class="obj-modal-hero">
        <img src="${cat?.thumb || '/assets/book.jpg'}" alt="${escapeHtml(cat?.name || '')}" />
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(cat?.name || 'Objeto')}</div>
          <h3 style="color:var(--accent);font-size:17px;margin-top:2px;">${escapeHtml(obj.title || 'Sem título')}</h3>
        </div>
      </div>
      <div class="card-box">
        <p>${escapeHtml(obj.summary || 'Sem resumo cadastrado.')}</p>
        <div style="border-top:1px solid var(--border-soft);padding-top:8px;margin-top:4px;">
          <small style="color:var(--muted)">Referência no PDF:</small><br/>
          <strong>${escapeHtml(obj.pdfLabel || 'Sem referência')}</strong>
        </div>
      </div>
      <div class="row-actions">
        <button id="btnOpenRef" class="btn-primary">📄 Abrir no PDF</button>
        ${sharedRole !== 'viewer' ? '<button id="btnEditObj" class="btn-secondary">✏️ Editar Objeto</button>' : ''}
      </div>
    `;
    openModal(`${cat?.icon || '📦'} Revisão do Objeto`, wrap);

    document.getElementById('btnOpenRef').onclick = () => {
      const ap = getCurrentApartment();
      const bibRoom = ap?.rooms.find((r) => r.isBibliography);
      const linkedBib = bibRoom?.pdfs?.find((p) => p.id === obj.bibPdfId);
      openPdfViewer({
        title: obj.pdfLabel || obj.title,
        url: linkedBib?.url || obj.pdfUrl || '',
        page: obj.pdfPage || 1,
        quote: obj.pdfQuote || '',
        localPdfId: linkedBib?.sourceType === 'local' ? linkedBib.id : null
      });
    };
    const editBtn = document.getElementById('btnEditObj');
    if (editBtn) {
      editBtn.onclick = () => {
        setEditMode(true);
        openObjectModal(obj, room);
      };
    }
  } else {
    const ap = getCurrentApartment();
    const bibPdfs = ap?.rooms.find((r) => r.isBibliography)?.pdfs || [];
    const bibOptions = bibPdfs
      .map((p) => `<option value="${p.id}" ${obj.bibPdfId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
      .join('');
    const typeOptions = OBJECT_CATALOG
      .map((c) => `<option value="${c.id}" ${obj.type === c.id ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>`)
      .join('');

    wrap.innerHTML = `
      <div class="obj-modal-hero">
        <img id="editObjPreviewImg" src="${cat?.thumb || '/assets/book.jpg'}" alt="" />
        <div class="field" style="flex:1;">
          <label>Modelo visual do móvel</label>
          <select id="objType">${typeOptions}</select>
        </div>
      </div>

      <div class="card-box">
        <div class="editor-section-label" style="margin-bottom:2px;">Conteúdo de Estudo</div>
        <div class="field"><label>Título</label><input id="objTitle" value="${escapeHtml(obj.title || '')}" placeholder="Ex: Radiografia de Tórax" /></div>
        <div class="field"><label>Resuminho</label><textarea id="objSummary" rows="3" placeholder="Pontos-chave para lembrar na revisão...">${escapeHtml(obj.summary || '')}</textarea></div>
      </div>

      <div class="card-box">
        <div class="editor-section-label" style="margin-bottom:2px;">Referência & PDF</div>
        <div class="field"><label>Nome da referência (ex: Diretriz AVC — Pág. 7)</label><input id="objPdfLabel" value="${escapeHtml(obj.pdfLabel || '')}" /></div>
        ${bibPdfs.length ? `<div class="field"><label>PDF da Bibliografia deste assunto</label><select id="objBibPdf"><option value="">(Nenhum / usar link abaixo)</option>${bibOptions}</select></div>` : ''}
        <div class="field"><label>Link do PDF (Google Drive ou URL)</label><input id="objPdfUrl" value="${escapeHtml(obj.pdfUrl || '')}" placeholder="https://drive.google.com/..." /></div>
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1;"><label>Página exata</label><input id="objPdfPage" type="number" min="1" value="${obj.pdfPage || 1}" /></div>
          <div class="field" style="flex:2;"><label>Trecho para destacar</label><input id="objPdfQuote" value="${escapeHtml(obj.pdfQuote || '')}" placeholder="Ex: trombólise" /></div>
        </div>
      </div>

      <div class="row-actions" style="justify-content:space-between;">
        <div class="row-actions">
          <button id="btnSaveObj" class="btn-success">💾 Salvar</button>
          <button id="btnMoveThisObj" class="btn-secondary">✋ Mover de lugar</button>
        </div>
        <button id="btnDelObj" class="btn-danger">🗑️ Remover</button>
      </div>
    `;
    openModal(`✏️ Editar Objeto`, wrap);

    const typeSel = document.getElementById('objType');
    const previewImg = document.getElementById('editObjPreviewImg');
    typeSel.onchange = () => {
      const nextCat = OBJECT_CATALOG.find((c) => c.id === typeSel.value);
      if (nextCat) previewImg.src = nextCat.thumb;
    };

    document.getElementById('btnSaveObj').onclick = () => {
      obj.type = typeSel.value;
      obj.title = document.getElementById('objTitle').value.trim();
      obj.summary = document.getElementById('objSummary').value.trim();
      obj.pdfLabel = document.getElementById('objPdfLabel').value.trim();
      obj.bibPdfId = document.getElementById('objBibPdf')?.value || '';
      obj.pdfUrl = document.getElementById('objPdfUrl').value.trim();
      obj.pdfPage = Math.max(1, parseInt(document.getElementById('objPdfPage').value, 10) || 1);
      obj.pdfQuote = document.getElementById('objPdfQuote').value.trim();
      persistState();
      refreshEditorPanel();
      closeModal();
    };
    document.getElementById('btnMoveThisObj').onclick = () => {
      closeModal();
      setEditorTab('move');
      movingObjectId = obj.id;
      refreshEditorPanel();
      updateEditorBanner();
    };
    document.getElementById('btnDelObj').onclick = () => {
      room.objects = room.objects.filter((o) => o.id !== obj.id);
      if (movingObjectId === obj.id) movingObjectId = null;
      persistState();
      refreshEditorPanel();
      closeModal();
    };
  }
}

function openNewBuildingModal() {
  const usedLots = new Set(state.buildings.map((b) => b.lotId));
  const freeLots = CITY_LOTS.filter((l) => !usedLots.has(l.id));

  if (freeLots.length === 0) {
    return openModal('Novo Prédio', '<p>Todos os lotes deste bairro já estão ocupados!</p>');
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="field"><label>Especialidade / Matéria</label><input id="newBName" placeholder="Ex: Ginecologia, Pediatria" /></div>
    <div class="field">
      <label>Lote na Cidade</label>
      <select id="newBLot">${freeLots.map((l) => `<option value="${l.id}">${l.label}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Cor do Telhado</label>
      <input id="newBColor" type="color" value="#10b981" style="height:38px;" />
    </div>
    <button id="btnCreateB" class="btn-primary">Construir Prédio com Recepção</button>
  `;
  openModal('🏗️ Novo Prédio de Estudo', wrap);

  document.getElementById('btnCreateB').onclick = () => {
    const name = document.getElementById('newBName').value.trim();
    if (!name) return alert('Digite o nome da especialidade.');
    const lotId = document.getElementById('newBLot').value;
    const color = document.getElementById('newBColor').value;
    state.buildings.push({
      id: uid('b'),
      name,
      lotId,
      color,
      lastReviewedAt: new Date().toISOString(),
      floors: []
    });
    persistState();
    closeModal();
  };
}

// ---------------- GEOMETRIA ISOMÉTRICA ----------------
function isoToScreen(gx, gy, originX, originY, tileW, tileH) {
  return {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2)
  };
}

function drawRoomBackdrop(themeId) {
  const theme = getRoomTheme(themeId);
  const grad = ctx.createRadialGradient(
    canvasCssW * 0.5, canvasCssH * 0.42, 40,
    canvasCssW * 0.5, canvasCssH * 0.5, Math.max(canvasCssW, canvasCssH) * 0.78
  );
  grad.addColorStop(0, theme.bgTop);
  grad.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasCssW, canvasCssH);
}

// ---------------- RENDERIZAÇÃO DA RECEPÇÃO (ISOMÉTRICO 2.5D ILUSTRADO) ----------------
function renderReception(now) {
  const b = getCurrentBuilding();
  drawRoomBackdrop('clinic');
  if (!b) return;

  ctx.save();
  ctx.translate(canvasCssW / 2 + innerCam.x, canvasCssH / 2 + innerCam.y);
  ctx.scale(innerCam.zoom, innerCam.zoom);
  ctx.translate(-canvasCssW / 2, -canvasCssH / 2);

  const cols = 7;
  const rows = 5;
  const tileW = Math.min(
    Math.floor((canvasCssW - 36) / (cols + rows) * 2.05),
    Math.floor((canvasCssH - 110) / (cols + rows) * 3.5),
    108
  );
  const tileH = Math.floor(tileW / 2);
  const originX = Math.floor(canvasCssW / 2) - Math.floor((cols - rows) * (tileW / 4));
  const originY = Math.floor((canvasCssH - 20) / 2) - Math.floor((cols + rows) * (tileH / 4)) + 44;

  drawIllustratedRoomShell(ctx, {
    originX, originY, tileW, tileH, cols, rows,
    themeId: 'clinic', isNight: state.isNight, editMode: false
  });

  // Balcão isométrico da Recepção + Atendente
  const deskPos = isoToScreen(4.6, 1.4, originX, originY, tileW, tileH);
  const avScale = Math.max(1.05, tileW / 66);
  drawAvatar(ctx, deskPos.x + 8, deskPos.y - 22, '#f8fafc', 'Recepção', '', avScale);
  drawIsoBox(ctx, deskPos.x, deskPos.y, tileW * 1.45, tileH * 0.85, Math.floor(tileW * 0.34), '#d8a978', '#b98858', '#996b42', '#2b2520');

  // Quadro de Índice em destaque no topo esquerdo (clicável!)
  const p0 = isoToScreen(0, 0, originX, originY, tileW, tileH);
  const wallH = Math.floor(tileW * 1.32);
  const boardW = Math.min(280, Math.floor(canvasCssW * 0.62));
  const boardH = 96;
  const boardX = Math.max(16, Math.floor(p0.x - boardW - 18));
  const boardY = Math.max(14, Math.floor(p0.y - wallH + 6));
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`📋 ÍNDICE — ${b.name.toUpperCase()}`, boardX + 10, boardY + 19);

  const cond = getBuildingCondition(b, state.decayThresholdDays);
  const statusColor = cond === 'new' ? '#22c55e' : cond === 'worn' ? '#f59e0b' : '#ef4444';
  if (b.floors.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Clique para criar o 1º andar...', boardX + 10, boardY + 44);
  } else {
    b.floors.slice(0, 4).forEach((f, idx) => {
      const ly = boardY + 38 + idx * 15;
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(boardX + 14, ly - 3.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(f.name.slice(0, 32), boardX + 24, ly);
    });
  }
  canvas._receptionBoard = { x: boardX, y: boardY, w: boardW, h: boardH };

  // Seu avatar e colegas conectados nesta mesma recepção
  const mePt = isoToScreen(2.7, 3.4, originX, originY, tileW, tileH);
  drawAvatar(ctx, mePt.x, mePt.y, myAvatar.color, myAvatar.name, myEmote, avScale);

  canvas._receptionPeers = [];
  let peerIdx = 0;
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId || peer.mode !== 'reception' || peer.buildingId !== b.id) return;
    const px = 3.8 + (peerIdx % 3) * 0.9;
    const py = 3.1 + Math.floor(peerIdx / 3) * 0.85;
    peerIdx++;
    const pt = isoToScreen(px, py, originX, originY, tileW, tileH);
    drawAvatar(ctx, pt.x, pt.y, peer.color || '#f43f5e', peer.name || 'Amigo', peer.emote || '', avScale, true);
    canvas._receptionPeers.push({ peer, x: pt.x, y: pt.y });
  });

  // Visitantes ambiente na recepção
  const t = now * 0.001;
  const v1 = isoToScreen(1.5 + Math.sin(t * 0.7) * 0.6, 2.8, originX, originY, tileW, tileH);
  drawAvatar(ctx, v1.x, v1.y, '#a855f7', '', '', avScale * 0.92);
  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DA CIDADE ----------------
function renderCity() {
  ctx.save();
  ctx.fillStyle = state.isNight ? '#0b1120' : '#0284c7';
  ctx.fillRect(0, 0, canvasCssW, canvasCssH);

  ctx.translate(canvasCssW / 2, canvasCssH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // Grama base do condado
  ctx.fillStyle = state.isNight ? '#1e3a2f' : '#8ab17d';
  ctx.fillRect(0, 2 * TILE, WORLD_W, 12 * TILE);

  // Montanhas no limite norte
  for (let i = 0; i < 24; i++) {
    const mx = i * TILE;
    ctx.fillStyle = state.isNight ? '#1e293b' : '#64748b';
    ctx.beginPath();
    ctx.moveTo(mx, 2 * TILE);
    ctx.lineTo(mx + TILE / 2, 0.3 * TILE + (i % 2) * 14);
    ctx.lineTo(mx + TILE, 2 * TILE);
    ctx.fill();
    ctx.fillStyle = state.isNight ? '#94a3b8' : '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(mx + TILE * 0.3, 0.9 * TILE);
    ctx.lineTo(mx + TILE / 2, 0.3 * TILE + (i % 2) * 14);
    ctx.lineTo(mx + TILE * 0.7, 0.9 * TILE);
    ctx.fill();
  }

  // Mar no limite sul
  ctx.fillStyle = state.isNight ? '#0c4a6e' : '#0284c7';
  ctx.fillRect(0, 14 * TILE, WORLD_W, 2 * TILE);
  ctx.fillStyle = '#bae6fd';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(i * 96 + 12, 14.4 * TILE, 28, 3);
  }

  // Estradinhas
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 8 * TILE, WORLD_W, TILE);
  ctx.fillRect(14 * TILE, 2 * TILE, TILE, 12 * TILE);

  // Faixas de pedestre
  ctx.fillStyle = '#f8fafc';
  for (let s = 0; s < 4; s++) {
    ctx.fillRect(13.6 * TILE, 8 * TILE + 6 + s * 10, 12, 5);
    ctx.fillRect(15.1 * TILE, 8 * TILE + 6 + s * 10, 12, 5);
  }

  // Semáforo
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(13.7 * TILE, 7.4 * TILE, 10, 20);
  ctx.fillStyle = trafficLightGreen ? '#22c55e' : '#ef4444';
  ctx.fillRect(13.7 * TILE + 2, 7.4 * TILE + 3, 6, 6);

  // Praça Central
  ctx.fillStyle = state.isNight ? '#1e3a2f' : '#86efac';
  ctx.fillRect(10 * TILE, 9.2 * TILE, 3.8 * TILE, 3 * TILE);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(11.4 * TILE, 10 * TILE, 1.8 * TILE, 1.3 * TILE);
  ducks.forEach((d) => {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(d.x, d.y + Math.sin(d.angle) * 3, 6, 4);
  });
  ctx.fillStyle = '#92400e';
  ctx.fillRect(10.3 * TILE, 9.6 * TILE, 20, 6);
  ctx.fillRect(10.3 * TILE, 11.4 * TILE, 20, 6);

  // Casinhas decorativas
  drawHouse(ctx, 2 * TILE, 10 * TILE, '#f97316', state.isNight);
  drawHouse(ctx, 7 * TILE, 10.5 * TILE, '#ec4899', state.isNight);
  drawHouse(ctx, 20 * TILE, 10 * TILE, '#14b8a6', state.isNight);

  // Marcos do Prefeito
  const rondas = state.rondasConcluidas || 0;
  if (rondas >= 1) drawMuseum(ctx, 16 * TILE, 10.2 * TILE, state.isNight);
  if (rondas >= 3) {
    drawHouse(ctx, 21 * TILE, 4.5 * TILE, '#6366f1', state.isNight);
    drawHouse(ctx, 8 * TILE, 12.2 * TILE, '#84cc16', state.isNight);
  }
  if (rondas >= 5) drawAvatar(ctx, 11.2 * TILE, 10.6 * TILE, '#0ea5e9', 'Pescador');

  // Árvores
  const allOld = state.buildings.every((b) => getBuildingCondition(b, state.decayThresholdDays) === 'old');
  [[1.5, 4], [8.5, 5], [16.5, 5], [10.2, 11.8], [21.5, 6]].forEach(([gx, gy]) => {
    drawTree(ctx, gx * TILE, gy * TILE, allOld);
  });

  // Lotes vazios
  CITY_LOTS.forEach((lot) => {
    const occupied = state.buildings.some((b) => b.lotId === lot.id);
    if (!occupied) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(lot.gx * TILE, lot.gy * TILE, 84, 74);
      ctx.setLineDash([]);
    }
  });

  // Prédios clicáveis
  state.buildings.forEach((b) => {
    const lot = CITY_LOTS.find((l) => l.id === b.lotId);
    if (!lot) return;
    const cond = getBuildingCondition(b, state.decayThresholdDays);
    drawPixelBuilding(ctx, lot.gx * TILE, lot.gy * TILE, 84, 74, b.color, cond, state.isNight, b.name);
  });

  // Carros e Pedestres
  cars.forEach((c) => drawCar(ctx, c.x, c.y, c.color, !c.vertical));
  pedestrians.forEach((p) => drawAvatar(ctx, p.x, p.y, p.shirt, ''));

  // Amigos conectados na cidade (com posição interpolada)
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId) return;
    if (!peer.mode || peer.mode === 'city') {
      const sp = peerSmoothPos.get(peer.id);
      const px = sp ? sp.x : (peer.x || 12 * TILE);
      const py = sp ? sp.y : (peer.y || 9.5 * TILE);
      drawAvatar(ctx, px, py, peer.color || '#f43f5e', peer.name || 'Amigo', peer.emote || '', 1.05, true);
    }
  });

  // Avatar do jogador
  drawAvatar(ctx, player.x, player.y, myAvatar.color, myAvatar.name, myEmote, 1.05);

  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DO CÔMODO (ISOMÉTRICO 2.5D ILUSTRADO & MAIOR) ----------------
function renderRoom() {
  const room = getCurrentRoom();
  drawRoomBackdrop(room?.theme || 'clinic');
  if (!room) return;

  ctx.save();
  ctx.translate(canvasCssW / 2 + innerCam.x, canvasCssH / 2 + innerCam.y);
  ctx.scale(innerCam.zoom, innerCam.zoom);
  ctx.translate(-canvasCssW / 2, -canvasCssH / 2);

  const cols = 7;
  const rows = 6;

  // Quando o Estúdio de Edição está aberto no desktop, desloca o centro um pouco à esquerda
  const editorDesktopOffset = editMode && canvasCssW > 780 ? 148 : 0;
  const availW = Math.max(300, canvasCssW - editorDesktopOffset * 2 - 24);
  const availH = Math.max(240, canvasCssH - (editMode && canvasCssW <= 780 ? 220 : 88));

  // Escala bem mais generosa para enxergar todos os detalhes dos móveis ilustrados!
  const tileW = Math.max(
    64,
    Math.min(
      Math.floor((availW / (cols + rows)) * 2.15),
      Math.floor((availH / (cols + rows)) * 3.75),
      124
    )
  );
  const tileH = Math.floor(tileW / 2);
  const centerX = Math.floor((canvasCssW - editorDesktopOffset * 2) / 2);
  const originX = centerX - Math.floor((cols - rows) * (tileW / 4));
  const originY = Math.floor(availH / 2) - Math.floor((cols + rows) * (tileH / 4)) + Math.floor(tileW * 0.56);

  const movingObj = movingObjectId ? room.objects.find((o) => o.id === movingObjectId) : null;

  drawIllustratedRoomShell(ctx, {
    originX,
    originY,
    tileW,
    tileH,
    cols,
    rows,
    themeId: room.theme || 'clinic',
    isNight: state.isNight,
    editMode,
    hoverTile: editMode ? hoveredRoomTile : null,
    selectedMoveTile: movingObj ? { gx: movingObj.gx, gy: movingObj.gy } : null
  });

  // Objetos, fantasma de posicionamento e avatares ordenados por profundidade (gx + gy)
  const renderables = room.objects.map((obj) => ({
    kind: 'object',
    depth: obj.gx + obj.gy,
    gx: obj.gx + 0.5,
    gy: obj.gy + 0.5,
    obj,
    highlighted: movingObjectId === obj.id || (editMode && hoveredRoomTile && hoveredRoomTile.gx === obj.gx && hoveredRoomTile.gy === obj.gy)
  }));

  // Pré-visualização translúcida no ladrilho vazio sob o cursor no Modo Edição
  if (editMode && hoveredRoomTile && !hoveredRoomTile.occupied) {
    const ghostType =
      editorTab === 'add'
        ? selectedPaletteType
        : editorTab === 'move' && movingObj
          ? movingObj.type
          : null;
    if (ghostType) {
      renderables.push({
        kind: 'ghost',
        depth: hoveredRoomTile.gx + hoveredRoomTile.gy,
        gx: hoveredRoomTile.gx + 0.5,
        gy: hoveredRoomTile.gy + 0.5,
        type: ghostType
      });
    }
  }

  const avScale = Math.max(1.12, tileW / 66);

  renderables.push({
    kind: 'avatar',
    depth: roomPlayer.gx + roomPlayer.gy,
    gx: roomPlayer.gx,
    gy: roomPlayer.gy,
    color: myAvatar.color,
    name: myAvatar.name,
    emote: myEmote,
    isPeer: false
  });

  remotePeers.forEach((peer) => {
    if (peer.id !== myPeerId && peer.mode === 'room' && peer.roomId === room.id) {
      const sp = peerSmoothPos.get(peer.id);
      const pgx = sp && typeof sp.rgx === 'number' ? sp.rgx : (typeof peer.rgx === 'number' ? peer.rgx : 3.5);
      const pgy = sp && typeof sp.rgy === 'number' ? sp.rgy : (typeof peer.rgy === 'number' ? peer.rgy : 4.5);
      renderables.push({
        kind: 'avatar',
        depth: pgx + pgy,
        gx: pgx,
        gy: pgy,
        color: peer.color || '#f43f5e',
        name: peer.name || 'Amigo',
        emote: peer.emote || '',
        isPeer: true
      });
    }
  });

  renderables.sort((a, b) => a.depth - b.depth);
  renderables.forEach((item) => {
    const pt = isoToScreen(item.gx, item.gy, originX, originY, tileW, tileH);
    if (item.kind === 'object') {
      drawRoomObject(ctx, item.obj.type, pt.x, pt.y, tileW, {
        editMode,
        highlighted: item.highlighted,
        alpha: movingObjectId === item.obj.id ? 0.65 : 1
      });
    } else if (item.kind === 'ghost') {
      drawRoomObject(ctx, item.type, pt.x, pt.y, tileW, {
        editMode: false,
        highlighted: true,
        alpha: 0.55
      });
    } else {
      drawAvatar(ctx, pt.x, pt.y, item.color, item.name, item.emote || '', avScale, item.isPeer);
    }
  });

  // Guarda geometria isométrica para clique/hover
  canvas._roomGrid = { originX, originY, tileW, tileH, cols, rows };
  ctx.restore();
}

function screenToRoomTile(clientX, clientY) {
  if (!canvas._roomGrid) return null;
  const { originX, originY, tileW, tileH, cols, rows } = canvas._roomGrid;
  const rect = canvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const ix = (cx - (canvasCssW / 2 + innerCam.x)) / innerCam.zoom + canvasCssW / 2;
  const iy = (cy - (canvasCssH / 2 + innerCam.y)) / innerCam.zoom + canvasCssH / 2;
  const dx = (ix - originX) / (tileW / 2);
  const dy = (iy - originY) / (tileH / 2);
  const gx = Math.floor((dx + dy) / 2);
  const gy = Math.floor((dy - dx) / 2);
  if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return null;
  return { gx, gy, ix, iy };
}

// ---------------- LOOP PRINCIPAL ----------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Aplica escala DPR limpa no início de cada frame
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Interpolação suave das posições dos colegas conectados
  const lerpAlpha = Math.min(1, dt * 10);
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId) return;
    const tx = typeof peer.x === 'number' ? peer.x : 12 * TILE;
    const ty = typeof peer.y === 'number' ? peer.y : 9.5 * TILE;
    const trgx = typeof peer.rgx === 'number' ? peer.rgx : 3.5;
    const trgy = typeof peer.rgy === 'number' ? peer.rgy : 4.5;
    const cur = peerSmoothPos.get(peer.id);
    if (!cur) {
      peerSmoothPos.set(peer.id, { x: tx, y: ty, rgx: trgx, rgy: trgy });
    } else {
      cur.x += (tx - cur.x) * lerpAlpha;
      cur.y += (ty - cur.y) * lerpAlpha;
      cur.rgx += (trgx - cur.rgx) * lerpAlpha;
      cur.rgy += (trgy - cur.rgy) * lerpAlpha;
    }
  });

  // Ignora teclas de movimento se o usuário estiver digitando em algum campo
  const typing =
    document.activeElement &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

  if (view.mode === 'city') {
    trafficTimer += dt;
    if (trafficTimer > 5) {
      trafficLightGreen = !trafficLightGreen;
      trafficTimer = 0;
    }

    cars.forEach((c) => {
      if (c.vertical) {
        if (!trafficLightGreen && c.y > 6.8 * TILE && c.y < 7.8 * TILE) return;
        c.y += c.vy * dt;
        if (c.y > 14 * TILE) c.y = 2 * TILE;
      } else {
        if (trafficLightGreen && c.x > 12.6 * TILE && c.x < 13.5 * TILE && c.vx > 0) return;
        c.x += c.vx * dt;
        if (c.x > WORLD_W) c.x = -30;
        if (c.x < -30) c.x = WORLD_W;
      }
    });

    pedestrians.forEach((p) => {
      if (!p.vx) return;
      p.x += p.vx * dt;
      if (p.x > p.maxX || p.x < p.minX) p.vx *= -1;
    });
    ducks.forEach((d) => {
      d.angle += dt * 2.5;
    });

    let dx = 0;
    let dy = 0;
    if (!typing) {
      if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    }

    if (dx !== 0 || dy !== 0) {
      player.targetX = null;
      player.targetY = null;
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * player.speed * dt;
      player.y += (dy / len) * player.speed * dt;
    } else if (player.targetX !== null) {
      const dist = Math.hypot(player.targetX - player.x, player.targetY - player.y);
      if (dist < 4) {
        player.targetX = null;
      } else {
        player.x += ((player.targetX - player.x) / dist) * player.speed * dt;
        player.y += ((player.targetY - player.y) / dist) * player.speed * dt;
      }
    }
    player.x = Math.max(TILE * 0.5, Math.min(WORLD_W - TILE * 0.5, player.x));
    player.y = Math.max(TILE * 2.2, Math.min(13.8 * TILE, player.y));

    if (presenceConn && now - lastPresenceSent > 110) {
      lastPresenceSent = now;
      pushMyPresenceNow(false);
    }

    renderCity();
  } else if (view.mode === 'reception') {
    if (presenceConn && now - lastPresenceSent > 450) {
      lastPresenceSent = now;
      pushMyPresenceNow(false);
    }
    renderReception(now);
  } else {
    let rdx = 0;
    let rdy = 0;
    if (!typing && !editMode) {
      if (keys['ArrowUp'] || keys['w'] || keys['W']) { rdx -= 1; rdy -= 1; }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) { rdx += 1; rdy += 1; }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) { rdx -= 1; rdy += 1; }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) { rdx += 1; rdy -= 1; }
    }

    if (rdx !== 0 || rdy !== 0) {
      roomPlayer.targetGx = null;
      roomPlayer.targetGy = null;
      const len = Math.hypot(rdx, rdy);
      roomPlayer.gx += (rdx / len) * roomPlayer.speed * dt;
      roomPlayer.gy += (rdy / len) * roomPlayer.speed * dt;
    } else if (roomPlayer.targetGx !== null) {
      const dist = Math.hypot(roomPlayer.targetGx - roomPlayer.gx, roomPlayer.targetGy - roomPlayer.gy);
      if (dist < 0.08) {
        roomPlayer.targetGx = null;
        roomPlayer.targetGy = null;
      } else {
        roomPlayer.gx += ((roomPlayer.targetGx - roomPlayer.gx) / dist) * roomPlayer.speed * dt;
        roomPlayer.gy += ((roomPlayer.targetGy - roomPlayer.gy) / dist) * roomPlayer.speed * dt;
      }
    }
    roomPlayer.gx = Math.max(0.4, Math.min(6.6, roomPlayer.gx));
    roomPlayer.gy = Math.max(0.4, Math.min(5.6, roomPlayer.gy));

    if (presenceConn && now - lastPresenceSent > 120) {
      lastPresenceSent = now;
      pushMyPresenceNow(false);
    }

    renderRoom();
  }

  requestAnimationFrame(loop);
}

// ---------------- EVENTOS ----------------
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  if (view.mode === 'city') {
    cam.zoom *= factor;
    clampCamera();
  } else {
    innerCam.zoom *= factor;
    clampInnerCam();
  }
}, { passive: false });

const activePointers = new Map();
let pinchStartDist = null;
let pinchStartZoom = 1;

canvas.addEventListener('pointerdown', (e) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchStartZoom = view.mode === 'city' ? cam.zoom : innerCam.zoom;
    cam.dragging = false;
    cam.moved = true;
    return;
  }
  cam.dragging = true;
  cam.moved = false;
  cam.lastX = e.clientX;
  cam.lastY = e.clientY;
});

canvas.addEventListener('pointermove', (e) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (activePointers.size === 2 && pinchStartDist) {
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (view.mode === 'city') {
      cam.zoom = pinchStartZoom * (dist / pinchStartDist);
      clampCamera();
    } else {
      innerCam.zoom = pinchStartZoom * (dist / pinchStartDist);
      clampInnerCam();
    }
    return;
  }

  // Hover preview no Modo Edição do Quarto (desktop/mouse)
  if (!cam.dragging && view.mode === 'room' && editMode) {
    const hit = screenToRoomTile(e.clientX, e.clientY);
    const room = getCurrentRoom();
    if (hit && room) {
      const occupied = room.objects.some((o) => o.gx === hit.gx && o.gy === hit.gy);
      hoveredRoomTile = { gx: hit.gx, gy: hit.gy, occupied };
    } else {
      hoveredRoomTile = null;
    }
    return;
  }

  if (!cam.dragging) return;
  const dx = e.clientX - cam.lastX;
  const dy = e.clientY - cam.lastY;
  if (Math.hypot(dx, dy) > 5) cam.moved = true;
  if (view.mode === 'city') {
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    clampCamera();
  } else {
    innerCam.x += dx;
    innerCam.y += dy;
    clampInnerCam();
  }
  cam.lastX = e.clientX;
  cam.lastY = e.clientY;
});

canvas.addEventListener('pointerleave', () => {
  hoveredRoomTile = null;
});

canvas.addEventListener('pointercancel', (e) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinchStartDist = null;
  cam.dragging = false;
});

canvas.addEventListener('pointerup', (e) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinchStartDist = null;
  const wasClick = !cam.moved;
  cam.dragging = false;
  if (!wasClick) return;

  if (view.mode === 'city') {
    const pt = screenToWorld(e.clientX, e.clientY);
    // Clique em algum colega conectado na cidade (área generosa para celular)
    const clickedPeer = remotePeers.find((p) => {
      if (p.id === myPeerId || (p.mode && p.mode !== 'city')) return false;
      const sp = peerSmoothPos.get(p.id);
      const px = sp ? sp.x : (p.x || 0);
      const py = sp ? sp.y : (p.y || 0);
      return Math.hypot(px - pt.x, py - pt.y) < 34;
    });
    if (clickedPeer) {
      openPeerModal(clickedPeer);
      return;
    }
    for (const b of state.buildings) {
      const lot = CITY_LOTS.find((l) => l.id === b.lotId);
      if (!lot) continue;
      const bx = lot.gx * TILE;
      const by = lot.gy * TILE;
      if (pt.x >= bx - 6 && pt.x <= bx + 90 && pt.y >= by - 14 && pt.y <= by + 80) {
        enterBuilding(b.id);
        return;
      }
    }
    player.targetX = pt.x;
    player.targetY = pt.y;
  } else if (view.mode === 'reception') {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const ix = (cx - (canvasCssW / 2 + innerCam.x)) / innerCam.zoom + canvasCssW / 2;
    const iy = (cy - (canvasCssH / 2 + innerCam.y)) / innerCam.zoom + canvasCssH / 2;

    // Verifica clique em algum amigo na recepção
    const clickedRecPeer = (canvas._receptionPeers || []).find(
      (rp) => Math.hypot(rp.x - ix, rp.y - iy) < 34
    );
    if (clickedRecPeer) {
      openPeerModal(clickedRecPeer.peer);
      return;
    }
    openReceptionModal();
  } else if (view.mode === 'room' && canvas._roomGrid) {
    const hit = screenToRoomTile(e.clientX, e.clientY);
    if (!hit) return;
    const { gx, gy } = hit;

    const room = getCurrentRoom();
    if (!room) return;

    // Verifica clique em algum colega no mesmo quarto (fora da aba de adicionar/mover)
    if (!editMode) {
      const clickedRoomPeer = remotePeers.find((p) => {
        if (p.id === myPeerId || p.mode !== 'room' || p.roomId !== room.id) return false;
        const sp = peerSmoothPos.get(p.id);
        const pgx = sp ? sp.rgx : (typeof p.rgx === 'number' ? p.rgx : 3.5);
        const pgy = sp ? sp.rgy : (typeof p.rgy === 'number' ? p.rgy : 4.5);
        return Math.hypot(pgx - (gx + 0.5), pgy - (gy + 0.5)) < 0.95;
      });
      if (clickedRoomPeer) {
        openPeerModal(clickedRoomPeer);
        return;
      }
    }

    const existing = room.objects.find((o) => o.gx === gx && o.gy === gy);

    if (!editMode) {
      if (existing) {
        openObjectModal(existing, room);
      } else {
        roomPlayer.targetGx = gx + 0.5;
        roomPlayer.targetGy = gy + 0.5;
      }
      return;
    }

    // MODO EDIÇÃO: comportamento inteligente por aba
    if (editorTab === 'move') {
      if (existing) {
        movingObjectId = movingObjectId === existing.id ? null : existing.id;
        refreshEditorPanel();
        updateEditorBanner();
      } else if (movingObjectId) {
        const obj = room.objects.find((o) => o.id === movingObjectId);
        if (obj) {
          obj.gx = gx;
          obj.gy = gy;
          movingObjectId = null;
          persistState();
          refreshEditorPanel();
          updateEditorBanner();
          showToast(`✋ "${obj.title || 'Objeto'}" reposicionado!`);
        }
      }
      return;
    }

    if (existing) {
      openObjectModal(existing, room);
    } else if (editorTab === 'add') {
      const cat = OBJECT_CATALOG.find((c) => c.id === selectedPaletteType);
      const newObj = {
        id: uid('obj'),
        type: selectedPaletteType,
        gx,
        gy,
        title: cat ? cat.name : 'Novo Objeto',
        summary: '',
        pdfLabel: '',
        pdfUrl: ''
      };
      room.objects.push(newObj);
      persistState();
      refreshEditorPanel();
      openObjectModal(newObj, room);
    }
  }
});

// Botões HUD, Zoom interno e Topbar
document.getElementById('btnZoomIn').onclick = () => { cam.zoom *= 1.2; clampCamera(); };
document.getElementById('btnZoomOut').onclick = () => { cam.zoom *= 0.83; clampCamera(); };
document.querySelectorAll('.inner-zoom-in').forEach((btn) => {
  btn.onclick = () => { innerCam.zoom *= 1.18; clampInnerCam(); };
});
document.querySelectorAll('.inner-zoom-out').forEach((btn) => {
  btn.onclick = () => { innerCam.zoom *= 0.85; clampInnerCam(); };
});
document.querySelectorAll('.inner-zoom-reset').forEach((btn) => {
  btn.onclick = () => resetInnerCam();
});

document.querySelectorAll('[data-quick-emote]').forEach((btn) => {
  btn.onclick = () => {
    const em = btn.dataset.quickEmote;
    triggerEmote(em);
    if (em.includes('Vem')) {
      remotePeers.forEach((p) => {
        if (p.id !== myPeerId) {
          presenceConn?.broadcast('peer_ping', {
            fromId: myPeerId,
            fromName: myAvatar.name,
            targetId: p.id,
            location: getMyLocationPayload()
          });
        }
      });
      showToast('📣 Chamado enviado para os colegas online!');
    }
  };
});

document.getElementById('btnNewBuilding').onclick = openNewBuildingModal;
document.getElementById('btnOpenIndex').onclick = openReceptionModal;
document.getElementById('btnDecayConfig').onclick = () => {
  const b = getCurrentBuilding();
  if (b) openDecayConfigModal(b);
};
document.getElementById('modalClose').onclick = closeModal;

btnDayNight.onclick = () => {
  state.isNight = !state.isNight;
  persistState();
  updateTopbar();
};

btnMusic.onclick = () => {
  const playing = ambientMusic.toggle();
  btnMusic.textContent = playing ? '🔊' : '🎵';
};

btnBack.onclick = () => {
  if (view.mode === 'room') {
    setEditMode(false);
    view.mode = 'reception';
    updateTopbar();
    pushMyPresenceNow(true);
    openReceptionModal();
  } else {
    goHome();
  }
};

btnRonda.onclick = () => {
  const sorted = [...state.buildings].sort((a, b) => new Date(a.lastReviewedAt) - new Date(b.lastReviewedAt));
  if (sorted.length > 0) enterBuilding(sorted[0].id);
};

btnToggleEdit.onclick = () => setEditMode(true);
btnCloseEdit.onclick = () => setEditMode(false);
btnExitEditTop.onclick = () => setEditMode(false);
btnToggleDrawer.onclick = () => {
  const collapsed = roomEditorPanel.classList.toggle('collapsed');
  btnToggleDrawer.textContent = collapsed ? '▴' : '▾';
};
btnCancelMove.onclick = () => {
  movingObjectId = null;
  refreshEditorPanel();
  updateEditorBanner();
};

document.querySelectorAll('.editor-tab').forEach((btn) => {
  btn.onclick = () => setEditorTab(btn.dataset.editorTab);
});

btnRenameRoom.onclick = () => {
  const room = getCurrentRoom();
  const next = inpRenameRoom.value.trim();
  if (!room || !next) return;
  room.name = next;
  persistState();
  updateTopbar();
  refreshEditorPanel();
  showToast(`✏️ Cômodo renomeado para "${next}"`);
};

btnRoomRonda.onclick = () => {
  const b = getCurrentBuilding();
  if (b) {
    b.lastReviewedAt = new Date().toISOString();
    state.rondasConcluidas = (state.rondasConcluidas || 0) + 1;
    persistState();
    let msg = `🩺 Ronda concluída! "${b.name}" recuperou o vigor.`;
    if (state.rondasConcluidas === 1) msg += ' 🏛️ O Prefeito inaugurou o MUSEU DA MEDICINA!';
    if (state.rondasConcluidas === 3) msg += ' 🏡 O Prefeito inaugurou novas casas na cidade!';
    if (state.rondasConcluidas === 5) msg += ' 🎣 Novo morador pescando na Praça Central!';
    showToast(msg, '', null, 6000);
  }
};

// Catálogo visual com miniaturas ilustradas 2.5D
OBJECT_CATALOG.forEach((item) => {
  const btn = document.createElement('button');
  btn.className = `catalog-card ${item.id === selectedPaletteType ? 'active' : ''}`;
  btn.innerHTML = `
    <div class="catalog-thumb">
      <img src="${item.thumb}" alt="${escapeHtml(item.shortName)}" loading="lazy" />
    </div>
    <span>${escapeHtml(item.shortName)}</span>
  `;
  btn.onclick = () => {
    selectedPaletteType = item.id;
    document.querySelectorAll('.catalog-card').forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    updateEditorBanner();
  };
  objectPaletteEl.appendChild(btn);
});

// Busca rápida global
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    searchResults.classList.add('hidden');
    return;
  }
  const hits = [];
  state.buildings.forEach((b) => {
    if (b.name.toLowerCase().includes(q)) {
      hits.push({ label: `🏥 ${b.name}`, sub: 'Prédio', go: () => enterBuilding(b.id) });
    }
    b.floors.forEach((f) => {
      f.apartments.forEach((ap) => {
        if (ap.name.toLowerCase().includes(q)) {
          hits.push({ label: `🚪 ${ap.name}`, sub: `${b.name} → ${f.name}`, go: () => enterBuilding(b.id) });
        }
        ap.rooms.forEach((rm) => {
          rm.objects.forEach((obj) => {
            if ((obj.title || '').toLowerCase().includes(q) || (obj.summary || '').toLowerCase().includes(q)) {
              hits.push({
                label: `📦 ${obj.title}`,
                sub: `${b.name} → ${ap.name} → ${rm.name}`,
                go: () => {
                  enterRoom(b.id, f.id, ap.id, rm.id);
                  openObjectModal(obj, rm);
                }
              });
            }
          });
        });
      });
    });
  });

  searchResults.innerHTML = '';
  if (hits.length === 0) {
    searchResults.innerHTML = '<div class="search-item">Nenhum resultado encontrado.</div>';
  } else {
    hits.slice(0, 12).forEach((h) => {
      const div = document.createElement('div');
      div.className = 'search-item';
      div.innerHTML = `<strong>${escapeHtml(h.label)}</strong><small>${escapeHtml(h.sub)}</small>`;
      div.onclick = () => {
        searchResults.classList.add('hidden');
        searchInput.value = '';
        h.go();
      };
      searchResults.appendChild(div);
    });
  }
  searchResults.classList.remove('hidden');
});

// ---------------- NUVEM & CONEXÃO MULTIPLAYER DESACOPLADA ----------------
let currentUser = null;
let cloudStatus = 'offline';

function persistState(skipBroadcast = false) {
  saveState(state);
  if (!skipBroadcast && presenceConn && sharedRole !== 'viewer') {
    presenceConn.broadcast('world_sync', { state, senderId: myPeerId });
  }
  // Apenas o dono do mundo salva diretamente na linha do Supabase (editores sincronizam via broadcast -> dono salva)
  const isOwnerOfCloudRow = currentUser && (!sharedWorldOwnerId || sharedWorldOwnerId === currentUser.id);
  if (isOwnerOfCloudRow) {
    cloudStatus = 'syncing';
    updateAccountButton();
    saveCloudWorld(currentUser.id, state)
      .then(() => {
        cloudStatus = 'synced';
        updateAccountButton();
      })
      .catch((err) => {
        console.warn('Erro ao sincronizar nuvem:', err);
        cloudStatus = 'error';
        updateAccountButton();
      });
  }
}

function updateAccountButton() {
  if (!currentUser) {
    btnAccount.textContent = '☁️ Entrar';
    btnAccount.title = 'Entrar para salvar e sincronizar na nuvem';
  } else if (cloudStatus === 'syncing') {
    btnAccount.textContent = '☁️ Salvando...';
  } else if (cloudStatus === 'error') {
    btnAccount.textContent = '⚠️ Erro Nuvem';
  } else {
    btnAccount.textContent = '☁️ Sincronizado';
    btnAccount.title = `Logado como ${currentUser.email}`;
  }
}

function connectMultiplayer(worldId) {
  if (!worldId) return;
  if (presenceConn && connectedWorldId === worldId) return;

  if (presenceConn) presenceConn.leave();
  connectedWorldId = worldId;

  presenceConn = connectWorldPresence(worldId, getMyLocationPayload(), {
    onStatusChange: (st) => {
      multiplayerStatus = st;
      renderOnlineBar();
    },
    onSubscribed: () => {
      // Se entrou por link compartilhado (visitante ou editor), pede o snapshot ao vivo ao anfitrião
      if (sharedWorldOwnerId && (!currentUser || sharedWorldOwnerId !== currentUser.id)) {
        presenceConn.broadcast('world_request', { requesterId: myPeerId });
      }
    },
    onPeersUpdate: (peers) => {
      remotePeers = peers;
      renderOnlineBar();
    },
    onBroadcast: (event, payload) => {
      if (event === 'world_sync' && payload?.state && payload.senderId !== myPeerId) {
        state = payload.state;
        saveState(state);
        updateTopbar();
        // Se eu sou o dono logado e um editor alterou o quarto, salvo na nuvem automaticamente
        if (currentUser && (!sharedWorldOwnerId || sharedWorldOwnerId === currentUser.id)) {
          persistState(true);
        }
      } else if (event === 'world_request' && payload?.requesterId !== myPeerId) {
        // Anfitrião (ou qualquer editor com o mundo carregado) responde com o estado atual
        if (!sharedWorldOwnerId || sharedRole === 'editor') {
          presenceConn.broadcast('world_sync', { state, senderId: myPeerId });
        }
      } else if (event === 'peer_join' && payload?.name) {
        showToast(`👋 ${payload.name} entrou no mundo!`, 'Ir até lá', () => goToPeer(payload));
      } else if (event === 'peer_emote' && payload?.emote && payload.id !== myPeerId) {
        if (payload.targetPeerId === myPeerId) {
          showToast(
            `${payload.emote} ${payload.name || 'Colega'} interagiu com você!`,
            'Ir até lá',
            () => goToPeer(payload.location || remotePeers.find((p) => p.id === payload.id))
          );
        }
      } else if (event === 'peer_ping' && payload?.fromId !== myPeerId) {
        if (!payload.targetId || payload.targetId === myPeerId) {
          const locText = formatPeerLocation(payload.location);
          showToast(
            `📣 ${payload.fromName || 'Colega'} está te chamando em ${locText}!`,
            'Ir agora',
            () => goToPeer(payload.location),
            7000
          );
        }
      }
    }
  });
}

async function initCloudSession() {
  try {
    currentUser = await getSessionUser();
  } catch (err) {
    console.warn('Falha ao verificar sessão:', err);
  }

  // 1. Tenta carregar/salvar mundo na nuvem (em bloco isolado para NUNCA derrubar o multiplayer!)
  const cloudTargetOwner = sharedWorldOwnerId || currentUser?.id;
  const looksLikeUuid = cloudTargetOwner && /^[0-9a-f-]{32,}$/i.test(cloudTargetOwner);

  if (currentUser && looksLikeUuid) {
    try {
      const remote = await loadCloudWorld(cloudTargetOwner);
      if (remote && remote.data) {
        state = remote.data;
        saveState(state);
      } else if (!sharedWorldOwnerId || sharedWorldOwnerId === currentUser.id) {
        await saveCloudWorld(currentUser.id, state);
      }
      cloudStatus = 'synced';
    } catch (err) {
      console.warn('Nuvem indisponível ou política RLS pendente:', err);
      if (!sharedWorldOwnerId || sharedWorldOwnerId === currentUser.id) {
        cloudStatus = 'error';
      }
    }
  }

  // 2. Conecta ao Multiplayer Realtime SEMPRE (mesmo sem login, usando sala rápida ou ID da conta)
  const activeWorldId = sharedWorldOwnerId || currentUser?.id || getOrCreateLocalWorldId();
  connectMultiplayer(activeWorldId);

  updateAccountButton();
  updateTopbar();
  renderOnlineBar();
}

function openFriendsModal() {
  const wrap = document.createElement('div');
  const worldId = sharedWorldOwnerId || currentUser?.id || getOrCreateLocalWorldId();
  const base = `${window.location.origin}${window.location.pathname}`;
  const viewerLink = `${base}?world=${worldId}&role=viewer`;
  const editorLink = `${base}?world=${worldId}&role=editor`;
  const others = remotePeers.filter((p) => p.id !== myPeerId);

  const statusText =
    multiplayerStatus === 'connected'
      ? '🟢 Conectado em tempo real'
      : multiplayerStatus === 'connecting'
        ? '🟡 Conectando ao servidor...'
        : '🔴 Desconectado (clique em Reconectar)';

  wrap.innerHTML = `
    <div class="card-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <strong>Status do Multiplayer</strong>
        <span style="font-size:12px;">${statusText}</span>
      </div>
      ${
        multiplayerStatus !== 'connected'
          ? '<button id="btnReconnectMp" class="btn-secondary btn-sm" style="align-self:flex-start;">🔄 Reconectar agora</button>'
          : ''
      }
      ${
        !currentUser && !sharedWorldOwnerId
          ? '<small style="color:var(--muted)">Modo Sala Rápida ativo (funciona sem login enquanto sua aba estiver aberta; para salvar na nuvem entre em ☁️ Entrar).</small>'
          : ''
      }
    </div>

    <div class="card-box">
      <strong>Seu Avatar & Aceno Rápido</strong>
      <div style="display:flex;gap:8px;align-items:center;">
        <div class="field" style="flex:2;"><label>Nome</label><input id="avName" value="${escapeHtml(myAvatar.name)}" maxlength="12" /></div>
        <div class="field" style="flex:1;"><label>Cor</label><input id="avColor" type="color" value="${myAvatar.color}" style="height:36px;" /></div>
      </div>
      <div class="row-actions" style="margin-top:4px;">
        <button id="btnSaveAvatar" class="btn-primary">Salvar Avatar</button>
        <button class="btn-ghost" data-emote="👋">👋 Acenar</button>
        <button class="btn-ghost" data-emote="💡">💡 Entendi!</button>
        <button class="btn-ghost" data-emote="📣 Vem cá!">📣 Vem cá!</button>
      </div>
    </div>

    <div class="card-box">
      <strong>Online Agora (${others.length + 1}/10)</strong>
      <div id="peersList" style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
        ${
          others.length === 0
            ? '<p style="font-size:12px;color:var(--muted)">Nenhum outro colega conectado neste momento. Copie um dos links abaixo e envie para entrarem juntos!</p>'
            : others
                .map(
                  (p) => `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 9px;background:rgba(30,41,59,0.75);border-radius:10px;">
            <div>
              <strong>${escapeHtml(p.name || 'Amigo')}</strong>
              <div style="font-size:11px;color:var(--muted)">📍 ${escapeHtml(formatPeerLocation(p))}</div>
            </div>
            <div style="display:flex;gap:5px;">
              <button class="btn-secondary btn-sm" data-call-peer="${p.id}">📣 Chamar</button>
              <button class="btn-primary btn-sm" data-go-peer="${p.id}">📍 Ir</button>
            </div>
          </div>`
                )
                .join('')
        }
      </div>
    </div>

    <div class="card-box">
      <strong>Convites (até 10 pessoas • sem chat livre)</strong>
      <div class="field">
        <label>Link de Visitante (só assiste, anda e revisa)</label>
        <div style="display:flex;gap:6px;">
          <input id="inpViewerLink" readonly value="${viewerLink}" onclick="this.select()" />
          <button class="btn-ghost" id="btnCopyViewer">Copiar</button>
        </div>
      </div>
      <div class="field">
        <label>Link de Editor (pode editar os quartos junto ao vivo)</label>
        <div style="display:flex;gap:6px;">
          <input id="inpEditorLink" readonly value="${editorLink}" onclick="this.select()" />
          <button class="btn-ghost" id="btnCopyEditor">Copiar</button>
        </div>
      </div>
    </div>
  `;
  openModal('👥 Mundo Compartilhado', wrap);

  const btnReconnect = document.getElementById('btnReconnectMp');
  if (btnReconnect) {
    btnReconnect.onclick = () => {
      connectedWorldId = null;
      connectMultiplayer(worldId);
      closeModal();
      showToast('🔄 Reconectando ao multiplayer...');
    };
  }

  wrap.querySelectorAll('[data-emote]').forEach((btn) => {
    btn.onclick = () => {
      triggerEmote(btn.dataset.emote);
      closeModal();
    };
  });

  wrap.querySelectorAll('[data-go-peer]').forEach((btn) => {
    btn.onclick = () => {
      const peer = others.find((p) => p.id === btn.dataset.goPeer);
      closeModal();
      if (peer) goToPeer(peer);
    };
  });

  wrap.querySelectorAll('[data-call-peer]').forEach((btn) => {
    btn.onclick = () => {
      const peer = others.find((p) => p.id === btn.dataset.callPeer);
      closeModal();
      if (peer) callPeerHere(peer);
    };
  });

  document.getElementById('btnCopyViewer').onclick = (e) => {
    navigator.clipboard?.writeText(viewerLink);
    e.target.textContent = 'Copiado!';
  };
  document.getElementById('btnCopyEditor').onclick = (e) => {
    navigator.clipboard?.writeText(editorLink);
    e.target.textContent = 'Copiado!';
  };

  document.getElementById('btnSaveAvatar').onclick = () => {
    myAvatar = {
      name: document.getElementById('avName').value.trim() || 'Você',
      color: document.getElementById('avColor').value
    };
    localStorage.setItem('palacio_avatar_v1', JSON.stringify(myAvatar));
    pushMyPresenceNow(true);
    closeModal();
    showToast(`✅ Avatar atualizado para "${myAvatar.name}"`);
  };
}

btnFriends.onclick = openFriendsModal;

function openAccountModal() {
  const wrap = document.createElement('div');
  if (currentUser) {
    wrap.innerHTML = `
      <div class="card-box">
        <p>Logado como: <strong>${escapeHtml(currentUser.email)}</strong></p>
        <p style="font-size:12px;color:var(--muted)">Status da nuvem: <strong>${cloudStatus === 'synced' ? 'Sincronizado' : cloudStatus === 'error' ? 'Erro (verifique se rodou o SQL no Supabase)' : 'Sincronizando...'}</strong></p>
      </div>
      <div class="row-actions">
        <button id="btnForceSync" class="btn-primary">🔄 Sincronizar Agora</button>
        <button id="btnLogout" class="btn-danger">Sair da Conta</button>
      </div>
    `;
    openModal('☁️ Conta e Nuvem', wrap);
    document.getElementById('btnForceSync').onclick = async () => {
      try {
        await saveCloudWorld(currentUser.id, state);
        cloudStatus = 'synced';
        updateAccountButton();
        closeModal();
        showToast('☁️ Mundo sincronizado com a nuvem!');
      } catch (e) {
        alert('Erro ao sincronizar: ' + (e.message || e));
      }
    };
    document.getElementById('btnLogout').onclick = async () => {
      await signOutUser();
      currentUser = null;
      cloudStatus = 'offline';
      updateAccountButton();
      closeModal();
    };
  } else {
    wrap.innerHTML = `
      <p style="color:var(--muted);font-size:13px;">Entre ou crie sua conta para sincronizar seus prédios entre PC e celular.</p>
      <div class="field"><label>E-mail</label><input id="authEmail" type="email" placeholder="seu@email.com" /></div>
      <div class="field"><label>Senha (mín. 6 caracteres)</label><input id="authPass" type="password" placeholder="••••••" /></div>
      <div class="row-actions">
        <button id="btnDoLogin" class="btn-primary">Entrar</button>
        <button id="btnDoSignup" class="btn-secondary">Criar Conta</button>
      </div>
      <small id="authMsg" style="color:var(--warn)"></small>
    `;
    openModal('☁️ Entrar / Criar Conta', wrap);

    const msgEl = document.getElementById('authMsg');
    document.getElementById('btnDoLogin').onclick = async () => {
      const email = document.getElementById('authEmail').value.trim();
      const pass = document.getElementById('authPass').value;
      msgEl.textContent = 'Entrando...';
      const { error } = await signInEmail(email, pass);
      if (error) {
        msgEl.textContent = error.message;
        return;
      }
      await initCloudSession();
      closeModal();
    };
    document.getElementById('btnDoSignup').onclick = async () => {
      const email = document.getElementById('authEmail').value.trim();
      const pass = document.getElementById('authPass').value;
      msgEl.textContent = 'Criando conta...';
      const { data, error } = await signUpEmail(email, pass);
      if (error) {
        msgEl.textContent = error.message;
        return;
      }
      if (!data.session) {
        msgEl.style.color = 'var(--accent-2)';
        msgEl.textContent = 'Conta criada! Confirme o e-mail (se ativado no Supabase) ou tente Entrar.';
      } else {
        await initCloudSession();
        closeModal();
      }
    };
  }
}

btnAccount.onclick = openAccountModal;

// Registro de PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

resizeCanvas();
updateTopbar();
updateAccountButton();
initCloudSession();
requestAnimationFrame(loop);
