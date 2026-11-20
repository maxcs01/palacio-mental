import {
  OBJECT_CATALOG,
  FLOORPLAN_PRESETS,
  ROOM_THEMES,
  CITY_LOTS,
  DEFAULT_CLINICAL_ROOMS,
  createDefaultRoomCells,
  ensureRoomCells,
  getRoomBounds,
  syncMayorMilestones,
  getAllCatalogItems,
  findCatalogItem,
  loadState,
  saveState,
  getBuildingCondition
} from './data.js';
import {
  drawIsoBox,
  drawIllustratedCityLandscape,
  drawPixelBuilding,
  drawHouse,
  drawMuseum,
  drawTree,
  drawAvatar,
  drawCar,
  drawModularRoom,
  getRoomTheme,
  registerCustomSprites,
  processIllustratedSprite,
  exportSpriteToDataUrl,
  createMnemonicSpriteCanvas
} from './sprites.js';
import { generateFreeAiSprite } from './imageGen.js';
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
if (!Array.isArray(state.customCatalog)) state.customCatalog = [];
syncMayorMilestones(state);
registerCustomSprites(state.customCatalog);

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
  innerCam.zoom = Math.max(0.45, Math.min(3.2, innerCam.zoom));
  innerCam.x = Math.max(-720, Math.min(720, innerCam.x));
  innerCam.y = Math.max(-560, Math.min(560, innerCam.y));
}

// Jogador e entidades vivas
const player = { x: 12 * TILE, y: 9.5 * TILE, targetX: null, targetY: null, speed: 155 };
const roomPlayer = { gx: 3.5, gy: 4.5, targetGx: null, targetGy: null, speed: 3.4 };
const keys = {};

const cars = [
  { x: 0, y: 8.1 * TILE, vx: 72, color: '#e07a5f', dir: 1 },
  { x: WORLD_W - 40, y: 8.55 * TILE, vx: -62, color: '#eab308', dir: -1 },
  { x: 14.08 * TILE, y: 2.6 * TILE, vy: 54, color: '#4d908e', dir: 1, vertical: true }
];

const pedestrians = [
  { x: 9 * TILE, y: 7.55 * TILE, vx: 22, minX: 6.5 * TILE, maxX: 13.4 * TILE, shirt: '#f472b6' },
  { x: 15.6 * TILE, y: 9.35 * TILE, vx: -18, minX: 14.8 * TILE, maxX: 20.5 * TILE, shirt: '#facc15' },
  { x: 10.6 * TILE, y: 9.85 * TILE, vx: 0, shirt: '#34d399' },
  { x: 11.05 * TILE, y: 9.85 * TILE, vx: 0, shirt: '#fb923c' },
  { x: 6.2 * TILE, y: 9.45 * TILE, vx: 15, minX: 4.5 * TILE, maxX: 9.2 * TILE, shirt: '#818cf8' }
];

const ducks = [
  { x: 11.45 * TILE, y: 10.95 * TILE, angle: 0 },
  { x: 12.05 * TILE, y: 11.18 * TILE, angle: 2.2 }
];

let trafficLightGreen = true;
let trafficTimer = 0;

// Estado do Estúdio de Edição de Quartos
let editMode = false;
let editorTab = 'add'; // 'add' | 'move' | 'layout' | 'style'
let selectedPaletteType = OBJECT_CATALOG[0].id;
let selectedPaletteFlip = false; // false = esquerda (padrão), true = direita (espelhado)
let selectedLayoutPresetId = FLOORPLAN_PRESETS[0].id;
let layoutRotated = false;
let movingObjectId = null;
let hoveredRoomTile = null; // { gx, gy, occupied, inCells }

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
const peerSmoothPos = new Map();
let presenceConn = null;
let connectedWorldId = null;
let multiplayerStatus = 'offline';
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
const cityStatusPill = document.getElementById('cityStatusPill');
const receptionHud = document.getElementById('receptionHud');
const roomHud = document.getElementById('roomHud');
const btnToggleEdit = document.getElementById('btnToggleEdit');
const btnRoomRonda = document.getElementById('btnRoomRonda');
const objectPaletteEl = document.getElementById('objectPalette');
const customCatalogWrap = document.getElementById('customCatalogWrap');
const customObjectPaletteEl = document.getElementById('customObjectPalette');
const btnOpenSpriteStudio = document.getElementById('btnOpenSpriteStudio');
const btnFacingLeft = document.getElementById('btnFacingLeft');
const btnFacingRight = document.getElementById('btnFacingRight');
const btnFlipMovingObj = document.getElementById('btnFlipMovingObj');
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
const tabLayout = document.getElementById('tabLayout');
const tabStyle = document.getElementById('tabStyle');
const moveStatusBox = document.getElementById('moveStatusBox');
const btnCancelMove = document.getElementById('btnCancelMove');
const floorplanPresetGrid = document.getElementById('floorplanPresetGrid');
const layoutAreaInfo = document.getElementById('layoutAreaInfo');
const btnExpandCol = document.getElementById('btnExpandCol');
const btnExpandRow = document.getElementById('btnExpandRow');
const btnRotatePreset = document.getElementById('btnRotatePreset');
const btnResetViewFromLayout = document.getElementById('btnResetViewFromLayout');
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
            roomPlayer.gx = typeof peer.rgx === 'number' ? peer.rgx : 3.5;
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

function getCityVitality() {
  if (!state.buildings || state.buildings.length === 0) return 1;
  let active = 0;
  state.buildings.forEach((b) => {
    const cond = getBuildingCondition(b, state.decayThresholdDays);
    if (cond === 'new') active += 1;
    else if (cond === 'worn') active += 0.5;
  });
  return active / state.buildings.length;
}

function updateCityStatusPill() {
  const mayor = syncMayorMilestones(state);
  const count = ['museum', 'fountain', 'residences', 'pier'].filter((k) => mayor[k]).length;
  const vitality = getCityVitality();
  const mood = vitality > 0.55 ? '👥 Cidade movimentada' : vitality > 0 ? '🌤️ Movimento leve' : '🍃 Ruas vazias (revise!)';
  cityStatusPill.textContent = `🏛️ ${count}/4 marcos fixos • ${mood}`;
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
    updateCityStatusPill();
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

// ---------------- PLANTA MODULAR (CORREDORES & CÔMODOS ACOPLADOS) ----------------
function getActivePresetDims() {
  const preset = FLOORPLAN_PRESETS.find((p) => p.id === selectedLayoutPresetId) || FLOORPLAN_PRESETS[0];
  const w = layoutRotated ? preset.h : preset.w;
  const h = layoutRotated ? preset.w : preset.h;
  return { preset, w, h };
}

function computeLayoutStampTiles(anchorGx, anchorGy) {
  const { preset, w, h } = getActivePresetDims();
  const tiles = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ gx: anchorGx + dx, gy: anchorGy + dy, zone: preset.zone });
    }
  }
  return { preset, tiles, isErase: preset.zone === 'erase' };
}

function applyLayoutStamp(room, anchorGx, anchorGy) {
  const cells = ensureRoomCells(room);
  const { preset, tiles, isErase } = computeLayoutStampTiles(anchorGx, anchorGy);

  if (isErase) {
    const k = `${anchorGx},${anchorGy}`;
    if (!cells[k]) return;
    if (Object.keys(cells).length <= 6) {
      showToast('O quarto precisa manter pelo menos 6 ladrilhos.');
      return;
    }
    const hasObj = room.objects.some((o) => o.gx === anchorGx && o.gy === anchorGy);
    if (hasObj) {
      showToast('Remova ou mova o móvel desse ladrilho antes de apagar o piso.');
      return;
    }
    delete cells[k];
    persistState();
    refreshEditorPanel();
    return;
  }

  // Limite de segurança para manter o desempenho ótimo no celular (até 320 ladrilhos por espaço)
  const projected = new Set(Object.keys(cells));
  tiles.forEach((t) => projected.add(`${t.gx},${t.gy}`));
  if (projected.size > 320) {
    showToast('Limite máximo atingido para este espaço (320 ladrilhos).');
    return;
  }

  tiles.forEach((t) => {
    // Se já era 'room' e carimbou 'corridor' por cima (ou vice-versa), aplica a nova zona
    cells[`${t.gx},${t.gy}`] = t.zone;
  });

  persistState();
  refreshEditorPanel();
  if (preset.w > 1 || preset.h > 1) {
    showToast(`🧱 ${preset.name} acoplado na planta!`);
  }
}

function expandRoomColumn(room) {
  const cells = ensureRoomCells(room);
  const b = getRoomBounds(cells);
  if (b.count + b.rows > 320) {
    showToast('Espaço já atingiu o tamanho máximo.');
    return;
  }
  const newX = b.maxX + 1;
  let added = 0;
  for (let y = b.minY; y <= b.maxY; y++) {
    if (cells[`${b.maxX},${y}`]) {
      cells[`${newX},${y}`] = cells[`${b.maxX},${y}`];
      added++;
    }
  }
  if (added === 0) {
    for (let y = b.minY; y <= b.maxY; y++) cells[`${newX},${y}`] = 'room';
  }
  persistState();
  refreshEditorPanel();
  showToast('➕ +1 coluna adicionada ao quarto!');
}

function expandRoomRow(room) {
  const cells = ensureRoomCells(room);
  const b = getRoomBounds(cells);
  if (b.count + b.cols > 320) {
    showToast('Espaço já atingiu o tamanho máximo.');
    return;
  }
  const newY = b.maxY + 1;
  let added = 0;
  for (let x = b.minX; x <= b.maxX; x++) {
    if (cells[`${x},${b.maxY}`]) {
      cells[`${x},${newY}`] = cells[`${x},${b.maxY}`];
      added++;
    }
  }
  if (added === 0) {
    for (let x = b.minX; x <= b.maxX; x++) cells[`${x},${newY}`] = 'room';
  }
  persistState();
  refreshEditorPanel();
  showToast('➕ +1 linha adicionada ao quarto!');
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
  tabLayout.classList.toggle('hidden', tab !== 'layout');
  tabStyle.classList.toggle('hidden', tab !== 'style');
  refreshEditorPanel();
  updateEditorBanner();
}

function updateEditorBanner() {
  if (!editMode) return;
  if (editorTab === 'add') {
    const cat = findCatalogItem(state, selectedPaletteType);
    const dirLabel = selectedPaletteFlip ? '↘️ Dir' : '↙️ Esq';
    editBannerText.textContent = `Adicionar "${cat?.shortName || 'Móvel'}" (${dirLabel}): toque num espaço livre • tecla R vira o lado`;
  } else if (editorTab === 'move') {
    const room = getCurrentRoom();
    const obj = room?.objects.find((o) => o.id === movingObjectId);
    if (obj) {
      editBannerText.textContent = `Movendo "${obj.title || 'Objeto'}": toque no novo ladrilho livre (ou R para virar)`;
    } else {
      editBannerText.textContent = 'Mover: toque primeiro no objeto que deseja mudar de lugar ou virar';
    }
  } else if (editorTab === 'layout') {
    const { preset, w, h } = getActivePresetDims();
    if (preset.zone === 'erase') {
      editBannerText.textContent = 'Planta: toque em um ladrilho sem móveis para remover';
    } else {
      editBannerText.textContent = `Planta (${preset.shortName} ${w}×${h}): clique ao lado do quarto ou corredor para acoplar`;
    }
  } else {
    editBannerText.textContent = 'Estilo do Quarto: personalize a textura do ambiente ou gerencie os objetos';
  }
}

function renderFloorplanPresets() {
  floorplanPresetGrid.innerHTML = '';
  FLOORPLAN_PRESETS.forEach((p) => {
    const w = layoutRotated ? p.h : p.w;
    const h = layoutRotated ? p.w : p.h;
    const card = document.createElement('button');
    card.className = `preset-card ${p.zone === 'erase' ? 'danger' : ''} ${p.id === selectedLayoutPresetId ? 'active' : ''}`;
    card.innerHTML = `
      <strong>${p.icon} ${p.shortName}</strong>
      <small>${p.zone === 'erase' ? 'Apagar piso' : `${w} × ${h} ladrilhos`}</small>
    `;
    card.onclick = () => {
      selectedLayoutPresetId = p.id;
      renderFloorplanPresets();
      updateEditorBanner();
    };
    floorplanPresetGrid.appendChild(card);
  });
}

function refreshEditorPanel() {
  const room = getCurrentRoom();
  if (!room) return;
  const cells = ensureRoomCells(room);
  const bounds = getRoomBounds(cells);

  const count = room.objects.length;
  editorRoomMeta.textContent = `${room.name} • ${count} objeto${count === 1 ? '' : 's'}`;
  layoutAreaInfo.textContent = `${bounds.cols}×${bounds.rows} (${bounds.count} ladrilhos)`;

  // Atualiza presets da aba Planta
  renderFloorplanPresets();

  // Atualiza status da aba Mover
  const movingObj = room.objects.find((o) => o.id === movingObjectId);
  if (movingObj) {
    const sideTxt = movingObj.flip ? '↘️ Direita' : '↙️ Esquerda';
    moveStatusBox.innerHTML = `<strong>Selecionado: ${escapeHtml(movingObj.title || 'Objeto')}</strong><br /><span>Lado atual: ${sideTxt} • Toque no ladrilho livre de destino ou clique abaixo para virar.</span>`;
    btnFlipMovingObj.classList.remove('hidden');
    btnCancelMove.classList.remove('hidden');
  } else {
    moveStatusBox.innerHTML = `<strong>1. Toque no objeto</strong> que você quer mudar de lugar ou virar.<br /><span>Depois toque no ladrilho livre de destino.</span>`;
    btnFlipMovingObj.classList.add('hidden');
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

  if (document.activeElement !== inpRenameRoom) {
    inpRenameRoom.value = room.name || '';
  }

  roomObjectsList.innerHTML = '';
  if (room.objects.length === 0) {
    roomObjectsList.innerHTML = '<p class="editor-tip">Nenhum objeto neste quarto ainda. Use a aba ➕ Móveis!</p>';
  } else {
    room.objects.forEach((obj) => {
      const cat = findCatalogItem(state, obj.type);
      const row = document.createElement('div');
      row.className = 'room-obj-row';
      row.innerHTML = `
        <img src="${cat?.thumb || '/assets/book.jpg'}" class="${obj.flip ? 'flipped' : ''}" alt="${escapeHtml(cat?.shortName || '')}" />
        <div class="room-obj-row-info">
          <strong>${escapeHtml(obj.title || cat?.name || 'Objeto')}</strong>
          <small>${escapeHtml(cat?.shortName || obj.type)} • ${obj.flip ? '↘️ Dir' : '↙️ Esq'} • (${obj.gx + 1}, ${obj.gy + 1})</small>
        </div>
        <button class="btn-ghost btn-sm" data-act="flip" title="Virar Esquerda / Direita">↔️</button>
        <button class="btn-ghost btn-sm" data-act="edit" title="Editar">✏️</button>
        <button class="btn-ghost btn-sm" data-act="del" title="Remover">🗑️</button>
      `;
      row.querySelector('[data-act="flip"]').onclick = () => {
        obj.flip = !obj.flip;
        persistState();
        refreshEditorPanel();
      };
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

  const room = getCurrentRoom();
  if (room) {
    const cells = ensureRoomCells(room);
    if (!cells[`${Math.floor(roomPlayer.gx)},${Math.floor(roomPlayer.gy)}`]) {
      const firstKey = Object.keys(cells)[0];
      if (firstKey) {
        const [fx, fy] = firstKey.split(',').map(Number);
        roomPlayer.gx = fx + 0.5;
        roomPlayer.gy = fy + 0.5;
      }
    }
  }

  updateTopbar();
  pushMyPresenceNow(true);

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
  const cat = findCatalogItem(state, obj.type);
  const wrap = document.createElement('div');

  if (!editMode) {
    wrap.innerHTML = `
      <div class="obj-modal-hero">
        <img src="${cat?.thumb || '/assets/book.jpg'}" class="${obj.flip ? 'flipped' : ''}" alt="${escapeHtml(cat?.name || '')}" />
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
    const customItems = Array.isArray(state.customCatalog) ? state.customCatalog : [];
    const customGroup = customItems.length
      ? `<optgroup label="✨ Meus Objetos Criados">${customItems
          .map((c) => `<option value="${c.id}" ${obj.type === c.id ? 'selected' : ''}>${c.icon || '✨'} ${escapeHtml(c.name)}</option>`)
          .join('')}</optgroup>`
      : '';
    const builtInGroup = `<optgroup label="🏥 Catálogo Pronto">${OBJECT_CATALOG
      .map((c) => `<option value="${c.id}" ${obj.type === c.id ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>`)
      .join('')}</optgroup>`;
    let editFlip = Boolean(obj.flip);

    wrap.innerHTML = `
      <div class="obj-modal-hero">
        <img id="editObjPreviewImg" src="${cat?.thumb || '/assets/book.jpg'}" class="${editFlip ? 'flipped' : ''}" alt="" />
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="field">
            <label>Modelo visual do móvel</label>
            <select id="objType">${customGroup}${builtInGroup}</select>
          </div>
          <div class="facing-toggle" role="group" aria-label="Disposição">
            <button id="editFlipLeft" type="button" class="facing-btn ${!editFlip ? 'active' : ''}">↙️ Esquerda</button>
            <button id="editFlipRight" type="button" class="facing-btn ${editFlip ? 'active' : ''}">↘️ Direita</button>
          </div>
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
    const btnEditLeft = document.getElementById('editFlipLeft');
    const btnEditRight = document.getElementById('editFlipRight');

    const syncEditFlipUi = () => {
      previewImg.classList.toggle('flipped', editFlip);
      btnEditLeft.classList.toggle('active', !editFlip);
      btnEditRight.classList.toggle('active', editFlip);
    };
    btnEditLeft.onclick = () => { editFlip = false; syncEditFlipUi(); };
    btnEditRight.onclick = () => { editFlip = true; syncEditFlipUi(); };

    typeSel.onchange = () => {
      const nextCat = findCatalogItem(state, typeSel.value);
      if (nextCat) previewImg.src = nextCat.thumb;
    };

    document.getElementById('btnSaveObj').onclick = () => {
      obj.type = typeSel.value;
      obj.flip = editFlip;
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
      <label>Cor de Destaque do Prédio</label>
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
    updateCityStatusPill();
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
const RECEPTION_CELLS = createDefaultRoomCells(7, 5);

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

  const t = now * 0.001;
  const receptionAvatars = [
    { gx: 2.7, gy: 3.4, color: myAvatar.color, name: myAvatar.name, emote: myEmote, isPeer: false },
    { gx: 1.5 + Math.sin(t * 0.7) * 0.6, gy: 2.8, color: '#a855f7', name: '', emote: '', isPeer: false }
  ];

  canvas._receptionPeers = [];
  let peerIdx = 0;
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId || peer.mode !== 'reception' || peer.buildingId !== b.id) return;
    const px = 3.8 + (peerIdx % 3) * 0.9;
    const py = 3.1 + Math.floor(peerIdx / 3) * 0.85;
    peerIdx++;
    receptionAvatars.push({
      gx: px,
      gy: py,
      color: peer.color || '#f43f5e',
      name: peer.name || 'Amigo',
      emote: peer.emote || '',
      isPeer: true
    });
    const pt = isoToScreen(px, py, originX, originY, tileW, tileH);
    canvas._receptionPeers.push({ peer, x: pt.x, y: pt.y });
  });

  drawModularRoom(ctx, {
    cells: RECEPTION_CELLS,
    objects: [],
    avatars: receptionAvatars,
    originX,
    originY,
    tileW,
    tileH,
    themeId: 'clinic',
    isNight: state.isNight,
    editMode: false
  });

  // Balcão isométrico da Recepção + Atendente
  const deskPos = isoToScreen(4.6, 1.4, originX, originY, tileW, tileH);
  const avScale = Math.max(1.05, tileW / 66);
  drawAvatar(ctx, deskPos.x + 8, deskPos.y - 22, '#f8fafc', 'Recepção', '', avScale);
  drawIsoBox(ctx, deskPos.x, deskPos.y, tileW * 1.45, tileH * 0.85, Math.floor(tileW * 0.34), '#d8a978', '#b98858', '#996b42', '#2b2520');

  // Quadro de Índice em destaque no topo esquerdo (clicável!)
  const p0 = isoToScreen(0, 0, originX, originY, tileW, tileH);
  const wallH = Math.floor(tileW * 1.24);
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
  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DA CIDADE (ILUSTRADA 2.5D + MARCOS PERMANENTES) ----------------
function renderCity(now) {
  ctx.save();
  ctx.fillStyle = state.isNight ? '#0b1120' : '#3684a8';
  ctx.fillRect(0, 0, canvasCssW, canvasCssH);

  ctx.translate(canvasCssW / 2, canvasCssH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const mayor = syncMayorMilestones(state);
  const vitality = getCityVitality();
  const allOld = vitality === 0;

  // Cenário ilustrado completo (montanhas, gramado texturizado, avenidas com calçadas, praça, praia e mar)
  drawIllustratedCityLandscape(ctx, WORLD_W, WORLD_H, TILE, {
    isNight: state.isNight,
    trafficLightGreen,
    now,
    ducks,
    hasFountain: Boolean(mayor.fountain),
    hasPier: Boolean(mayor.pier)
  });

  // Lotes vazios elegantes
  CITY_LOTS.forEach((lot) => {
    const occupied = state.buildings.some((b) => b.lotId === lot.id);
    if (!occupied) {
      ctx.save();
      ctx.fillStyle = 'rgba(248, 245, 232, 0.22)';
      ctx.strokeStyle = 'rgba(43, 37, 32, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.roundRect(lot.gx * TILE - 4, lot.gy * TILE + 8, 94, 68, 12);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(43, 37, 32, 0.72)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lote Livre', lot.gx * TILE + 43, lot.gy * TILE + 46);
      ctx.restore();
    }
  });

  // Ordenação vertical de profundidade (Y) para prédios, casas, museu, árvores e pessoas
  const cityEntities = [];

  // Casinhas base
  [
    [1.4, 9.8, '#d97b48'],
    [6.6, 10.2, '#e07a5f'],
    [20.4, 9.7, '#d97b48']
  ].forEach(([gx, gy, col]) => {
    cityEntities.push({ y: gy * TILE + 48, draw: () => drawHouse(ctx, gx * TILE, gy * TILE, col, state.isNight) });
  });

  // Marcos PERMANENTES inaugurados pelo Prefeito (nunca desaparecem mesmo sem revisar!)
  if (mayor.museum) {
    cityEntities.push({ y: 10.1 * TILE + 66, draw: () => drawMuseum(ctx, 15.6 * TILE, 10.1 * TILE, state.isNight) });
  }
  if (mayor.residences) {
    cityEntities.push({ y: 4.3 * TILE + 48, draw: () => drawHouse(ctx, 21.1 * TILE, 4.3 * TILE, '#6366f1', state.isNight) });
    cityEntities.push({ y: 11.7 * TILE + 48, draw: () => drawHouse(ctx, 7.6 * TILE, 11.7 * TILE, '#84cc16', state.isNight) });
  }

  // Árvores ilustradas do bairro
  [[1.2, 3.6], [8.1, 4.4], [15.4, 4.5], [21.8, 6.2], [9.3, 12.2], [14.7, 12.1], [22.1, 11.6]].forEach(([gx, gy]) => {
    cityEntities.push({ y: gy * TILE + 36, draw: () => drawTree(ctx, gx * TILE, gy * TILE, allOld, state.isNight) });
  });

  // Prédios clicáveis das especialidades
  state.buildings.forEach((b) => {
    const lot = CITY_LOTS.find((l) => l.id === b.lotId);
    if (!lot) return;
    const cond = getBuildingCondition(b, state.decayThresholdDays);
    cityEntities.push({
      y: lot.gy * TILE + 80,
      draw: () => drawPixelBuilding(ctx, lot.gx * TILE, lot.gy * TILE, 86, 76, b.color, cond, state.isNight, b.name)
    });
  });

  // Pessoas da cidade (somem se todos os prédios ficarem abandonados/velhos; voltam ao revisar!)
  const visiblePedCount = Math.round(pedestrians.length * vitality);
  pedestrians.slice(0, visiblePedCount).forEach((p) => {
    cityEntities.push({ y: p.y + 8, draw: () => drawAvatar(ctx, p.x, p.y, p.shirt, '', '', 0.92) });
  });

  // Pescador aparece se o Pier foi inaugurado E a cidade ainda tem movimento (vitalidade > 0)
  if (mayor.pier && vitality > 0) {
    cityEntities.push({
      y: 13.95 * TILE + 8,
      draw: () => drawAvatar(ctx, 11.75 * TILE, 13.95 * TILE, '#0ea5e9', 'Pescador', '', 0.95)
    });
  }

  // Carros (menos carros se a cidade estiver abandonada)
  const visibleCars = vitality === 0 ? cars.slice(0, 1) : cars;
  visibleCars.forEach((c) => {
    cityEntities.push({ y: c.y + 16, draw: () => drawCar(ctx, c.x, c.y, c.color, !c.vertical) });
  });

  // Colegas conectados na cidade
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId) return;
    if (!peer.mode || peer.mode === 'city') {
      const sp = peerSmoothPos.get(peer.id);
      const px = sp ? sp.x : (peer.x || 12 * TILE);
      const py = sp ? sp.y : (peer.y || 9.5 * TILE);
      cityEntities.push({
        y: py + 10,
        draw: () => drawAvatar(ctx, px, py, peer.color || '#f43f5e', peer.name || 'Amigo', peer.emote || '', 1.06, true)
      });
    }
  });

  // Avatar do jogador
  cityEntities.push({
    y: player.y + 10,
    draw: () => drawAvatar(ctx, player.x, player.y, myAvatar.color, myAvatar.name, myEmote, 1.06)
  });

  cityEntities.sort((a, b) => a.y - b.y);
  cityEntities.forEach((e) => e.draw());

  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DO CÔMODO (PLANTA MODULAR 2.5D ILUSTRADA) ----------------
function renderRoom() {
  const room = getCurrentRoom();
  drawRoomBackdrop(room?.theme || 'clinic');
  if (!room) return;

  const cells = ensureRoomCells(room);
  const bounds = getRoomBounds(cells);

  ctx.save();
  ctx.translate(canvasCssW / 2 + innerCam.x, canvasCssH / 2 + innerCam.y);
  ctx.scale(innerCam.zoom, innerCam.zoom);
  ctx.translate(-canvasCssW / 2, -canvasCssH / 2);

  const editorDesktopOffset = editMode && canvasCssW > 780 ? 150 : 0;
  const availW = Math.max(300, canvasCssW - editorDesktopOffset * 2 - 28);
  const availH = Math.max(240, canvasCssH - (editMode && canvasCssW <= 780 ? 220 : 88));

  const span = Math.max(8, bounds.cols + bounds.rows);
  const tileW = Math.max(
    42,
    Math.min(
      Math.floor((availW / span) * 2.12),
      Math.floor((availH / span) * 3.7),
      124
    )
  );
  const tileH = Math.floor(tileW / 2);

  // Centraliza o bounding box exato da planta (mesmo depois de expandir para esquerda/direita/cima/baixo!)
  const midGx = (bounds.minX + bounds.maxX + 1) / 2;
  const midGy = (bounds.minY + bounds.maxY + 1) / 2;
  const centerX = Math.floor((canvasCssW - editorDesktopOffset * 2) / 2);
  const centerY = Math.floor(availH / 2) + Math.floor(tileW * 0.45);
  const originX = centerX - (midGx - midGy) * (tileW / 2);
  const originY = centerY - (midGx + midGy) * (tileH / 2);

  const movingObj = movingObjectId ? room.objects.find((o) => o.id === movingObjectId) : null;

  // Prévia de colocação de móvel (aba add/move) ou prévia de bloco de planta (aba layout)
  let ghost = null;
  let layoutPreview = null;

  if (editMode && hoveredRoomTile) {
    if (editorTab === 'layout') {
      layoutPreview = computeLayoutStampTiles(hoveredRoomTile.gx, hoveredRoomTile.gy);
    } else if (hoveredRoomTile.inCells && !hoveredRoomTile.occupied) {
      const ghostType =
        editorTab === 'add'
          ? selectedPaletteType
          : editorTab === 'move' && movingObj
            ? movingObj.type
            : null;
      if (ghostType) {
        ghost = {
          gx: hoveredRoomTile.gx,
          gy: hoveredRoomTile.gy,
          type: ghostType,
          flip: editorTab === 'add' ? selectedPaletteFlip : Boolean(movingObj?.flip)
        };
      }
    }
  }

  const roomAvatars = [
    {
      gx: roomPlayer.gx,
      gy: roomPlayer.gy,
      color: myAvatar.color,
      name: myAvatar.name,
      emote: myEmote,
      isPeer: false
    }
  ];

  remotePeers.forEach((peer) => {
    if (peer.id !== myPeerId && peer.mode === 'room' && peer.roomId === room.id) {
      const sp = peerSmoothPos.get(peer.id);
      const pgx = sp && typeof sp.rgx === 'number' ? sp.rgx : (typeof peer.rgx === 'number' ? peer.rgx : 3.5);
      const pgy = sp && typeof sp.rgy === 'number' ? sp.rgy : (typeof peer.rgy === 'number' ? peer.rgy : 4.5);
      roomAvatars.push({
        gx: pgx,
        gy: pgy,
        color: peer.color || '#f43f5e',
        name: peer.name || 'Amigo',
        emote: peer.emote || '',
        isPeer: true
      });
    }
  });

  drawModularRoom(ctx, {
    cells,
    objects: room.objects,
    avatars: roomAvatars,
    ghost,
    layoutPreview,
    originX,
    originY,
    tileW,
    tileH,
    themeId: room.theme || 'clinic',
    isNight: state.isNight,
    editMode,
    hoverTile: editMode ? hoveredRoomTile : null,
    selectedMoveTile: movingObj ? { gx: movingObj.gx, gy: movingObj.gy } : null,
    movingObjectId
  });

  canvas._roomGrid = { originX, originY, tileW, tileH, bounds };
  ctx.restore();
}

function screenToRoomTile(clientX, clientY, allowOutside = false) {
  if (!canvas._roomGrid) return null;
  const { originX, originY, tileW, tileH, bounds } = canvas._roomGrid;
  const rect = canvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const ix = (cx - (canvasCssW / 2 + innerCam.x)) / innerCam.zoom + canvasCssW / 2;
  const iy = (cy - (canvasCssH / 2 + innerCam.y)) / innerCam.zoom + canvasCssH / 2;
  const dx = (ix - originX) / (tileW / 2);
  const dy = (iy - originY) / (tileH / 2);
  const gx = Math.floor((dx + dy) / 2);
  const gy = Math.floor((dy - dx) / 2);

  const room = getCurrentRoom();
  const cells = room ? ensureRoomCells(room) : {};
  const inCells = Boolean(cells[`${gx},${gy}`]);

  if (!allowOutside && !inCells) return null;
  if (
    allowOutside &&
    (gx < bounds.minX - 10 || gx > bounds.maxX + 10 || gy < bounds.minY - 10 || gy > bounds.maxY + 10)
  ) {
    return null;
  }
  return { gx, gy, ix, iy, inCells };
}

// ---------------- LOOP PRINCIPAL ----------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Interpolação suave dos colegas
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
        if (c.y > 13.6 * TILE) c.y = 2.5 * TILE;
      } else {
        if (trafficLightGreen && c.x > 12.6 * TILE && c.x < 13.4 * TILE && c.vx > 0) return;
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
      d.angle += dt * 2.4;
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
    player.y = Math.max(TILE * 2.5, Math.min(13.6 * TILE, player.y));

    if (presenceConn && now - lastPresenceSent > 110) {
      lastPresenceSent = now;
      pushMyPresenceNow(false);
    }

    renderCity(now);
  } else if (view.mode === 'reception') {
    if (presenceConn && now - lastPresenceSent > 450) {
      lastPresenceSent = now;
      pushMyPresenceNow(false);
    }
    renderReception(now);
  } else {
    const room = getCurrentRoom();
    const cells = room ? ensureRoomCells(room) : {};

    let rdx = 0;
    let rdy = 0;
    if (!typing && !editMode) {
      if (keys['ArrowUp'] || keys['w'] || keys['W']) { rdx -= 1; rdy -= 1; }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) { rdx += 1; rdy += 1; }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) { rdx -= 1; rdy += 1; }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) { rdx += 1; rdy -= 1; }
    }

    let nextGx = roomPlayer.gx;
    let nextGy = roomPlayer.gy;

    if (rdx !== 0 || rdy !== 0) {
      roomPlayer.targetGx = null;
      roomPlayer.targetGy = null;
      const len = Math.hypot(rdx, rdy);
      nextGx += (rdx / len) * roomPlayer.speed * dt;
      nextGy += (rdy / len) * roomPlayer.speed * dt;
    } else if (roomPlayer.targetGx !== null) {
      const dist = Math.hypot(roomPlayer.targetGx - roomPlayer.gx, roomPlayer.targetGy - roomPlayer.gy);
      if (dist < 0.08) {
        roomPlayer.targetGx = null;
        roomPlayer.targetGy = null;
      } else {
        nextGx += ((roomPlayer.targetGx - roomPlayer.gx) / dist) * roomPlayer.speed * dt;
        nextGy += ((roomPlayer.targetGy - roomPlayer.gy) / dist) * roomPlayer.speed * dt;
      }
    }

    // Permite andar livremente por TODOS os cômodos e corredores conectados da planta!
    if (cells[`${Math.floor(nextGx)},${Math.floor(nextGy)}`]) {
      roomPlayer.gx = nextGx;
      roomPlayer.gy = nextGy;
    } else if (cells[`${Math.floor(nextGx)},${Math.floor(roomPlayer.gy)}`]) {
      roomPlayer.gx = nextGx;
    } else if (cells[`${Math.floor(roomPlayer.gx)},${Math.floor(nextGy)}`]) {
      roomPlayer.gy = nextGy;
    } else {
      roomPlayer.targetGx = null;
      roomPlayer.targetGy = null;
    }

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
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  const typing =
    document.activeElement &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (!typing && editMode && view.mode === 'room' && (e.key === 'r' || e.key === 'R')) {
    if (editorTab === 'add') {
      setSelectedFacing(!selectedPaletteFlip);
    } else if (editorTab === 'move' && movingObjectId) {
      const room = getCurrentRoom();
      const obj = room?.objects.find((o) => o.id === movingObjectId);
      if (obj) {
        obj.flip = !obj.flip;
        persistState();
        refreshEditorPanel();
      }
    } else if (editorTab === 'layout') {
      layoutRotated = !layoutRotated;
      renderFloorplanPresets();
      updateEditorBanner();
    }
  }
});
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

  // Hover preview no Modo Edição do Quarto (Móveis, Mover ou Planta)
  if (!cam.dragging && view.mode === 'room' && editMode) {
    const allowOutside = editorTab === 'layout';
    const hit = screenToRoomTile(e.clientX, e.clientY, allowOutside);
    const room = getCurrentRoom();
    if (hit && room) {
      const occupied = room.objects.some((o) => o.gx === hit.gx && o.gy === hit.gy);
      hoveredRoomTile = { gx: hit.gx, gy: hit.gy, occupied, inCells: hit.inCells };
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
      if (pt.x >= bx - 16 && pt.x <= bx + 102 && pt.y >= by - 58 && pt.y <= by + 84) {
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

    const clickedRecPeer = (canvas._receptionPeers || []).find(
      (rp) => Math.hypot(rp.x - ix, rp.y - iy) < 34
    );
    if (clickedRecPeer) {
      openPeerModal(clickedRecPeer.peer);
      return;
    }
    openReceptionModal();
  } else if (view.mode === 'room' && canvas._roomGrid) {
    const allowOutside = editMode && editorTab === 'layout';
    const hit = screenToRoomTile(e.clientX, e.clientY, allowOutside);
    if (!hit) return;
    const { gx, gy, inCells } = hit;

    const room = getCurrentRoom();
    if (!room) return;

    // Aba PLANTA: acoplar corredor, quarto pronto, +1 ladrilho ou remover ladrilho
    if (editMode && editorTab === 'layout') {
      applyLayoutStamp(room, gx, gy);
      return;
    }

    if (!inCells) return;

    // Clique em colega no mesmo quarto (fora do modo edição)
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
      const cat = findCatalogItem(state, selectedPaletteType);
      const newObj = {
        id: uid('obj'),
        type: selectedPaletteType,
        flip: selectedPaletteFlip,
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
btnFlipMovingObj.onclick = () => {
  const room = getCurrentRoom();
  const obj = room?.objects.find((o) => o.id === movingObjectId);
  if (!obj) return;
  obj.flip = !obj.flip;
  persistState();
  refreshEditorPanel();
  showToast(`↔️ "${obj.title || 'Objeto'}" virado para a ${obj.flip ? 'direita' : 'esquerda'}!`);
};

btnCancelMove.onclick = () => {
  movingObjectId = null;
  refreshEditorPanel();
  updateEditorBanner();
};

btnExpandCol.onclick = () => {
  const room = getCurrentRoom();
  if (room) expandRoomColumn(room);
};
btnExpandRow.onclick = () => {
  const room = getCurrentRoom();
  if (room) expandRoomRow(room);
};
btnRotatePreset.onclick = () => {
  layoutRotated = !layoutRotated;
  renderFloorplanPresets();
  updateEditorBanner();
};
btnResetViewFromLayout.onclick = () => resetInnerCam();

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
    const before = { ...(state.mayorUnlocked || {}) };
    b.lastReviewedAt = new Date().toISOString();
    state.rondasConcluidas = (state.rondasConcluidas || 0) + 1;
    const after = syncMayorMilestones(state);
    persistState();

    let msg = `🩺 Ronda concluída! "${b.name}" recuperou o vigor.`;
    if (!before.museum && after.museum) msg += ' 🏛️ O Prefeito inaugurou o MUSEU DA MEDICINA (permanente)!';
    else if (!before.fountain && after.fountain) msg += ' ⛲ O Prefeito inaugurou a FONTE DA PRAÇA (permanente)!';
    else if (!before.residences && after.residences) msg += ' 🏡 O Prefeito inaugurou NOVAS CASAS no bairro (permanentes)!';
    else if (!before.pier && after.pier) msg += ' ⛵ O Prefeito inaugurou o DECK E BARQUINHO no mar (permanente)!';
    showToast(msg, '', null, 6500);
  }
};

// ---------------- CATÁLOGO DINÂMICO (18 PRONTOS + OBJETOS GERADOS PELO USUÁRIO) ----------------
function setSelectedFacing(flip) {
  selectedPaletteFlip = Boolean(flip);
  btnFacingLeft.classList.toggle('active', !selectedPaletteFlip);
  btnFacingRight.classList.toggle('active', selectedPaletteFlip);
  renderObjectPalette();
  updateEditorBanner();
}

btnFacingLeft.onclick = () => setSelectedFacing(false);
btnFacingRight.onclick = () => setSelectedFacing(true);

function makeCatalogCard(item, isCustom = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `catalog-card ${item.id === selectedPaletteType ? 'active' : ''}`;
  btn.innerHTML = `
    <div class="catalog-thumb">
      <img src="${item.thumb}" class="${selectedPaletteFlip ? 'flipped' : ''}" alt="${escapeHtml(item.shortName || item.name)}" loading="lazy" />
    </div>
    <span>${escapeHtml(item.shortName || item.name)}</span>
  `;
  btn.onclick = () => {
    selectedPaletteType = item.id;
    renderObjectPalette();
    updateEditorBanner();
  };

  if (isCustom) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'custom-del-btn';
    delBtn.title = 'Remover da minha lista';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(`Remover "${item.shortName || item.name}" da sua lista salva?`)) return;
      state.customCatalog = (state.customCatalog || []).filter((c) => c.id !== item.id);
      if (selectedPaletteType === item.id) selectedPaletteType = OBJECT_CATALOG[0].id;
      persistState();
      renderObjectPalette();
      updateEditorBanner();
    };
    btn.appendChild(delBtn);
  }
  return btn;
}

function renderObjectPalette() {
  const customItems = Array.isArray(state.customCatalog) ? state.customCatalog : [];
  customCatalogWrap.classList.toggle('hidden', customItems.length === 0);
  customObjectPaletteEl.innerHTML = '';
  customItems.forEach((item) => {
    customObjectPaletteEl.appendChild(makeCatalogCard(item, true));
  });

  objectPaletteEl.innerHTML = '';
  OBJECT_CATALOG.forEach((item) => {
    objectPaletteEl.appendChild(makeCatalogCard(item, false));
  });
}

renderObjectPalette();

// ---------------- ESTÚDIO DE CRIAÇÃO / GERADOR GRATUITO DE OBJETOS ----------------
function openSpriteGeneratorModal() {
  let activeTab = 'ai'; // 'ai' | 'mnemonic' | 'upload'
  let previewDataUrl = '';
  let previewFlipped = false;
  let activeAbort = null;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="gen-tabs" role="tablist">
      <button type="button" class="gen-tab active" data-gtab="ai">✨ IA Grátis</button>
      <button type="button" class="gen-tab" data-gtab="mnemonic">🧠 Mnemônico (0s)</button>
      <button type="button" class="gen-tab" data-gtab="upload">🖼️ Enviar Imagem</button>
    </div>

    <!-- Aba 1: Gerador IA 100% Gratuito (AI Horde) -->
    <div id="genPaneAi" class="card-box">
      <small style="color:var(--muted)">Descreva qualquer objeto ou imagem mnemônica! O app aplica automaticamente o <strong>estilo ilustrado 2.5D dos quartos</strong> e recorta o fundo branco — <strong>100% grátis</strong>.</small>
      <div class="field">
        <label>O que você quer desenhar?</label>
        <textarea id="genAiPrompt" rows="2" placeholder="Ex: palavra CIPRO feita de flores coloridas"></textarea>
      </div>
      <div class="row-actions" style="gap:5px;">
        <button type="button" class="btn-ghost btn-sm" data-sample="palavra CIPRO feita de flores">🌸 Palavra CIPRO de flores</button>
        <button type="button" class="btn-ghost btn-sm" data-sample="coração anatômico com asas douradas">❤️ Coração com asas</button>
        <button type="button" class="btn-ghost btn-sm" data-sample="bactéria fofa usando coroa dourada">👑 Bactéria com coroa</button>
      </div>
      <div class="row-actions">
        <button type="button" id="btnRunAiGen" class="btn-primary">✨ Gerar Imagem Grátis</button>
        <button type="button" id="btnCancelAiGen" class="btn-secondary hidden">Cancelar</button>
      </div>
      <div id="genAiStatus" class="gen-status-pill hidden"></div>
    </div>

    <!-- Aba 2: Criador Mnemônico Instantâneo (Offline, 0 segundos) -->
    <div id="genPaneMnemonic" class="card-box hidden">
      <small style="color:var(--muted)">Cria em <strong>0 segundos</strong> um objeto 2.5D ilustrado perfeito para memorizar nomes difíceis de remédios, bactérias e siglas.</small>
      <div style="display:flex;gap:8px;">
        <div class="field" style="flex:2;">
          <label>Palavra / Sigla (até 12 letras)</label>
          <input id="mnemWord" maxlength="12" value="CIPRO" placeholder="Ex: CIPRO, AMOXI, CURB" />
        </div>
        <div class="field" style="flex:1;">
          <label>Cor</label>
          <input id="mnemColor" type="color" value="#e07a5f" style="height:36px;" />
        </div>
      </div>
      <div class="field">
        <label>Estilo 2.5D</label>
        <select id="mnemStyle">
          <option value="floral-word">🌸 Palavra Esculpida com Símbolos (ex: CIPRO de flores)</option>
          <option value="bottle">💊 Frasco de Remédio Rotulado</option>
          <option value="totem">🏆 Totem / Medalhão Mnemônico</option>
        </select>
      </div>
      <div class="field">
        <label>Símbolo / Ícone decorativo</label>
        <div class="emoji-picks" id="mnemEmojiPicks">
          ${['🌸', '🌼', '💊', '🔥', '⚡', '👑', '🛡️', '🧬', '🦠', '❤️', '🫁', '🧠', '💉', '❄️'].map((em, i) => `<button type="button" class="emoji-pick ${i === 0 ? 'active' : ''}" data-em="${em}">${em}</button>`).join('')}
        </div>
      </div>
    </div>

    <!-- Aba 3: Enviar imagem pronta do dispositivo -->
    <div id="genPaneUpload" class="card-box hidden">
      <small style="color:var(--muted)">Envie qualquer desenho ou imagem com fundo branco/transparente do celular ou PC. O app remove o fundo branco automaticamente!</small>
      <input id="genUploadFile" type="file" accept="image/*" />
    </div>

    <!-- Prévia compartilhada com teste de Esquerda / Direita + Salvar na Lista -->
    <div class="card-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <strong style="font-size:13px;">Prévia do Objeto (fundo transparente)</strong>
        <button type="button" id="btnPreviewFlip" class="btn-ghost btn-sm">↔️ Testar Lado (↙️ Esq)</button>
      </div>
      <div id="genPreviewStage" class="gen-preview-stage">
        <span style="font-size:12px;">Gere ou escolha uma imagem acima para visualizar aqui.</span>
      </div>
      <div class="field">
        <label>Nome curto para guardar na sua lista</label>
        <input id="genSaveName" maxlength="22" placeholder="Ex: Cipro Flor" />
      </div>
      <div class="row-actions" style="justify-content:flex-end;">
        <button type="button" id="btnSaveCustomSprite" class="btn-success" disabled>💾 Guardar na Minha Lista e Usar</button>
      </div>
    </div>
  `;

  openModal('✨ Criador de Objetos 2.5D (Grátis)', wrap);

  const paneAi = wrap.querySelector('#genPaneAi');
  const paneMnem = wrap.querySelector('#genPaneMnemonic');
  const paneUp = wrap.querySelector('#genPaneUpload');
  const previewStage = wrap.querySelector('#genPreviewStage');
  const btnPreviewFlip = wrap.querySelector('#btnPreviewFlip');
  const inpSaveName = wrap.querySelector('#genSaveName');
  const btnSave = wrap.querySelector('#btnSaveCustomSprite');
  const aiStatus = wrap.querySelector('#genAiStatus');
  const btnRunAi = wrap.querySelector('#btnRunAiGen');
  const btnCancelAi = wrap.querySelector('#btnCancelAiGen');
  const inpAiPrompt = wrap.querySelector('#genAiPrompt');

  let selectedMnemEmoji = '🌸';

  function updatePreview(dataUrl, suggestedName = '') {
    previewDataUrl = dataUrl;
    btnSave.disabled = !dataUrl;
    if (suggestedName && !inpSaveName.value.trim()) {
      inpSaveName.value = suggestedName.slice(0, 22);
    }
    if (!dataUrl) {
      previewStage.innerHTML = '<span style="font-size:12px;">Gere ou escolha uma imagem acima para visualizar aqui.</span>';
      return;
    }
    previewStage.innerHTML = `<img class="gen-preview-img ${previewFlipped ? 'flipped' : ''}" src="${dataUrl}" alt="Prévia" />`;
  }

  function renderMnemonicNow() {
    const word = wrap.querySelector('#mnemWord').value.trim() || 'CIPRO';
    const style = wrap.querySelector('#mnemStyle').value;
    const accentColor = wrap.querySelector('#mnemColor').value;
    const c = createMnemonicSpriteCanvas({ word, emoji: selectedMnemEmoji, style, accentColor });
    const url = exportSpriteToDataUrl(c, 256);
    updatePreview(url, word);
  }

  wrap.querySelectorAll('.gen-tab').forEach((tabBtn) => {
    tabBtn.onclick = () => {
      activeTab = tabBtn.dataset.gtab;
      wrap.querySelectorAll('.gen-tab').forEach((b) => b.classList.toggle('active', b === tabBtn));
      paneAi.classList.toggle('hidden', activeTab !== 'ai');
      paneMnem.classList.toggle('hidden', activeTab !== 'mnemonic');
      paneUp.classList.toggle('hidden', activeTab !== 'upload');
      if (activeTab === 'mnemonic') {
        renderMnemonicNow();
      }
    };
  });

  wrap.querySelectorAll('[data-sample]').forEach((b) => {
    b.onclick = () => {
      inpAiPrompt.value = b.dataset.sample;
      if (!inpSaveName.value.trim()) {
        inpSaveName.value = b.textContent.replace(/^[^\s]+\s+/, '').slice(0, 20);
      }
    };
  });

  btnPreviewFlip.onclick = () => {
    previewFlipped = !previewFlipped;
    btnPreviewFlip.textContent = previewFlipped ? '↔️ Testar Lado (↘️ Dir)' : '↔️ Testar Lado (↙️ Esq)';
    const img = previewStage.querySelector('img');
    if (img) img.classList.toggle('flipped', previewFlipped);
  };

  btnRunAi.onclick = async () => {
    const promptText = inpAiPrompt.value.trim();
    if (!promptText) return alert('Descreva o objeto que deseja gerar!');
    if (activeAbort) activeAbort.abort();
    activeAbort = new AbortController();

    btnRunAi.disabled = true;
    btnCancelAi.classList.remove('hidden');
    aiStatus.classList.remove('hidden');
    aiStatus.textContent = 'Iniciando gerador gratuito...';

    try {
      const res = await generateFreeAiSprite(promptText, {
        signal: activeAbort.signal,
        onStatus: (txt) => { aiStatus.textContent = txt; }
      });
      aiStatus.textContent = `✅ Pronto! (modelo gratuito: ${res.modelUsed})`;
      const shortGuess = promptText.split(/\s+/).slice(0, 3).join(' ');
      updatePreview(res.dataUrl, shortGuess);
    } catch (err) {
      if (err?.name === 'AbortError') {
        aiStatus.textContent = 'Geração cancelada.';
      } else {
        aiStatus.textContent = `⚠️ ${err?.message || 'Falha no servidor gratuito.'} Dica: tente de novo ou use a aba "🧠 Mnemônico (0s)".`;
      }
    } finally {
      btnRunAi.disabled = false;
      btnCancelAi.classList.add('hidden');
      activeAbort = null;
    }
  };

  btnCancelAi.onclick = () => {
    if (activeAbort) activeAbort.abort();
  };

  // Eventos da aba Mnemônico Instantâneo
  wrap.querySelector('#mnemWord').oninput = () => {
    inpSaveName.value = wrap.querySelector('#mnemWord').value.trim().slice(0, 22);
    renderMnemonicNow();
  };
  wrap.querySelector('#mnemStyle').onchange = renderMnemonicNow;
  wrap.querySelector('#mnemColor').oninput = renderMnemonicNow;
  wrap.querySelectorAll('.emoji-pick').forEach((eb) => {
    eb.onclick = () => {
      selectedMnemEmoji = eb.dataset.em;
      wrap.querySelectorAll('.emoji-pick').forEach((x) => x.classList.toggle('active', x === eb));
      renderMnemonicNow();
    };
  });

  // Eventos da aba Enviar Imagem
  wrap.querySelector('#genUploadFile').onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const processed = processIllustratedSprite(img, false);
        const url = exportSpriteToDataUrl(processed, 256);
        const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 20);
        updatePreview(url, cleanName);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Salvar na lista do usuário e selecionar já pronto para colocar no quarto!
  btnSave.onclick = () => {
    if (!previewDataUrl) return;
    const label = inpSaveName.value.trim() || 'Meu Objeto';
    state.customCatalog = Array.isArray(state.customCatalog) ? state.customCatalog : [];
    if (state.customCatalog.length >= 60) {
      return alert('Limite de 60 objetos personalizados atingido. Remova algum antigo para guardar novos.');
    }
    const newItem = {
      id: uid('cust'),
      name: label,
      shortName: label.slice(0, 14),
      icon: activeTab === 'mnemonic' ? selectedMnemEmoji : '✨',
      thumb: previewDataUrl,
      preprocessed: true
    };
    state.customCatalog.unshift(newItem);
    registerCustomSprites(state.customCatalog);
    selectedPaletteType = newItem.id;
    selectedPaletteFlip = previewFlipped;
    persistState();
    setSelectedFacing(previewFlipped);
    closeModal();
    showToast(`✨ "${label}" salvo na sua lista! Toque no piso para posicionar.`);
  };
}

btnOpenSpriteStudio.onclick = openSpriteGeneratorModal;

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
  syncMayorMilestones(state);
  saveState(state);
  if (!skipBroadcast && presenceConn && sharedRole !== 'viewer') {
    presenceConn.broadcast('world_sync', { state, senderId: myPeerId });
  }
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
        if (!Array.isArray(state.customCatalog)) state.customCatalog = [];
        syncMayorMilestones(state);
        registerCustomSprites(state.customCatalog);
        saveState(state);
        renderObjectPalette();
        updateTopbar();
        if (currentUser && (!sharedWorldOwnerId || sharedWorldOwnerId === currentUser.id)) {
          persistState(true);
        }
      } else if (event === 'world_request' && payload?.requesterId !== myPeerId) {
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

  const cloudTargetOwner = sharedWorldOwnerId || currentUser?.id;
  const looksLikeUuid = cloudTargetOwner && /^[0-9a-f-]{32,}$/i.test(cloudTargetOwner);

  if (currentUser && looksLikeUuid) {
    try {
      const remote = await loadCloudWorld(cloudTargetOwner);
      if (remote && remote.data) {
        state = remote.data;
        if (!Array.isArray(state.customCatalog)) state.customCatalog = [];
        syncMayorMilestones(state);
        registerCustomSprites(state.customCatalog);
        saveState(state);
        renderObjectPalette();
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

resizeCanvas();
updateTopbar();
updateAccountButton();
initCloudSession();
requestAnimationFrame(loop);
