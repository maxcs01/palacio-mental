// Cofre local de alta capacidade (IndexedDB) + Exportação e Restauração de Backup em 1 clique
// Evita estourar o limite de ~5 MB do localStorage ao salvar dezenas de sprites/folhas recortadas!

const VAULT_DB_NAME = 'thereds_vault_v1';
const VAULT_DB_VERSION = 1;
const STORE_SPRITES = 'sprites';
const STORE_SNAPSHOTS = 'snapshots';

let dbPromise = null;

function openVaultDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SPRITES)) {
          db.createObjectStore(STORE_SPRITES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((err) => {
      console.warn('IndexedDB indisponível:', err);
      return null;
    });
  }
  return dbPromise;
}

/**
 * Salva os sprites personalizados (dataUrl WebP/PNG) em alta capacidade no IndexedDB.
 */
export async function saveCustomSpritesToVault(customCatalog = []) {
  const db = await openVaultDb();
  if (!db || !Array.isArray(customCatalog)) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SPRITES, 'readwrite');
      const store = tx.objectStore(STORE_SPRITES);
      const validIds = new Set();

      customCatalog.forEach((item) => {
        if (!item?.id) return;
        validIds.add(item.id);
        if (item.thumb && typeof item.thumb === 'string') {
          store.put({
            id: item.id,
            thumb: item.thumb,
            updatedAt: Date.now()
          });
        }
      });

      // Remove órfãos apagados pelo usuário
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        (keysReq.result || []).forEach((k) => {
          if (!validIds.has(k)) store.delete(k);
        });
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Carrega todas as miniaturas de sprites armazenadas no IndexedDB.
 */
export async function loadCustomSpritesFromVault() {
  const db = await openVaultDb();
  if (!db) return new Map();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SPRITES, 'readonly');
      const req = tx.objectStore(STORE_SPRITES).getAll();
      req.onsuccess = () => {
        const map = new Map();
        (req.result || []).forEach((row) => {
          if (row?.id && row?.thumb) map.set(row.id, row.thumb);
        });
        resolve(map);
      };
      req.onerror = () => resolve(new Map());
    } catch {
      resolve(new Map());
    }
  });
}

/**
 * Grava cópia de segurança completa do estado atual no IndexedDB (sem limite de 5 MB).
 */
export async function saveWorldSnapshotToVault(state) {
  const db = await openVaultDb();
  if (!db || !state) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put(
        { savedAt: Date.now(), state: structuredCloneSafe(state) },
        'current'
      );
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function loadWorldSnapshotFromVault() {
  const db = await openVaultDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const req = tx.objectStore(STORE_SNAPSHOTS).get('current');
      req.onsuccess = () => resolve(req.result?.state || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function structuredCloneSafe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Restaura sprites offloaded do IndexedDB para state.customCatalog quando necessário.
 * Retorna true se algum sprite foi hidratado.
 */
export async function hydrateStateFromVault(state) {
  if (!state) return false;
  let changed = false;
  const spriteMap = await loadCustomSpritesFromVault();

  if (Array.isArray(state.customCatalog)) {
    state.customCatalog.forEach((item) => {
      if (item?.id && (!item.thumb || item.thumb.length < 16) && spriteMap.has(item.id)) {
        item.thumb = spriteMap.get(item.id);
        changed = true;
      }
    });
  }
  return changed;
}

/**
 * Calcula estatísticas de armazenamento real (localStorage + IndexedDB + conteúdo).
 */
export async function getStorageStats(state) {
  let localStorageBytes = 0;
  try {
    const raw = localStorage.getItem('palacio_mental_city_v1') || '';
    localStorageBytes = raw.length * 2;
  } catch {}

  const customItems = Array.isArray(state?.customCatalog) ? state.customCatalog : [];
  let spritesBytes = 0;
  const spriteMap = await loadCustomSpritesFromVault();
  customItems.forEach((item) => {
    const src = item.thumb || spriteMap.get(item.id) || '';
    spritesBytes += src.length;
  });

  let localPdfCount = 0;
  try {
    if (typeof indexedDB !== 'undefined') {
      localPdfCount = await new Promise((resolve) => {
        const req = indexedDB.open('palacio_mental_pdfs', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('files')) {
            req.result.createObjectStore('files');
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('files', 'readonly');
            const cReq = tx.objectStore('files').count();
            cReq.onsuccess = () => resolve(cReq.result || 0);
            cReq.onerror = () => resolve(0);
          } catch {
            resolve(0);
          }
        };
        req.onerror = () => resolve(0);
      });
    }
  } catch {}

  let apartmentsCount = 0;
  let roomsCount = 0;
  let objectsCount = 0;
  (state?.buildings || []).forEach((b) => {
    (b.floors || []).forEach((f) => {
      apartmentsCount += (f.apartments || []).length;
      (f.apartments || []).forEach((ap) => {
        roomsCount += (ap.rooms || []).length;
        (ap.rooms || []).forEach((rm) => {
          objectsCount += (rm.objects || []).length;
        });
      });
    });
  });

  return {
    localStorageBytes,
    spritesBytes,
    customSpriteCount: customItems.length,
    localPdfCount,
    buildingsCount: (state?.buildings || []).length,
    apartmentsCount,
    roomsCount,
    objectsCount
  };
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Monta arquivo JSON completo de backup (hidratando todas as imagens personalizadas).
 */
export async function buildBackupJson(state) {
  const clone = structuredCloneSafe(state);
  await hydrateStateFromVault(clone);
  const payload = {
    app: 'The Reds',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    state: clone
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Valida e extrai o estado de um arquivo JSON de backup.
 */
export function parseBackupJson(rawText) {
  const parsed = JSON.parse(String(rawText || ''));
  const candidate = parsed?.state && Array.isArray(parsed.state.buildings)
    ? parsed.state
    : Array.isArray(parsed?.buildings)
      ? parsed
      : null;

  if (!candidate || !Array.isArray(candidate.buildings)) {
    throw new Error('Arquivo inválido: não contém dados de prédios do The Reds.');
  }

  if (!Array.isArray(candidate.customCatalog)) candidate.customCatalog = [];
  if (typeof candidate.decayThresholdDays !== 'number') candidate.decayThresholdDays = 14;
  return candidate;
}
