// Catálogo reutilizável de objetos médicos e mnemônicos ilustrados 2.5D
export const OBJECT_CATALOG = [
  { id: 'bed', name: 'Leito / Maca', shortName: 'Leito', icon: '🛏️', thumb: '/assets/bed.jpg' },
  { id: 'monitor', name: 'Monitor Cardíaco', shortName: 'Monitor', icon: '📈', thumb: '/assets/monitor.jpg' },
  { id: 'xray', name: 'Máquina de Radiografia', shortName: 'Raio-X', icon: '🩻', thumb: '/assets/xray.jpg' },
  { id: 'ct', name: 'Tomógrafo', shortName: 'Tomógrafo', icon: '🌀', thumb: '/assets/ct.jpg' },
  { id: 'blood', name: 'Tubos de Sangue (Lab)', shortName: 'Lab / Sangue', icon: '🧪', thumb: '/assets/blood.jpg' },
  { id: 'ausculta', name: 'Ausculta / Poltrona', shortName: 'Ausculta', icon: '🩺', thumb: '/assets/ausculta.jpg' },
  { id: 'meds', name: 'Carrinho de Medicação', shortName: 'Medicação', icon: '💊', thumb: '/assets/meds.jpg' },
  { id: 'book', name: 'Criado-mudo / Livro', shortName: 'Livro', icon: '📘', thumb: '/assets/book.jpg' },
  { id: 'pdf', name: 'Arquivo / Prontuário', shortName: 'Arquivo PDF', icon: '📄', thumb: '/assets/pdf.jpg' },
  { id: 'ivstand', name: 'Suporte de Soro / Bomba IV', shortName: 'Soro / IV', icon: '💧', thumb: '/assets/ivstand.jpg' },
  { id: 'oxygen', name: 'Cilindro de Oxigênio (O₂)', shortName: 'Oxigênio', icon: '🫧', thumb: '/assets/oxygen.jpg' },
  { id: 'microscope', name: 'Microscópio de Laboratório', shortName: 'Microscópio', icon: '🔬', thumb: '/assets/microscope.jpg' },
  { id: 'skeleton', name: 'Esqueleto Anatômico', shortName: 'Esqueleto', icon: '🦴', thumb: '/assets/skeleton.jpg' },
  { id: 'desk', name: 'Mesa de Estudos / Notebook', shortName: 'Mesa / PC', icon: '💻', thumb: '/assets/desk.jpg' },
  { id: 'whiteboard', name: 'Quadro Branco Clínico', shortName: 'Quadro', icon: '🧑‍🏫', thumb: '/assets/whiteboard.jpg' },
  { id: 'screen', name: 'Biombo Hospitalar', shortName: 'Biombo', icon: '🪟', thumb: '/assets/screen.jpg' },
  { id: 'plant', name: 'Vaso com Planta', shortName: 'Planta', icon: '🪴', thumb: '/assets/plant.jpg' },
  { id: 'trophy', name: 'Troféu / Símbolo Mnemônico', shortName: 'Troféu', icon: '🏆', thumb: '/assets/trophy.jpg' }
];

export function getAllCatalogItems(state) {
  const custom = Array.isArray(state?.customCatalog) ? state.customCatalog : [];
  return [...OBJECT_CATALOG, ...custom];
}

export function findCatalogItem(state, typeId) {
  return getAllCatalogItems(state).find((c) => c.id === typeId) || null;
}

// Moldes prontos para construir/acoplar corredores e cômodos na Planta Modular
export const FLOORPLAN_PRESETS = [
  { id: 'corridor', name: 'Corredor (6×2)', shortName: 'Corredor', w: 6, h: 2, zone: 'corridor', icon: '🚪' },
  { id: 'room-5x5', name: 'Quarto 5×5', shortName: 'Quarto 5×5', w: 5, h: 5, zone: 'room', icon: '🛏️' },
  { id: 'room-6x6', name: 'Quarto 6×6', shortName: 'Quarto 6×6', w: 6, h: 6, zone: 'room', icon: '🏥' },
  { id: 'room-8x6', name: 'Sala 8×6', shortName: 'Sala 8×6', w: 8, h: 6, zone: 'room', icon: '🏛️' },
  { id: 'tile-room', name: '+1 Ladrilho', shortName: '+1 Ladrilho', w: 1, h: 1, zone: 'room', icon: '➕' },
  { id: 'tile-erase', name: 'Remover Ladrilho', shortName: 'Remover', w: 1, h: 1, zone: 'erase', icon: '🧹' }
];

// Cria mapa padrão 7x6 de células para um quarto (retrocompatível com quartos antigos)
export function createDefaultRoomCells(cols = 7, rows = 6) {
  const cells = {};
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells[`${x},${y}`] = 'room';
    }
  }
  return cells;
}

export function ensureRoomCells(room) {
  if (!room.cells || typeof room.cells !== 'object' || Object.keys(room.cells).length === 0) {
    room.cells = createDefaultRoomCells(7, 6);
  }
  return room.cells;
}

export function getRoomBounds(cells) {
  const keys = Object.keys(cells || {});
  if (keys.length === 0) {
    return { minX: 0, maxX: 6, minY: 0, maxY: 5, cols: 7, rows: 6, count: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const k of keys) {
    const [xs, ys] = k.split(',');
    const x = parseInt(xs, 10);
    const y = parseInt(ys, 10);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    count: keys.length
  };
}

// Marcos permanentes inaugurados pelo Prefeito (nunca desaparecem depois de construídos!)
export function syncMayorMilestones(state) {
  state.mayorUnlocked = state.mayorUnlocked || {};
  const rondas = state.rondasConcluidas || 0;
  if (rondas >= 1) state.mayorUnlocked.museum = true;
  if (rondas >= 2) state.mayorUnlocked.fountain = true;
  if (rondas >= 3) state.mayorUnlocked.residences = true;
  if (rondas >= 5) state.mayorUnlocked.pier = true;
  return state.mayorUnlocked;
}

// Temas ilustrados para os quartos (combinam com os sprites 2.5D)
export const ROOM_THEMES = [
  {
    id: 'clinic',
    name: 'Clínica Clássica',
    desc: 'Creme, verde-oliva e piso cerâmico',
    swatch: ['#f2ead8', '#667f5e', '#e7dfd0'],
    wallLeft: '#f2ead8',
    wallLeftShade: '#e5dbc5',
    wallRight: '#e3d9c4',
    wallRightShade: '#d3c7b0',
    wallTop: '#faf5e8',
    wainscotLeft: '#6a8362',
    wainscotRight: '#556b4e',
    railColor: '#f7f1e3',
    baseboardLeft: '#7c5d41',
    baseboardRight: '#634831',
    floorA: '#f2ece0',
    floorB: '#e8e0cf',
    corridorA: '#dfe4db',
    corridorB: '#d3dacd',
    floorGrout: 'rgba(110, 96, 78, 0.24)',
    floorStyle: 'ceramic',
    slabLeft: '#9c7c5c',
    slabRight: '#7d6045',
    bgTop: '#1d2636',
    bgBottom: '#111827'
  },
  {
    id: 'wood',
    name: 'Consultório Madeira',
    desc: 'Paredes marfim e assoalho amadeirado',
    swatch: ['#f5f0e4', '#b88758', '#d4a373'],
    wallLeft: '#f6f1e6',
    wallLeftShade: '#e9e1d2',
    wallRight: '#e7dfd0',
    wallRightShade: '#d9cfbd',
    wallTop: '#fcf9f2',
    wainscotLeft: '#b9895b',
    wainscotRight: '#9c6f46',
    railColor: '#f5ead6',
    baseboardLeft: '#6e4b2e',
    baseboardRight: '#563921',
    floorA: '#d9ac7c',
    floorB: '#cfa06e',
    corridorA: '#e7dfd0',
    corridorB: '#dcd2bf',
    floorGrout: 'rgba(92, 58, 28, 0.28)',
    floorStyle: 'wood',
    slabLeft: '#875c38',
    slabRight: '#6b472a',
    bgTop: '#242029',
    bgBottom: '#141219'
  },
  {
    id: 'icu',
    name: 'Diagnóstico / UTI',
    desc: 'Azul-aço suave e porcelanato clínico',
    swatch: ['#edf3f7', '#5a7a96', '#dce7ef'],
    wallLeft: '#eef3f7',
    wallLeftShade: '#dfe8ef',
    wallRight: '#dce6ee',
    wallRightShade: '#cbd8e3',
    wallTop: '#f8fbfd',
    wainscotLeft: '#6384a0',
    wainscotRight: '#4d6c86',
    railColor: '#f3f7fa',
    baseboardLeft: '#4a5c6d',
    baseboardRight: '#384754',
    floorA: '#ebf1f5',
    floorB: '#dfe8ee',
    corridorA: '#d5e2ec',
    corridorB: '#c8d7e4',
    floorGrout: 'rgba(71, 95, 117, 0.22)',
    floorStyle: 'ceramic',
    slabLeft: '#667b8e',
    slabRight: '#4e6070',
    bgTop: '#172333',
    bgBottom: '#0e1726'
  },
  {
    id: 'library',
    name: 'Biblioteca Médica',
    desc: 'Pergaminho quente e madeira nobre',
    swatch: ['#efe3cd', '#7d573a', '#be8c5c'],
    wallLeft: '#efe3cd',
    wallLeftShade: '#e1d1b4',
    wallRight: '#dfcfb2',
    wallRightShade: '#cfbc9a',
    wallTop: '#f7efe0',
    wainscotLeft: '#7e593d',
    wainscotRight: '#66462e',
    railColor: '#d9b88c',
    baseboardLeft: '#4e331f',
    baseboardRight: '#3c2616',
    floorA: '#c39162',
    floorB: '#b58253',
    corridorA: '#d8c5aa',
    corridorB: '#cbb698',
    floorGrout: 'rgba(72, 43, 20, 0.30)',
    floorStyle: 'wood',
    slabLeft: '#6c492d',
    slabRight: '#523620',
    bgTop: '#231e1c',
    bgBottom: '#141110'
  }
];

// Lotes disponíveis na cidade para criar novos prédios
export const CITY_LOTS = [
  { id: 'lot-1', gx: 4, gy: 4.1, label: 'Lote Noroeste' },
  { id: 'lot-2', gx: 10.6, gy: 4.1, label: 'Lote Norte' },
  { id: 'lot-3', gx: 17.8, gy: 4.1, label: 'Lote Nordeste' },
  { id: 'lot-4', gx: 4, gy: 11.4, label: 'Lote Sudoeste' },
  { id: 'lot-5', gx: 18.2, gy: 11.4, label: 'Lote Sudeste' }
];

export const DEFAULT_CLINICAL_ROOMS = [
  'Definição',
  'Epidemiologia',
  'Fatores de Risco',
  'Diagnóstico',
  'Tratamento',
  'Bibliografia'
];

const STORAGE_KEY = 'palacio_mental_city_v1';

function daysAgoIso(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export function createInitialState() {
  return {
    isNight: false,
    decayThresholdDays: 14,
    rondasConcluidas: 0,
    customCatalog: [],
    mayorUnlocked: {
      museum: false,
      fountain: false,
      residences: false,
      pier: false
    },
    buildings: [
      {
        id: 'b-cardio',
        name: 'Cardiologia',
        lotId: 'lot-1',
        color: '#ef4444',
        lastReviewedAt: daysAgoIso(1),
        floors: [
          {
            id: 'f-insuf',
            name: '1º Andar — Insuficiências',
            apartments: [
              {
                id: 'a-ic',
                name: 'Insuficiência Cardíaca',
                rooms: [
                  {
                    id: 'r-ic-def',
                    name: 'Definição',
                    theme: 'clinic',
                    objects: [
                      {
                        id: 'o-ic-1',
                        type: 'monitor',
                        gx: 3,
                        gy: 2,
                        title: 'Síndrome Clínica Complexa',
                        summary: 'Incapacidade do coração bombear sangue para suprir demanda metabólica ou fazê-lo apenas com pressões elevadas de enchimento.',
                        pdfLabel: 'Diretriz SBC IC — Pág. 12',
                        pdfUrl: 'https://www.scielo.br/',
                        pdfPage: 12
                      }
                    ]
                  },
                  {
                    id: 'r-ic-aguda',
                    name: 'Quarto da IC Aguda',
                    theme: 'icu',
                    objects: [
                      {
                        id: 'o-ic-2',
                        type: 'meds',
                        gx: 5,
                        gy: 3,
                        title: 'Perfil B (Quente e Úmido)',
                        summary: 'Mais comum na emergência: congestão sem hipoperfusão. Conduta inicial: Furosemida EV + vasodilatador se PA permitir.',
                        pdfLabel: 'Manual Emergência — Pág. 45',
                        pdfUrl: '',
                        pdfPage: 45
                      }
                    ]
                  },
                  {
                    id: 'r-ic-cronica',
                    name: 'Quarto da IC Crônica',
                    theme: 'wood',
                    objects: [
                      {
                        id: 'o-ic-3',
                        type: 'book',
                        gx: 2,
                        gy: 4,
                        title: 'Quarteto Fantástico (ICFEr)',
                        summary: 'IECA/BRA ou Sacubitril-Valsartana + Betabloqueador + Espironolactona + iSGLT2 reduzem mortalidade.',
                        pdfLabel: 'Diretriz SBC IC — Pág. 38',
                        pdfUrl: '',
                        pdfPage: 38
                      }
                    ]
                  },
                  {
                    id: 'r-ic-bib',
                    name: 'Bibliografia',
                    theme: 'library',
                    isBibliography: true,
                    pdfs: [
                      {
                        id: 'pdf-ic-1',
                        name: 'Diretriz Brasileira de Insuficiência Cardíaca',
                        sourceType: 'link',
                        url: 'https://www.scielo.br/'
                      }
                    ],
                    objects: []
                  }
                ]
              }
            ]
          },
          {
            id: 'f-endo',
            name: '2º Andar — Endocardite',
            apartments: [
              {
                id: 'a-endo',
                name: 'Endocardite Infecciosa',
                rooms: [
                  {
                    id: 'r-endo-diag',
                    name: 'Diagnóstico',
                    theme: 'clinic',
                    objects: [
                      {
                        id: 'o-endo-1',
                        type: 'blood',
                        gx: 4,
                        gy: 3,
                        title: 'Critérios de Duke Modificados',
                        summary: '2 Maiores (hemoculturas positivas + ecocardiograma com vegetação) ou 1 Maior + 3 Menores ou 5 Menores.',
                        pdfLabel: 'Infectologia — Pág. 88',
                        pdfUrl: '',
                        pdfPage: 88
                      }
                    ]
                  },
                  { id: 'r-endo-bib', name: 'Bibliografia', theme: 'library', isBibliography: true, pdfs: [], objects: [] }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'b-pneumo',
        name: 'Pneumologia',
        lotId: 'lot-2',
        color: '#3b82f6',
        lastReviewedAt: daysAgoIso(10),
        floors: [
          {
            id: 'f-infec',
            name: '1º Andar — Infecções Respiratórias',
            apartments: [
              {
                id: 'a-pnm',
                name: 'Pneumonia (PAC)',
                rooms: [
                  { id: 'r-pnm-def', name: 'Definição', theme: 'clinic', objects: [] },
                  { id: 'r-pnm-epi', name: 'Epidemiologia', theme: 'clinic', objects: [] },
                  { id: 'r-pnm-risco', name: 'Fatores de Risco', theme: 'clinic', objects: [] },
                  {
                    id: 'r-pnm-diag',
                    name: 'Diagnóstico',
                    theme: 'clinic',
                    objects: [
                      {
                        id: 'o-pnm-rx',
                        type: 'xray',
                        gx: 2,
                        gy: 2,
                        title: 'Radiografia de Tórax',
                        summary: 'Consolidação lobar ou broncopneumonia + broncograma aéreo. Confirma diagnóstico junto com clínica aguda.',
                        pdfLabel: 'Pneumologia PAC — Pág. 19',
                        pdfUrl: '',
                        pdfPage: 19
                      },
                      {
                        id: 'o-pnm-lab',
                        type: 'blood',
                        gx: 5,
                        gy: 2,
                        title: 'Exames Laboratoriais',
                        summary: 'Hemograma (leucocitose com desvio), PCR, ureia (para escore CURB-65) e hemocultura se internação.',
                        pdfLabel: 'Pneumologia PAC — Pág. 22',
                        pdfUrl: '',
                        pdfPage: 22
                      },
                      {
                        id: 'o-pnm-aus',
                        type: 'ausculta',
                        gx: 4,
                        gy: 4,
                        title: 'Ausculta Pulmonar',
                        summary: 'Estertores crepitantes localizados, aumento do frêmito toracovocal e broncofonia na área consolidada.',
                        pdfLabel: 'Semiologia — Pág. 104',
                        pdfUrl: '',
                        pdfPage: 104
                      }
                    ]
                  },
                  { id: 'r-pnm-tto', name: 'Tratamento', theme: 'clinic', objects: [] },
                  { id: 'r-pnm-bib', name: 'Bibliografia', theme: 'library', isBibliography: true, pdfs: [], objects: [] }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'b-neuro',
        name: 'Neurologia',
        lotId: 'lot-3',
        color: '#a855f7',
        lastReviewedAt: daysAgoIso(25),
        floors: [
          {
            id: 'f-vasc',
            name: '1º Andar — Neurovascular',
            apartments: [
              {
                id: 'a-avc',
                name: 'AVC Agudo',
                rooms: [
                  {
                    id: 'r-avc-diag',
                    name: 'Diagnóstico',
                    theme: 'icu',
                    objects: [
                      {
                        id: 'o-avc-ct',
                        type: 'ct',
                        gx: 4,
                        gy: 3,
                        title: 'TC de Crânio sem Contraste',
                        summary: 'Exame imediato na suspeita de AVC para diferenciar isquêmico (hipodensidade/normal precoce) de hemorrágico (hiperdensidade) antes da trombólise.',
                        pdfLabel: 'Protocolo AVC — Pág. 7',
                        pdfUrl: '',
                        pdfPage: 7
                      }
                    ]
                  },
                  { id: 'r-avc-bib', name: 'Bibliografia', theme: 'library', isBibliography: true, pdfs: [], objects: [] }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.customCatalog)) parsed.customCatalog = [];
    syncMayorMilestones(parsed);
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Falha ao salvar no localStorage:', e);
  }
}

export function getBuildingCondition(building, thresholdDays = 14) {
  const limit = Number(building.decayDays) > 0 ? Number(building.decayDays) : thresholdDays;
  const days = (Date.now() - new Date(building.lastReviewedAt).getTime()) / 86400000;
  if (days <= limit * 0.45) return 'new';
  if (days <= limit) return 'worn';
  return 'old';
}
