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
  { id: 'trophy', name: 'Troféu / Símbolo Mnemônico', shortName: 'Troféu', icon: '🏆', thumb: '/assets/trophy.jpg' },
  { id: 'tb_bacilos', name: 'M. tuberculosis (Bacilos)', shortName: 'Bacilos TBC', icon: '🦠', thumb: '/assets/tb_bacilos.png' },
  { id: 'tb_microscopio', name: 'Microscópio Ziehl-Neelsen', shortName: 'Microscopia', icon: '🔬', thumb: '/assets/tb_microscopio.png' },
  { id: 'tb_rif', name: 'Rifampicina (RIF) + Blister', shortName: 'Rifampicina', icon: '💊', thumb: '/assets/tb_rif.png' },
  { id: 'tb_inh', name: 'Isoniazida (INH) Frasco', shortName: 'Isoniazida', icon: '💊', thumb: '/assets/tb_inh.png' },
  { id: 'tb_pza_emb', name: 'Pirazinamida + Etambutol (PZA/EMB)', shortName: 'PZA & EMB', icon: '💊', thumb: '/assets/tb_pza_emb.png' },
  { id: 'tb_emb_caixa', name: 'Etambutol (EMB) Caixa', shortName: 'Etambutol', icon: '📦', thumb: '/assets/tb_emb_caixa.png' },
  { id: 'tb_bacterias', name: 'Cultura em Placa de Petri', shortName: 'Cultura', icon: '🧫', thumb: '/assets/tb_bacterias.png' },
  { id: 'tb_raiox', name: 'Negatoscópio Raio-X de Tórax', shortName: 'Raio-X Tórax', icon: '🩻', thumb: '/assets/tb_raiox.png' },
  { id: 'tb_ltmp', name: 'LTMP / Toxina e Gotícula', shortName: 'LTMP / Gota', icon: '💧', thumb: '/assets/tb_ltmp.png' },
  { id: 'tb_mascara_cirurgica', name: 'Máscara Cirúrgica Protetora', shortName: 'Máscara Cirúrgica', icon: '😷', thumb: '/assets/tb_mascara_cirurgica.png' },
  { id: 'tb_mascara_n95', name: 'Máscara N95 / PFF2 (Respirador)', shortName: 'Máscara N95', icon: '😷', thumb: '/assets/tb_mascara_n95.png' },
  { id: 'tb_pulmao', name: 'Pulmão Cavernoso + Estetoscópio', shortName: 'Pulmão TBC', icon: '🫁', thumb: '/assets/tb_pulmao.png' },
  { id: 'tb_ppd', name: 'PPD / Mantoux (Pápula e Seringa)', shortName: 'Teste PPD', icon: '💉', thumb: '/assets/tb_ppd.png' },
  { id: 'tb_esputo', name: 'Potes de Escarro (Baciloscopia)', shortName: 'Escarro / Esputo', icon: '🧪', thumb: '/assets/tb_esputo.png' },
  { id: 'tb_bcg', name: 'Vacina BCG + Seringa', shortName: 'Vacina BCG', icon: '💉', thumb: '/assets/tb_bcg.png' },
  { id: 'tb_cartilha', name: 'Cartilha / Manual TBC', shortName: 'Cartilha TBC', icon: '📖', thumb: '/assets/tb_cartilha.png' }
];

export function getAllCatalogItems(state) {
  const custom = Array.isArray(state?.customCatalog) ? state.customCatalog : [];
  return [...OBJECT_CATALOG, ...custom];
}

export function findCatalogItem(state, typeId) {
  return getAllCatalogItems(state).find((c) => c.id === typeId) || null;
}

// Moldes prontos para construir/acoplar corredores, cômodos e editar paredes na Planta Modular
export const FLOORPLAN_PRESETS = [
  { id: 'corridor', name: 'Corredor (6×2)', shortName: 'Corredor', w: 6, h: 2, zone: 'corridor', icon: '🚪' },
  { id: 'room-5x5', name: 'Quarto 5×5', shortName: 'Quarto 5×5', w: 5, h: 5, zone: 'room', icon: '🛏️' },
  { id: 'room-6x6', name: 'Quarto 6×6', shortName: 'Quarto 6×6', w: 6, h: 6, zone: 'room', icon: '🏥' },
  { id: 'room-8x6', name: 'Sala 8×6', shortName: 'Sala 8×6', w: 8, h: 6, zone: 'room', icon: '🏛️' },
  { id: 'tile-room', name: '+1 Ladrilho', shortName: '+1 Ladrilho', w: 1, h: 1, zone: 'room', icon: '➕' },
  { id: 'tile-erase', name: 'Remover Ladrilho', shortName: 'Remover Piso', w: 1, h: 1, zone: 'erase', icon: '🧹' },
  { id: 'wall-toggle', name: 'Apagar / Por Parede', shortName: 'Apagar Parede', w: 1, h: 1, zone: 'wall', icon: '🧱' }
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

// Grade isométrica 2.5D da Cidade (12 quadras organizadas com avenidas diagonais)
export const CITY_GRID = {
  originX: 840,
  originY: 160,
  tileW: 82,
  tileH: 41,
  cols: 20,
  rows: 15
};

export function cityIso(u, v) {
  return {
    x: CITY_GRID.originX + (u - v) * (CITY_GRID.tileW / 2),
    y: CITY_GRID.originY + (u + v) * (CITY_GRID.tileH / 2)
  };
}

export function screenToCityIso(wx, wy) {
  const dx = (wx - CITY_GRID.originX) / (CITY_GRID.tileW / 2);
  const dy = (wy - CITY_GRID.originY) / (CITY_GRID.tileH / 2);
  return {
    u: (dx + dy) / 2,
    v: (dy - dx) / 2
  };
}

// 7 estilos de edifícios isométricos 2.5D para diferenciar visualmente cada especialidade!
export const BUILDING_TYPES = [
  {
    id: 'city_hospital',
    name: 'Hospital Clássico',
    shortName: 'Hospital',
    icon: '🏥',
    thumb: '/assets/city-hospital.jpg',
    desc: 'Clínica tradicional creme com cruz médica'
  },
  {
    id: 'city_tower',
    name: 'Torre Médica Moderna',
    shortName: 'Torre UTI',
    icon: '🏢',
    thumb: '/assets/city-tower.png',
    desc: 'Edifício envidraçado com heliponto no topo'
  },
  {
    id: 'city_academy',
    name: 'Faculdade Clássica',
    shortName: 'Faculdade',
    icon: '🏛️',
    thumb: '/assets/city-academy.png',
    desc: 'Colunas neoclássicas, tijolinho e cúpula verde'
  },
  {
    id: 'city_lab',
    name: 'Instituto & Laboratório',
    shortName: 'Laboratório',
    icon: '🔬',
    thumb: '/assets/city-lab.png',
    desc: 'Centro científico moderno com domo de vidro'
  },
  {
    id: 'city_clinic',
    name: 'Clínica Acolhedora',
    shortName: 'Chalé Clínico',
    icon: '🧸',
    thumb: '/assets/city-clinic.png',
    desc: 'Telhado vermelho-rubi, relógio e varandas floridas'
  },
  {
    id: 'city_pavilion',
    name: 'Pavilhão Solário',
    shortName: 'Solário',
    icon: '🌲',
    thumb: '/assets/city-pavilion.png',
    desc: 'Estufa iluminada de vidro e madeira nobre'
  },
  {
    id: 'city_citadel',
    name: 'Palácio Vermelho (The Reds)',
    shortName: 'Palácio',
    icon: '🏰',
    thumb: '/assets/city-citadel.png',
    desc: 'Cidadela acadêmica com torres rubi'
  }
];

// 12 lotes organizados em quadras isométricas (prontos para expandir muitas especialidades!)
export const CITY_LOTS = [
  { id: 'lot-1', u: 1.5, v: 3.1, label: 'Quadra Noroeste A' },
  { id: 'lot-2', u: 8.0, v: 2.7, label: 'Quadra Norte Central' },
  { id: 'lot-3', u: 13.0, v: 2.7, label: 'Quadra Norte Leste' },
  { id: 'lot-4', u: 1.5, v: 8.2, label: 'Quadra Oeste A' },
  { id: 'lot-5', u: 13.0, v: 8.0, label: 'Quadra Leste (Praça)' },
  { id: 'lot-6', u: 3.7, v: 2.0, label: 'Quadra Noroeste B' },
  { id: 'lot-7', u: 17.5, v: 2.7, label: 'Quadra Nordeste' },
  { id: 'lot-8', u: 3.7, v: 7.2, label: 'Quadra Oeste B' },
  { id: 'lot-9', u: 17.5, v: 8.0, label: 'Quadra Leste B' },
  { id: 'lot-10', u: 2.5, v: 13.0, label: 'Quadra Sudoeste' },
  { id: 'lot-11', u: 8.0, v: 13.0, label: 'Quadra Sul Central' },
  { id: 'lot-12', u: 17.5, v: 13.0, label: 'Quadra Sudeste' }
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
        buildingType: 'city_tower',
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
        buildingType: 'city_pavilion',
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
              },
              {
                id: 'a-tb',
                name: 'Tuberculose Pulmonar (TBC)',
                rooms: [
                  {
                    id: 'r-tb-agente',
                    name: 'Agente & Fisiopatologia',
                    theme: 'clinic',
                    objects: [
                      {
                        id: 'o-tb-bac',
                        type: 'tb_bacilos',
                        gx: 2,
                        gy: 2,
                        title: 'Mycobacterium tuberculosis (Bacilo de Koch)',
                        summary: 'Bacilo álcool-ácido resistente (BAAR), aeróbio estrito, parede rica em ácidos micólicos. Transmissão aérea por aerossóis (núcleos de Wells).',
                        pdfLabel: 'Manual TBC MS — Pág. 14',
                        pdfUrl: '',
                        pdfPage: 14
                      },
                      {
                        id: 'o-tb-pulm',
                        type: 'tb_pulmao',
                        gx: 5,
                        gy: 3,
                        title: 'Lesão Cavitária Apical',
                        summary: 'Reativação pós-primária clássica no ápice/segmento posterior dos lobos superiores (alta PaO₂). Necrose caseosa, cavitação e tosse crônica com escarro.',
                        pdfLabel: 'Pneumologia TBC — Pág. 32',
                        pdfUrl: '',
                        pdfPage: 32
                      }
                    ]
                  },
                  {
                    id: 'r-tb-diag',
                    name: 'Diagnóstico & Exames',
                    theme: 'clinic',
                    objects: [
                      {
                        id: 'o-tb-rx',
                        type: 'tb_raiox',
                        gx: 2,
                        gy: 2,
                        title: 'Radiografia de Tórax (RX)',
                        summary: 'Infiltrados e cavitações em ápices pulmonares. Exame de imagem padrão para triagem, avaliação de gravidade e evolução.',
                        pdfLabel: 'Pneumologia — Pág. 45',
                        pdfUrl: '',
                        pdfPage: 45
                      },
                      {
                        id: 'o-tb-esp',
                        type: 'tb_esputo',
                        gx: 4,
                        gy: 2,
                        title: 'Baciloscopia & TRM-TB (GeneXpert)',
                        summary: 'Baciloscopia direta (Ziehl-Neelsen, 2 amostras) e TRM-TB (resultado em 2h + detecta resistência à Rifampicina).',
                        pdfLabel: 'Diretrizes MS — Pág. 58',
                        pdfUrl: '',
                        pdfPage: 58
                      },
                      {
                        id: 'o-tb-ppd',
                        type: 'tb_ppd',
                        gx: 2,
                        gy: 4,
                        title: 'Teste Tuberculínico (PPD / Mantoux)',
                        summary: 'Avalia infecção latente (ILTB). Leitura após 48-72h medindo o maior diâmetro transverso da enduração (≥ 5 mm é positivo no Brasil).',
                        pdfLabel: 'Manual ILTB — Pág. 20',
                        pdfUrl: '',
                        pdfPage: 20
                      },
                      {
                        id: 'o-tb-mic',
                        type: 'tb_microscopio',
                        gx: 5,
                        gy: 4,
                        title: 'Microscopia Ziehl-Neelsen & Cultura',
                        summary: 'Coloração Ziehl-Neelsen revela bacilos fúcsia/rosas. Cultura em meio Lowenstein-Jensen é o padrão-ouro com teste de sensibilidade.',
                        pdfLabel: 'Microbiologia Clínica — Pág. 77',
                        pdfUrl: '',
                        pdfPage: 77
                      }
                    ]
                  },
                  {
                    id: 'r-tb-tto',
                    name: 'Tratamento (Esquema RIPE)',
                    theme: 'wood',
                    objects: [
                      {
                        id: 'o-tb-rif',
                        type: 'tb_rif',
                        gx: 2,
                        gy: 2,
                        title: 'Rifampicina (RIF) — 2RHZE / 4RH',
                        summary: 'Bactericida potente, inibe RNA-polimerase. Efeitos: urina e secreções alaranjadas, hepatotoxicidade e indução forte do citocromo CYP450.',
                        pdfLabel: 'Farmacologia TBC — Pág. 110',
                        pdfUrl: '',
                        pdfPage: 110
                      },
                      {
                        id: 'o-tb-inh',
                        type: 'tb_inh',
                        gx: 4,
                        gy: 2,
                        title: 'Isoniazida (INH)',
                        summary: 'Inibe síntese de ácidos micólicos. Efeitos adversos: neuropatia periférica (prevenida com Vitamina B6 / Piridoxina) e hepatite.',
                        pdfLabel: 'Farmacologia TBC — Pág. 114',
                        pdfUrl: '',
                        pdfPage: 114
                      },
                      {
                        id: 'o-tb-pza',
                        type: 'tb_pza_emb',
                        gx: 3,
                        gy: 4,
                        title: 'Pirazinamida (PZA) & Etambutol (EMB)',
                        summary: 'PZA age no ambiente ácido intracelular (hiperuricemia/gota). EMB inibe arabinosiltransferase (neurite óptica retrobulbar — perda de visão de cores).',
                        pdfLabel: 'Manual MS TBC — Pág. 85',
                        pdfUrl: '',
                        pdfPage: 85
                      }
                    ]
                  },
                  {
                    id: 'r-tb-prev',
                    name: 'Prevenção & Biossegurança',
                    theme: 'icu',
                    objects: [
                      {
                        id: 'o-tb-n95',
                        type: 'tb_mascara_n95',
                        gx: 2,
                        gy: 3,
                        title: 'Máscara N95 / PFF2 (Precaução por Aerossóis)',
                        summary: 'Profissionais de saúde devem usar máscara N95/PFF2 ao atender paciente bacilífero em isolamento respiratório. Paciente usa cirúrgica no transporte.',
                        pdfLabel: 'Controle de Infecção — Pág. 15',
                        pdfUrl: '',
                        pdfPage: 15
                      },
                      {
                        id: 'o-tb-bcg',
                        type: 'tb_bcg',
                        gx: 4,
                        gy: 3,
                        title: 'Vacina BCG (Bacilo de Calmette-Guérin)',
                        summary: 'Dose única ao nascer (intradérmica no braço direito). Previne formas graves e disseminadas (meningite tuberculosa e TB miliar).',
                        pdfLabel: 'PNI Calendário Vacinal — Pág. 6',
                        pdfUrl: '',
                        pdfPage: 6
                      }
                    ]
                  },
                  {
                    id: 'r-tb-bib',
                    name: 'Bibliografia',
                    theme: 'library',
                    isBibliography: true,
                    pdfs: [
                      {
                        id: 'pdf-tb-1',
                        name: 'Manual de Recomendações para o Controle da Tuberculose no Brasil (Ministério da Saúde)',
                        sourceType: 'link',
                        url: 'https://www.gov.br/saude/pt-br'
                      }
                    ],
                    objects: []
                  }
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
        buildingType: 'city_academy',
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

export function migrateSavedBuildings(parsed) {
  if (!parsed || !Array.isArray(parsed.buildings)) return parsed;
  const legacyDefaults = {
    'b-cardio': 'city_tower',
    'b-pneumo': 'city_pavilion',
    'b-neuro': 'city_academy'
  };
  parsed.buildings.forEach((b, idx) => {
    if (!b.buildingType) {
      b.buildingType = legacyDefaults[b.id] || BUILDING_TYPES[idx % BUILDING_TYPES.length].id;
    }
    // Se algum prédio antigo ainda tinha coordenadas antigas sem lotId válido nos 12 lotes novos
    if (!CITY_LOTS.some((l) => l.id === b.lotId)) {
      b.lotId = CITY_LOTS[idx % CITY_LOTS.length].id;
    }
  });
  return parsed;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.customCatalog)) parsed.customCatalog = [];
    migrateSavedBuildings(parsed);
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
