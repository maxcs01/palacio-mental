// Catálogo reutilizável de objetos médicos em pixel art
export const OBJECT_CATALOG = [
  { id: 'xray', name: 'Máquina de Radiografia', icon: '🩻' },
  { id: 'ct', name: 'Tomógrafo', icon: '🌀' },
  { id: 'blood', name: 'Tubos de Sangue (Lab)', icon: '🧪' },
  { id: 'ausculta', name: 'Ausculta Pulmonar', icon: '🩺' },
  { id: 'monitor', name: 'Monitor Cardíaco', icon: '📈' },
  { id: 'meds', name: 'Bomba / Medicação', icon: '💊' },
  { id: 'bed', name: 'Leito / Maca', icon: '🛏️' },
  { id: 'book', name: 'Prontuário / Livro', icon: '📘' },
  { id: 'pdf', name: 'Arquivo PDF / Fonte', icon: '📄' }
];

// Lotes disponíveis na cidade para criar novos prédios
export const CITY_LOTS = [
  { id: 'lot-1', gx: 4, gy: 4, label: 'Lote Noroeste' },
  { id: 'lot-2', gx: 11, gy: 4, label: 'Lote Norte' },
  { id: 'lot-3', gx: 18, gy: 4, label: 'Lote Nordeste' },
  { id: 'lot-4', gx: 4, gy: 12, label: 'Lote Sudoeste' },
  { id: 'lot-5', gx: 18, gy: 12, label: 'Lote Sudeste' }
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
    decayThresholdDays: 14, // configurável pelo usuário
    buildings: [
      {
        id: 'b-cardio',
        name: 'Cardiologia',
        lotId: 'lot-1',
        color: '#ef4444',
        lastReviewedAt: daysAgoIso(1), // Novo
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
                  { id: 'r-endo-bib', name: 'Bibliografia', isBibliography: true, pdfs: [], objects: [] }
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
        lastReviewedAt: daysAgoIso(10), // Meio desgastado (exemplo visual)
        floors: [
          {
            id: 'f-infec',
            name: '1º Andar — Infecções Respiratórias',
            apartments: [
              {
                id: 'a-pnm',
                name: 'Pneumonia (PAC)',
                rooms: [
                  { id: 'r-pnm-def', name: 'Definição', objects: [] },
                  { id: 'r-pnm-epi', name: 'Epidemiologia', objects: [] },
                  { id: 'r-pnm-risco', name: 'Fatores de Risco', objects: [] },
                  {
                    id: 'r-pnm-diag',
                    name: 'Diagnóstico',
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
                  { id: 'r-pnm-tto', name: 'Tratamento', objects: [] },
                  { id: 'r-pnm-bib', name: 'Bibliografia', isBibliography: true, pdfs: [], objects: [] }
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
        lastReviewedAt: daysAgoIso(25), // Velho/acabado (exemplo visual)
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
                  { id: 'r-avc-bib', name: 'Bibliografia', isBibliography: true, pdfs: [], objects: [] }
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
    return JSON.parse(raw);
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
