import {
  OBJECT_CATALOG,
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
  drawRoomObject
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
  innerCam.zoom = Math.max(0.75, Math.min(2.8, innerCam.zoom));
  innerCam.x = Math.max(-240, Math.min(240, innerCam.x));
  innerCam.y = Math.max(-200, Math.min(200, innerCam.y));
}

// Jogador e entidades vivas
const player = { x: 12 * TILE, y: 9.5 * TILE, targetX: null, targetY: null, speed: 150 };
const keys = {};

const cars = [
  { x: 0, y: 8 * TILE + 8, vx: 75, color: '#ef4444', dir: 1 },
  { x: WORLD_W - 40, y: 8 * TILE + 26, vx: -65, color: '#eab308', dir: -1 },
  { x: 14 * TILE + 6, y: 0, vy: 55, color: '#22c55e', dir: 1, vertical: true }
];

const pedestrians = [
  { x: 9 * TILE, y: 7.4 * TILE, vx: 22, minX: 7 * TILE, maxX: 14 * TILE, shirt: '#f472b6' },
  { x: 15 * TILE, y: 10.3 * TILE, vx: -18, minX: 10 * TILE, maxX: 17 * TILE, shirt: '#facc15' },
  { x: 11.2 * TILE, y: 9.2 * TILE, vx: 0, shirt: '#34d399' }, // conversando na praça
  { x: 11.7 * TILE, y: 9.2 * TILE, vx: 0, shirt: '#fb923c' }
];

const ducks = [
  { x: 12.2 * TILE, y: 8.6 * TILE, angle: 0 },
  { x: 12.8 * TILE, y: 8.8 * TILE, angle: 2.2 }
];

let trafficLightGreen = true;
let trafficTimer = 0;
let editMode = false;
let selectedPaletteType = OBJECT_CATALOG[0].id;

// Multiplayer estilo Habbo (até 10 pessoas)
const urlParams = new URLSearchParams(window.location.search);
const sharedWorldOwnerId = urlParams.get('world');
const sharedRole = sharedWorldOwnerId ? (urlParams.get('role') === 'editor' ? 'editor' : 'viewer') : 'owner';
const myPeerId = `peer-${Math.random().toString(36).slice(2, 8)}`;
let myAvatar = JSON.parse(localStorage.getItem('palacio_avatar_v1') || '{"name":"Você","color":"#38bdf8"}');
let remotePeers = [];
let presenceConn = null;
let lastPresenceSent = 0;

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

// ---------------- UTILIDADES ----------------
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
  canvas.width = Math.max(320, Math.floor(rect.width));
  canvas.height = Math.max(240, Math.floor(rect.height));
  clampCamera();
}

function getMinZoom() {
  // Garante que nunca apareça tela preta fora dos limites naturais do mundo
  return Math.max(canvas.width / WORLD_W, canvas.height / WORLD_H, 0.55);
}

function clampCamera() {
  const minZ = getMinZoom();
  cam.zoom = Math.max(minZ, Math.min(2.4, cam.zoom));
  const halfW = canvas.width / (2 * cam.zoom);
  const halfH = canvas.height / (2 * cam.zoom);
  cam.x = Math.max(halfW, Math.min(WORLD_W - halfW, cam.x));
  cam.y = Math.max(halfH, Math.min(WORLD_H - halfH, cam.y));
}

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const cx = sx - rect.left;
  const cy = sy - rect.top;
  return {
    x: cam.x + (cx - canvas.width / 2) / cam.zoom,
    y: cam.y + (cy - canvas.height / 2) / cam.zoom
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
  } else if (view.mode === 'reception') {
    const b = getCurrentBuilding();
    breadcrumbEl.textContent = `Cidade → ${b ? b.name : ''} (Recepção)`;
    btnBack.classList.remove('hidden');
    btnRonda.classList.add('hidden');
    cityHud.classList.add('hidden');
    receptionHud.classList.remove('hidden');
    roomHud.classList.add('hidden');
  } else if (view.mode === 'room') {
    const b = getCurrentBuilding();
    const a = getCurrentApartment();
    const r = getCurrentRoom();
    breadcrumbEl.textContent = `${b?.name || ''} → ${a?.name || ''} → ${r?.name || ''}`;
    btnBack.classList.remove('hidden');
    btnRonda.classList.add('hidden');
    cityHud.classList.add('hidden');
    receptionHud.classList.add('hidden');
    roomHud.classList.remove('hidden');
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

// ---------------- NAVEGAÇÃO E MODAIS ----------------
function enterBuilding(buildingId) {
  resetInnerCam();
  view = { mode: 'reception', buildingId, floorId: null, apartmentId: null, roomId: null };
  updateTopbar();
}

function openDecayConfigModal(building) {
  const currentLimit = building.decayDays || state.decayThresholdDays || 14;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p style="color:var(--muted);font-size:13px;">Defina em quantos dias sem revisão o prédio <strong>${building.name}</strong> começa a ficar velho.</p>
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
        <strong>Recepção — ${b.name}</strong><br/>
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
      fBox.innerHTML = `<strong>${f.name}</strong>`;
      f.apartments.forEach((ap) => {
        const apRow = document.createElement('div');
        apRow.style.marginTop = '6px';
        apRow.innerHTML = `<div style="font-size:13px;color:var(--accent);margin-bottom:4px;">🚪 Apartamento: <strong>${ap.name}</strong></div>`;
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
          ap.rooms.push({ id: uid('r'), name: name.trim(), objects: [] });
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
  btnToggleEdit.textContent = '✏️ Modo Edição: OFF';
  objectPaletteEl.classList.add('hidden');
  updateTopbar();

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
      row.innerHTML = `<span>📄 <strong>${p.name}</strong></span>`;
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

  // Opção 1: Link (Google Drive / URL)
  const linkBox = document.createElement('div');
  linkBox.className = 'card-box';
  linkBox.innerHTML = `
    <strong>Adicionar por Link (Google Drive / URL)</strong>
    <div class="field"><label>Nome do material</label><input id="bibName" placeholder="Ex: Diretriz Pneumonia 2026" /></div>
    <div class="field"><label>Link do PDF</label><input id="bibUrl" placeholder="https://drive.google.com/..." /></div>
    <button id="bibAddLink" class="btn-primary">Salvar Link</button>
  `;
  wrap.appendChild(linkBox);

  // Opção 2: Subir arquivo local
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
    // Cartão limpo de estudo: APENAS Título + Resuminho + Link do PDF
    wrap.innerHTML = `
      <div class="card-box">
        <h3 style="color:var(--accent)">${obj.title || 'Sem título'}</h3>
        <p>${obj.summary || 'Sem resumo cadastrado.'}</p>
        <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">
          <small style="color:var(--muted)">Referência no PDF:</small><br/>
          <strong>${obj.pdfLabel || 'Sem referência'}</strong>
        </div>
      </div>
      <div class="row-actions">
        <button id="btnOpenRef" class="btn-primary">📄 Abrir no PDF</button>
        <button id="btnEditObj" class="btn-secondary">✏️ Editar</button>
      </div>
    `;
    openModal(`${cat?.icon || '📦'} ${cat?.name || 'Objeto'}`, wrap);

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
    document.getElementById('btnEditObj').onclick = () => {
      editMode = true;
      btnToggleEdit.textContent = '✏️ Modo Edição: ON';
      objectPaletteEl.classList.remove('hidden');
      openObjectModal(obj, room);
    };
  } else {
    const ap = getCurrentApartment();
    const bibPdfs = ap?.rooms.find((r) => r.isBibliography)?.pdfs || [];
    const bibOptions = bibPdfs
      .map((p) => `<option value="${p.id}" ${obj.bibPdfId === p.id ? 'selected' : ''}>${p.name}</option>`)
      .join('');

    wrap.innerHTML = `
      <div class="field"><label>Título</label><input id="objTitle" value="${obj.title || ''}" /></div>
      <div class="field"><label>Resuminho</label><textarea id="objSummary" rows="3">${obj.summary || ''}</textarea></div>
      <div class="field"><label>Referência (ex: Diretriz AVC — Pág. 7)</label><input id="objPdfLabel" value="${obj.pdfLabel || ''}" /></div>
      ${bibPdfs.length ? `<div class="field"><label>PDF da Bibliografia deste assunto</label><select id="objBibPdf"><option value="">(Nenhum / usar link abaixo)</option>${bibOptions}</select></div>` : ''}
      <div class="field"><label>Link do PDF (Google Drive ou URL)</label><input id="objPdfUrl" value="${obj.pdfUrl || ''}" placeholder="https://drive.google.com/..." /></div>
      <div style="display:flex;gap:8px;">
        <div class="field" style="flex:1;"><label>Página exata</label><input id="objPdfPage" type="number" min="1" value="${obj.pdfPage || 1}" /></div>
        <div class="field" style="flex:2;"><label>Trecho para destacar (opcional)</label><input id="objPdfQuote" value="${obj.pdfQuote || ''}" placeholder="Ex: trombólise" /></div>
      </div>
      <div class="row-actions">
        <button id="btnSaveObj" class="btn-success">Salvar</button>
        <button id="btnDelObj" class="btn-danger">Remover da Sala</button>
      </div>
    `;
    openModal(`✏️ Editar ${cat?.name || 'Objeto'}`, wrap);

    document.getElementById('btnSaveObj').onclick = () => {
      obj.title = document.getElementById('objTitle').value.trim();
      obj.summary = document.getElementById('objSummary').value.trim();
      obj.pdfLabel = document.getElementById('objPdfLabel').value.trim();
      obj.bibPdfId = document.getElementById('objBibPdf')?.value || '';
      obj.pdfUrl = document.getElementById('objPdfUrl').value.trim();
      obj.pdfPage = Math.max(1, parseInt(document.getElementById('objPdfPage').value, 10) || 1);
      obj.pdfQuote = document.getElementById('objPdfQuote').value.trim();
      persistState();
      closeModal();
    };
    document.getElementById('btnDelObj').onclick = () => {
      room.objects = room.objects.filter((o) => o.id !== obj.id);
      persistState();
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

// ---------------- RENDERIZAÇÃO DA RECEPÇÃO (ISOMÉTRICO 2.5D) ----------------
function renderReception(now) {
  const b = getCurrentBuilding();
  ctx.fillStyle = '#141c2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!b) return;

  ctx.save();
  ctx.translate(canvas.width / 2 + innerCam.x, canvas.height / 2 + innerCam.y);
  ctx.scale(innerCam.zoom, innerCam.zoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  const cols = 7;
  const rows = 5;
  const tileW = Math.min(Math.floor((canvas.width - 40) / (cols + rows) * 1.9), Math.floor((canvas.height - 150) / (cols + rows) * 3.2), 76);
  const tileH = Math.floor(tileW / 2);
  const originX = Math.floor(canvas.width / 2) - Math.floor((cols - rows) * (tileW / 4));
  const originY = Math.floor((canvas.height - 60) / 2) - Math.floor((cols + rows) * (tileH / 4)) + 34;
  const wallH = Math.floor(tileW * 1.25);

  const p0 = isoToScreen(0, 0, originX, originY, tileW, tileH);
  const pLeft = isoToScreen(0, rows, originX, originY, tileW, tileH);
  const pRight = isoToScreen(cols, 0, originX, originY, tileW, tileH);

  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1e293b';

  // Parede esquerda (creme hospitalar + faixa da cor do prédio)
  ctx.fillStyle = '#e8e2d5';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH); ctx.lineTo(pLeft.x, pLeft.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y); ctx.lineTo(p0.x, p0.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = b.color || '#5a7a61';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - 14); ctx.lineTo(pLeft.x, pLeft.y - 14);
  ctx.lineTo(pLeft.x, pLeft.y); ctx.lineTo(p0.x, p0.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Parede direita (sombreada)
  ctx.fillStyle = '#d6cfc0';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH); ctx.lineTo(pRight.x, pRight.y - wallH);
  ctx.lineTo(pRight.x, pRight.y); ctx.lineTo(p0.x, p0.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = b.color || '#46614c';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - 14); ctx.lineTo(pRight.x, pRight.y - 14);
  ctx.lineTo(pRight.x, pRight.y); ctx.lineTo(p0.x, p0.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Piso isométrico da recepção
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = isoToScreen(c, r, originX, originY, tileW, tileH);
      const right = isoToScreen(c + 1, r, originX, originY, tileW, tileH);
      const bottom = isoToScreen(c + 1, r + 1, originX, originY, tileW, tileH);
      const left = isoToScreen(c, r + 1, originX, originY, tileW, tileH);
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f1ede4' : '#e2ddd2';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y); ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y); ctx.lineTo(left.x, left.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Balcão isométrico da Recepção + Atendente
  const deskPos = isoToScreen(4.6, 1.3, originX, originY, tileW, tileH);
  drawAvatar(ctx, deskPos.x + 8, deskPos.y - 20, '#f8fafc', 'Recepção');
  drawIsoBox(ctx, deskPos.x, deskPos.y, tileW * 1.4, tileH * 0.85, 22, '#c2956e', '#a37854', '#855f40', '#1e293b');

  // Quadro de Índice em destaque no topo esquerdo (clicável!)
  const boardW = Math.min(270, Math.floor(canvas.width * 0.62));
  const boardH = 92;
  const boardX = Math.max(16, Math.floor(p0.x - boardW - 18));
  const boardY = Math.max(14, Math.floor(p0.y - wallH + 6));
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`📋 ÍNDICE — ${b.name.toUpperCase()}`, boardX + 10, boardY + 18);

  const cond = getBuildingCondition(b, state.decayThresholdDays);
  const statusColor = cond === 'new' ? '#22c55e' : cond === 'worn' ? '#f59e0b' : '#ef4444';
  if (b.floors.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Clique para criar o 1º andar...', boardX + 10, boardY + 42);
  } else {
    b.floors.slice(0, 4).forEach((f, idx) => {
      const ly = boardY + 37 + idx * 15;
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(boardX + 14, ly - 3.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(f.name.slice(0, 30), boardX + 24, ly);
    });
  }
  canvas._receptionBoard = { x: boardX, y: boardY, w: boardW, h: boardH };

  // Pessoas circulando na recepção
  const t = now * 0.001;
  const v1 = isoToScreen(2.2 + Math.sin(t * 0.8) * 1.1, 3.0, originX, originY, tileW, tileH);
  const v2 = isoToScreen(4.5, 3.2 + Math.cos(t * 0.7) * 0.9, originX, originY, tileW, tileH);
  drawAvatar(ctx, v1.x, v1.y, '#a855f7', '');
  drawAvatar(ctx, v2.x, v2.y, '#5a7a61', '');
  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DA CIDADE ----------------
function renderCity() {
  ctx.save();
  ctx.fillStyle = state.isNight ? '#0b1120' : '#0284c7'; // Mar ao fundo
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // Grama base do condado (paleta suave aconchegante)
  ctx.fillStyle = state.isNight ? '#1e3a2f' : '#8ab17d';
  ctx.fillRect(0, 2 * TILE, WORLD_W, 12 * TILE);

  // Montanhas no limite norte (sem borda preta)
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

  // Estradinha de entrada/saída horizontal e cruzamento vertical
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 8 * TILE, WORLD_W, TILE);
  ctx.fillRect(14 * TILE, 2 * TILE, TILE, 12 * TILE);

  // Faixas de pedestre
  ctx.fillStyle = '#f8fafc';
  for (let s = 0; s < 4; s++) {
    ctx.fillRect(13.6 * TILE, 8 * TILE + 6 + s * 10, 12, 5);
    ctx.fillRect(15.1 * TILE, 8 * TILE + 6 + s * 10, 12, 5);
  }

  // Semáforo visual
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(13.7 * TILE, 7.4 * TILE, 10, 20);
  ctx.fillStyle = trafficLightGreen ? '#22c55e' : '#ef4444';
  ctx.fillRect(13.7 * TILE + 2, 7.4 * TILE + 3, 6, 6);

  // Praça Central (com laguinho, patos e banquinhos)
  ctx.fillStyle = state.isNight ? '#1e3a2f' : '#86efac';
  ctx.fillRect(10 * TILE, 9.2 * TILE, 3.8 * TILE, 3 * TILE);
  // Laguinho
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(11.4 * TILE, 10 * TILE, 1.8 * TILE, 1.3 * TILE);
  // Patos no lago
  ducks.forEach((d) => {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(d.x, d.y + Math.sin(d.angle) * 3, 6, 4);
  });
  // Banquinhos
  ctx.fillStyle = '#92400e';
  ctx.fillRect(10.3 * TILE, 9.6 * TILE, 20, 6);
  ctx.fillRect(10.3 * TILE, 11.4 * TILE, 20, 6);

  // Casinhas decorativas (não clicáveis)
  drawHouse(ctx, 2 * TILE, 10 * TILE, '#f97316', state.isNight);
  drawHouse(ctx, 7 * TILE, 10.5 * TILE, '#ec4899', state.isNight);
  drawHouse(ctx, 20 * TILE, 10 * TILE, '#14b8a6', state.isNight);

  // Marcos inaugurados pelo Prefeito conforme rondas concluídas
  const rondas = state.rondasConcluidas || 0;
  if (rondas >= 1) {
    drawMuseum(ctx, 16 * TILE, 10.2 * TILE, state.isNight);
  }
  if (rondas >= 3) {
    drawHouse(ctx, 21 * TILE, 4.5 * TILE, '#6366f1', state.isNight);
    drawHouse(ctx, 8 * TILE, 12.2 * TILE, '#84cc16', state.isNight);
  }
  if (rondas >= 5) {
    // Pescador na beira do lago da praça
    drawAvatar(ctx, 11.2 * TILE, 10.6 * TILE, '#0ea5e9', 'Pescador');
  }

  // Árvores (murcham se todos os prédios estiverem velhos)
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

  // Amigos conectados no mundo (até 10 pessoas)
  remotePeers.forEach((peer) => {
    if (peer.id === myPeerId) return;
    if (peer.mode === 'city') {
      drawAvatar(ctx, peer.x || 12 * TILE, peer.y || 9.5 * TILE, peer.color || '#f43f5e', peer.name || 'Amigo');
    }
  });

  // Avatar do jogador
  drawAvatar(ctx, player.x, player.y, myAvatar.color, myAvatar.name);

  ctx.restore();
}

// ---------------- RENDERIZAÇÃO DO CÔMODO (ISOMÉTRICO 2.5D) ----------------
function isoToScreen(gx, gy, originX, originY, tileW, tileH) {
  return {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2)
  };
}

function renderRoom() {
  const room = getCurrentRoom();
  ctx.fillStyle = '#141c2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!room) return;

  ctx.save();
  ctx.translate(canvas.width / 2 + innerCam.x, canvas.height / 2 + innerCam.y);
  ctx.scale(innerCam.zoom, innerCam.zoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  const cols = 7;
  const rows = 6;
  const tileW = Math.min(Math.floor((canvas.width - 40) / (cols + rows) * 1.9), Math.floor((canvas.height - 150) / (cols + rows) * 3.2), 76);
  const tileH = Math.floor(tileW / 2);
  const originX = Math.floor(canvas.width / 2) - Math.floor((cols - rows) * (tileW / 4));
  const originY = Math.floor((canvas.height - 60) / 2) - Math.floor((cols + rows) * (tileH / 4)) + 24;

  const wallH = Math.floor(tileW * 1.15);

  // Parede esquerda (fundo-esquerda: gx = 0, gy de 0..rows)
  const p0 = isoToScreen(0, 0, originX, originY, tileW, tileH);
  const pLeft = isoToScreen(0, rows, originX, originY, tileW, tileH);
  const pRight = isoToScreen(cols, 0, originX, originY, tileW, tileH);

  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1e293b';

  // Parede traseira esquerda (creme aconchegante)
  ctx.fillStyle = '#e8e2d5';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Faixa verde-oliva na parede esquerda
  ctx.fillStyle = '#5a7a61';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - 14);
  ctx.lineTo(pLeft.x, pLeft.y - 14);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Parede traseira direita (sombreada)
  ctx.fillStyle = '#d6cfc0';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pRight.x, pRight.y - wallH);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#46614c';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - 14);
  ctx.lineTo(pRight.x, pRight.y - 14);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Piso isométrico (losangos 2:1)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = isoToScreen(c, r, originX, originY, tileW, tileH);
      const right = isoToScreen(c + 1, r, originX, originY, tileW, tileH);
      const bottom = isoToScreen(c + 1, r + 1, originX, originY, tileW, tileH);
      const left = isoToScreen(c, r + 1, originX, originY, tileW, tileH);

      ctx.fillStyle = (r + c) % 2 === 0 ? '#f1ede4' : '#e2ddd2';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = editMode ? 'rgba(56, 189, 248, 0.45)' : 'rgba(30, 41, 59, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Objetos ordenados por profundidade (gx + gy) para sobreposição natural
  const sorted = [...room.objects].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  sorted.forEach((obj) => {
    const center = isoToScreen(obj.gx + 0.5, obj.gy + 0.5, originX, originY, tileW, tileH);
    drawRoomObject(ctx, obj.type, center.x, center.y, tileW, editMode);
  });

  // Guarda geometria isométrica para clique
  canvas._roomGrid = { originX, originY, tileW, tileH, cols, rows };
  ctx.restore();
}

// ---------------- LOOP PRINCIPAL ----------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (view.mode === 'city') {
    // Semáforo alterna a cada 5s
    trafficTimer += dt;
    if (trafficTimer > 5) {
      trafficLightGreen = !trafficLightGreen;
      trafficTimer = 0;
    }

    // Move carros
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

    // Move pedestres e patos
    pedestrians.forEach((p) => {
      if (!p.vx) return;
      p.x += p.vx * dt;
      if (p.x > p.maxX || p.x < p.minX) p.vx *= -1;
    });
    ducks.forEach((d) => {
      d.angle += dt * 2.5;
    });

    // Movimento do jogador
    let dx = 0;
    let dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

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

    if (presenceConn && now - lastPresenceSent > 140) {
      lastPresenceSent = now;
      presenceConn.updatePosition({
        x: Math.round(player.x),
        y: Math.round(player.y),
        mode: view.mode,
        buildingId: view.buildingId
      });
    }

    renderCity();
  } else if (view.mode === 'reception') {
    renderReception(now);
  } else {
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
  if (!cam.dragging) return;
  const dx = e.clientX - cam.lastX;
  const dy = e.clientY - cam.lastY;
  if (Math.hypot(dx, dy) > 4) cam.moved = true;
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
    // Verifica clique em algum prédio
    for (const b of state.buildings) {
      const lot = CITY_LOTS.find((l) => l.id === b.lotId);
      if (!lot) continue;
      const bx = lot.gx * TILE;
      const by = lot.gy * TILE;
      if (pt.x >= bx && pt.x <= bx + 84 && pt.y >= by && pt.y <= by + 74) {
        enterBuilding(b.id);
        return;
      }
    }
    // Senão, anda com o avatar até o ponto clicado
    player.targetX = pt.x;
    player.targetY = pt.y;
  } else if (view.mode === 'reception') {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const brd = canvas._receptionBoard;
    if (brd && cx >= brd.x && cx <= brd.x + brd.w && cy >= brd.y && cy <= brd.y + brd.h) {
      openReceptionModal();
    } else {
      // Clicar em qualquer ponto da recepção também pode abrir se tocar no balcão
      openReceptionModal();
    }
  } else if (view.mode === 'room' && canvas._roomGrid) {
    const { originX, originY, tileW, tileH, cols, rows } = canvas._roomGrid;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Compensar zoom/arraste interno antes de converter para grade isométrica
    const ix = (cx - (canvas.width / 2 + innerCam.x)) / innerCam.zoom + canvas.width / 2;
    const iy = (cy - (canvas.height / 2 + innerCam.y)) / innerCam.zoom + canvas.height / 2;
    const dx = (ix - originX) / (tileW / 2);
    const dy = (iy - originY) / (tileH / 2);
    const gx = Math.floor((dx + dy) / 2);
    const gy = Math.floor((dy - dx) / 2);
    if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return;

    const room = getCurrentRoom();
    if (!room) return;
    const existing = room.objects.find((o) => o.gx === gx && o.gy === gy);
    if (existing) {
      openObjectModal(existing, room);
    } else if (editMode) {
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
      openObjectModal(newObj, room);
    }
  }
});

// Botões HUD e Topbar
document.getElementById('btnZoomIn').onclick = () => { cam.zoom *= 1.2; clampCamera(); };
document.getElementById('btnZoomOut').onclick = () => { cam.zoom *= 0.83; clampCamera(); };
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
    view.mode = 'reception';
    updateTopbar();
    openReceptionModal();
  } else {
    view = { mode: 'city', buildingId: null, floorId: null, apartmentId: null, roomId: null };
    updateTopbar();
  }
};

btnRonda.onclick = () => {
  // Sugere o prédio mais antigo para ronda curta
  const sorted = [...state.buildings].sort((a, b) => new Date(a.lastReviewedAt) - new Date(b.lastReviewedAt));
  if (sorted.length > 0) enterBuilding(sorted[0].id);
};

btnToggleEdit.onclick = () => {
  if (sharedRole === 'viewer') {
    alert('Você entrou como Visitante neste mundo (somente leitura).');
    return;
  }
  editMode = !editMode;
  btnToggleEdit.textContent = `✏️ Modo Edição: ${editMode ? 'ON' : 'OFF'}`;
  objectPaletteEl.classList.toggle('hidden', !editMode);
};

btnRoomRonda.onclick = () => {
  const b = getCurrentBuilding();
  if (b) {
    b.lastReviewedAt = new Date().toISOString();
    state.rondasConcluidas = (state.rondasConcluidas || 0) + 1;
    persistState();
    let msg = `Ronda concluída! O prédio "${b.name}" recuperou o vigor.`;
    if (state.rondasConcluidas === 1) msg += '\n\n🏛️ O Prefeito inaugurou o MUSEU DA MEDICINA na cidade!';
    if (state.rondasConcluidas === 3) msg += '\n\n🏡 O Prefeito inaugurou novas casas residenciais na cidade!';
    if (state.rondasConcluidas === 5) msg += '\n\n🎣 Novo morador pescando no lago da Praça Central!';
    alert(msg);
  }
};

// Paleta de objetos médicos
OBJECT_CATALOG.forEach((item) => {
  const btn = document.createElement('button');
  btn.className = `palette-item ${item.id === selectedPaletteType ? 'active' : ''}`;
  btn.textContent = `${item.icon} ${item.name}`;
  btn.onclick = () => {
    selectedPaletteType = item.id;
    document.querySelectorAll('.palette-item').forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
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
      div.innerHTML = `<strong>${h.label}</strong><small>${h.sub}</small>`;
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

let currentUser = null;
let cloudStatus = 'offline';

function persistState() {
  saveState(state);
  if (currentUser && sharedRole !== 'viewer') {
    const targetOwnerId = sharedWorldOwnerId || currentUser.id;
    cloudStatus = 'syncing';
    updateAccountButton();
    saveCloudWorld(targetOwnerId, state)
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

async function initCloudSession() {
  try {
    currentUser = await getSessionUser();
    if (currentUser) {
      const targetOwnerId = sharedWorldOwnerId || currentUser.id;
      const remote = await loadCloudWorld(targetOwnerId);
      if (remote && remote.data) {
        state = remote.data;
        saveState(state);
      } else if (!sharedWorldOwnerId) {
        await saveCloudWorld(currentUser.id, state);
      }
      cloudStatus = 'synced';

      if (presenceConn) presenceConn.leave();
      presenceConn = connectWorldPresence(
        targetOwnerId,
        {
          id: myPeerId,
          name: myAvatar.name,
          color: myAvatar.color,
          x: Math.round(player.x),
          y: Math.round(player.y),
          mode: view.mode,
          buildingId: view.buildingId
        },
        (peers) => {
          remotePeers = peers;
          btnFriends.textContent = `👥 Amigos (${peers.length}/10)`;
        }
      );
    }
  } catch (err) {
    console.warn('Nuvem indisponível ou tabela não criada:', err);
    if (currentUser) cloudStatus = 'error';
  }
  updateAccountButton();
  updateTopbar();
}

function openFriendsModal() {
  const wrap = document.createElement('div');
  const worldId = sharedWorldOwnerId || currentUser?.id;
  const base = `${window.location.origin}${window.location.pathname}`;
  const viewerLink = worldId ? `${base}?world=${worldId}&role=viewer` : '';
  const editorLink = worldId ? `${base}?world=${worldId}&role=editor` : '';

  wrap.innerHTML = `
    <div class="card-box">
      <strong>Seu Avatar</strong>
      <div style="display:flex;gap:8px;align-items:center;">
        <div class="field" style="flex:2;"><label>Nome</label><input id="avName" value="${myAvatar.name}" maxlength="12" /></div>
        <div class="field" style="flex:1;"><label>Cor</label><input id="avColor" type="color" value="${myAvatar.color}" style="height:36px;" /></div>
      </div>
      <button id="btnSaveAvatar" class="btn-primary">Salvar Avatar</button>
    </div>

    <div class="card-box">
      <strong>Estudar Juntos (até 10 pessoas • sem chat)</strong>
      ${
        !currentUser
          ? '<p style="color:var(--warn);font-size:13px;">Entre na sua conta em <strong>☁️ Entrar</strong> primeiro para gerar links do seu mundo.</p>'
          : `
        <p style="font-size:12px;color:var(--muted)">Pessoas conectadas agora: <strong>${remotePeers.length || 1}/10</strong></p>
        <div class="field">
          <label>Link de Visitante (só assiste e revisa)</label>
          <input readonly value="${viewerLink}" onclick="this.select()" />
        </div>
        <div class="field">
          <label>Link de Editor (pode editar os quartos junto)</label>
          <input readonly value="${editorLink}" onclick="this.select()" />
        </div>
      `
      }
    </div>
  `;
  openModal('👥 Mundo Compartilhado', wrap);

  document.getElementById('btnSaveAvatar').onclick = () => {
    myAvatar = {
      name: document.getElementById('avName').value.trim() || 'Você',
      color: document.getElementById('avColor').value
    };
    localStorage.setItem('palacio_avatar_v1', JSON.stringify(myAvatar));
    if (presenceConn) {
      presenceConn.updatePosition({
        name: myAvatar.name,
        color: myAvatar.color,
        x: Math.round(player.x),
        y: Math.round(player.y),
        mode: view.mode
      });
    }
    closeModal();
  };
}

btnFriends.onclick = openFriendsModal;

function openAccountModal() {
  const wrap = document.createElement('div');
  if (currentUser) {
    wrap.innerHTML = `
      <div class="card-box">
        <p>Logado como: <strong>${currentUser.email}</strong></p>
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
