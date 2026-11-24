// Desenho Isométrico 2.5D Ilustrado (Cidade Viva Isométrica + Cache GPU Leve + Contorno Limpo)
import { ROOM_THEMES, CITY_GRID, cityIso } from './data.js';
import { applyContourMattingToImageData, autoCropTransparentCanvas } from './sheetSlicer.js';

export const INK = '#2b2520';

// ---------------- TEXTURA ORGÂNICA COMPARTILHADA ----------------
let grainPatternCache = null;
function getPaperGrainPattern(ctx) {
  if (grainPatternCache) return grainPatternCache;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = c.getContext('2d');
  for (let i = 0; i < 420; i++) {
    const x = (i * 37) % 96;
    const y = (i * 53 + Math.floor(i / 7) * 11) % 96;
    const dark = i % 3 === 0;
    g.fillStyle = dark ? 'rgba(65, 52, 38, 0.035)' : 'rgba(255, 252, 244, 0.045)';
    g.fillRect(x, y, (i % 2) + 1, (i % 2) + 1);
  }
  grainPatternCache = ctx.createPattern(c, 'repeat');
  return grainPatternCache;
}

export function getRoomTheme(themeId) {
  return ROOM_THEMES.find((t) => t.id === themeId) || ROOM_THEMES[0];
}

export function drawIsoBox(ctx, cx, cy, w, d, h, topCol, leftCol, rightCol, stroke = INK) {
  const hw = w / 2;
  const hd = d / 2;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;

  // Face esquerda
  ctx.fillStyle = leftCol;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - h);
  ctx.lineTo(cx, cy + hd - h);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Face direita
  ctx.fillStyle = rightCol;
  ctx.beginPath();
  ctx.moveTo(cx, cy + hd - h);
  ctx.lineTo(cx + hw, cy - h);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hd);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Topo
  ctx.fillStyle = topCol;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hd - h);
  ctx.lineTo(cx + hw, cy - h);
  ctx.lineTo(cx, cy + hd - h);
  ctx.lineTo(cx - hw, cy - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------- SPRITES ILUSTRADOS HD (MÓVEIS + CIDADE) ----------------
export const SPRITE_URLS = {
  bed: '/assets/bed.jpg',
  monitor: '/assets/monitor.jpg',
  ct: '/assets/ct.jpg',
  xray: '/assets/xray.jpg',
  blood: '/assets/blood.jpg',
  ausculta: '/assets/ausculta.jpg',
  meds: '/assets/meds.jpg',
  book: '/assets/book.jpg',
  pdf: '/assets/pdf.jpg',
  ivstand: '/assets/ivstand.jpg',
  oxygen: '/assets/oxygen.jpg',
  microscope: '/assets/microscope.jpg',
  skeleton: '/assets/skeleton.jpg',
  desk: '/assets/desk.jpg',
  whiteboard: '/assets/whiteboard.jpg',
  screen: '/assets/screen.jpg',
  plant: '/assets/plant.jpg',
  trophy: '/assets/trophy.jpg',
  tb_bacilos: '/assets/tb_bacilos.png',
  tb_microscopio: '/assets/tb_microscopio.png',
  tb_rif: '/assets/tb_rif.png',
  tb_inh: '/assets/tb_inh.png',
  tb_pza_emb: '/assets/tb_pza_emb.png',
  tb_emb_caixa: '/assets/tb_emb_caixa.png',
  tb_bacterias: '/assets/tb_bacterias.png',
  tb_raiox: '/assets/tb_raiox.png',
  tb_ltmp: '/assets/tb_ltmp.png',
  tb_mascara_cirurgica: '/assets/tb_mascara_cirurgica.png',
  tb_mascara_n95: '/assets/tb_mascara_n95.png',
  tb_pulmao: '/assets/tb_pulmao.png',
  tb_ppd: '/assets/tb_ppd.png',
  tb_esputo: '/assets/tb_esputo.png',
  tb_bcg: '/assets/tb_bcg.png',
  tb_cartilha: '/assets/tb_cartilha.png',
  city_hospital: '/assets/city-hospital.jpg',
  city_tower: '/assets/city-tower.png',
  city_academy: '/assets/city-academy.png',
  city_lab: '/assets/city-lab.png',
  city_clinic: '/assets/city-clinic.png',
  city_pavilion: '/assets/city-pavilion.png',
  city_citadel: '/assets/city-citadel.png',
  city_museum: '/assets/city-museum.jpg',
  city_house: '/assets/city-house.jpg',
  city_tree: '/assets/city-tree.jpg'
};

const CITY_SPRITE_KEYS = new Set([
  'city_hospital',
  'city_tower',
  'city_academy',
  'city_lab',
  'city_clinic',
  'city_pavilion',
  'city_citadel',
  'city_museum',
  'city_house',
  'city_tree'
]);

const SPRITE_TUNING = {
  bed: { scale: 1.44, yLift: 0.24, shadowRx: 0.42, shadowRy: 0.20 },
  ct: { scale: 1.38, yLift: 0.24, shadowRx: 0.40, shadowRy: 0.20 },
  ausculta: { scale: 1.24, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  meds: { scale: 1.22, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  monitor: { scale: 1.20, yLift: 0.20, shadowRx: 0.28, shadowRy: 0.14 },
  xray: { scale: 1.18, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  blood: { scale: 1.18, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  pdf: { scale: 1.18, yLift: 0.22, shadowRx: 0.34, shadowRy: 0.17 },
  book: { scale: 1.06, yLift: 0.20, shadowRx: 0.30, shadowRy: 0.15 },
  ivstand: { scale: 1.26, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 },
  oxygen: { scale: 1.18, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 },
  microscope: { scale: 1.16, yLift: 0.22, shadowRx: 0.30, shadowRy: 0.15 },
  skeleton: { scale: 1.32, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 },
  desk: { scale: 1.36, yLift: 0.24, shadowRx: 0.40, shadowRy: 0.20 },
  whiteboard: { scale: 1.32, yLift: 0.22, shadowRx: 0.34, shadowRy: 0.17 },
  screen: { scale: 1.36, yLift: 0.24, shadowRx: 0.38, shadowRy: 0.18 },
  plant: { scale: 1.14, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 },
  trophy: { scale: 1.16, yLift: 0.20, shadowRx: 0.28, shadowRy: 0.14 },
  tb_bacilos: { scale: 1.25, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  tb_microscopio: { scale: 1.28, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  tb_rif: { scale: 1.30, yLift: 0.24, shadowRx: 0.38, shadowRy: 0.19 },
  tb_inh: { scale: 1.15, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 },
  tb_pza_emb: { scale: 1.30, yLift: 0.24, shadowRx: 0.38, shadowRy: 0.19 },
  tb_emb_caixa: { scale: 1.18, yLift: 0.22, shadowRx: 0.28, shadowRy: 0.14 },
  tb_bacterias: { scale: 1.32, yLift: 0.20, shadowRx: 0.40, shadowRy: 0.20 },
  tb_raiox: { scale: 1.25, yLift: 0.22, shadowRx: 0.34, shadowRy: 0.17 },
  tb_ltmp: { scale: 1.25, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  tb_mascara_cirurgica: { scale: 1.18, yLift: 0.20, shadowRx: 0.30, shadowRy: 0.15 },
  tb_mascara_n95: { scale: 1.18, yLift: 0.20, shadowRx: 0.28, shadowRy: 0.14 },
  tb_pulmao: { scale: 1.35, yLift: 0.24, shadowRx: 0.40, shadowRy: 0.20 },
  tb_ppd: { scale: 1.35, yLift: 0.24, shadowRx: 0.42, shadowRy: 0.21 },
  tb_esputo: { scale: 1.25, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  tb_bcg: { scale: 1.20, yLift: 0.22, shadowRx: 0.30, shadowRy: 0.15 },
  tb_cartilha: { scale: 1.18, yLift: 0.20, shadowRx: 0.26, shadowRy: 0.13 }
};

const spriteCache = {};
const variantCache = new Map();
let spriteReadyListener = null;

export function setOnSpriteReady(fn) {
  spriteReadyListener = fn;
}

function notifySpriteReady() {
  if (typeof spriteReadyListener === 'function') spriteReadyListener();
}

/**
 * Gera e guarda em cache uma variante de cor (noite, desgastado, velho, murcho) UMA ÚNICA VEZ em CPU,
 * eliminando 100% o uso de ctx.filter (que trava a placa de vídeo no Canvas 2D!).
 */
function getSpriteVariant(key, variant = 'day') {
  const base = spriteCache[key];
  if (!base) return null;
  if (!variant || variant === 'day') return base;

  const cacheKey = `${key}__${variant}`;
  if (variantCache.has(cacheKey)) return variantCache.get(cacheKey);

  const bw = base.naturalWidth || base.width || 128;
  const bh = base.naturalHeight || base.height || 128;
  const scale = Math.min(1, 260 / Math.max(bw, bh));
  const w = Math.max(16, Math.round(bw * scale));
  const h = Math.max(16, Math.round(bh * scale));

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(base, 0, 0, w, h);

  try {
    const imgData = g.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i], gr = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * gr + 0.114 * b;

      if (variant === 'worn') {
        r = (r * 0.65 + lum * 0.35) * 0.93;
        gr = (gr * 0.65 + lum * 0.35) * 0.93;
        b = (b * 0.65 + lum * 0.35) * 0.93;
      } else if (variant === 'old') {
        r = (r * 0.28 + lum * 0.72) * 0.82;
        gr = (gr * 0.28 + lum * 0.72) * 0.82;
        b = (b * 0.28 + lum * 0.72) * 0.82;
      } else if (variant === 'night') {
        r = r * 0.78;
        gr = gr * 0.83;
        b = Math.min(255, b * 0.92 + 6);
      } else if (variant === 'wilted') {
        r = Math.min(255, (r * 0.5 + lum * 0.5) * 0.95 + 14);
        gr = (gr * 0.55 + lum * 0.45) * 0.86;
        b = (b * 0.45 + lum * 0.55) * 0.72;
      }
      d[i] = r;
      d[i + 1] = gr;
      d[i + 2] = b;
    }
    g.putImageData(imgData, 0, 0);
  } catch {}

  variantCache.set(cacheKey, c);
  return c;
}

/**
 * Recorta sprites individuais preservando proporção real e respeitando o contorno com Sobel + Defringe!
 */
export function processIllustratedSprite(img, skipInnerHoles = false, customOpts = {}) {
  const rawW = img.naturalWidth || img.width || 512;
  const rawH = img.naturalHeight || img.height || 512;
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(rawW, rawH));
  const w = Math.max(32, Math.round(rawW * scale));
  const h = Math.max(32, Math.round(rawH * scale));

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0, w, h);

  const imgData = octx.getImageData(0, 0, w, h);
  applyContourMattingToImageData(imgData, w, h, {
    tolerance: customOpts.tolerance ?? 26,
    edgeStrength: customOpts.edgeStrength ?? 38,
    defringe: customOpts.defringe ?? true,
    skipInnerHoles
  });
  octx.putImageData(imgData, 0, 0);

  return autoCropTransparentCanvas(off, 4);
}

Object.entries(SPRITE_URLS).forEach(([key, url]) => {
  const img = new Image();
  img.onload = () => {
    try {
      if (url.endsWith('.png')) {
        spriteCache[key] = img;
      } else {
        spriteCache[key] = processIllustratedSprite(img, CITY_SPRITE_KEYS.has(key));
      }
    } catch {
      spriteCache[key] = img;
    }
    variantCache.clear();
    notifySpriteReady();
  };
  img.src = url;
});

// Converte canvas recortado para dataURL compacto (WebP/PNG transparente) para salvar no catálogo e nuvem
export function exportSpriteToDataUrl(sourceCanvas, maxDim = 256) {
  const w = sourceCanvas.width || maxDim;
  const h = sourceCanvas.height || maxDim;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.max(32, Math.round(w * scale));
  out.height = Math.max(32, Math.round(h * scale));
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(sourceCanvas, 0, 0, out.width, out.height);
  try {
    const webp = out.toDataURL('image/webp', 0.86);
    if (webp.startsWith('data:image/webp')) return webp;
  } catch {}
  return out.toDataURL('image/png');
}

// Registra sprites personalizados salvos pelo usuário (gerados com IA, mnemônicos ou enviados)
const customLoadedSrc = new Map();
export function registerCustomSprites(customCatalog = []) {
  if (!Array.isArray(customCatalog)) return;
  customCatalog.forEach((item) => {
    if (!item || !item.id || !item.thumb) return;
    if (customLoadedSrc.get(item.id) === item.thumb && spriteCache[item.id]) return;
    customLoadedSrc.set(item.id, item.thumb);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Se já for PNG/WebP transparente salvo pelo nosso processador, usa direto; senão remove fundo branco
      if (item.preprocessed || item.thumb.startsWith('data:image/webp') || item.thumb.startsWith('data:image/png')) {
        spriteCache[item.id] = img;
      } else {
        try {
          spriteCache[item.id] = processIllustratedSprite(img, false);
        } catch {
          spriteCache[item.id] = img;
        }
      }
      notifySpriteReady();
    };
    img.src = item.thumb;
  });
}

// Gerador instantâneo (offline) de Objetos Mnemônicos 2.5D ilustrados (ex: palavra "CIPRO" feita de flores!)
export function createMnemonicSpriteCanvas({
  word = 'CIPRO',
  emoji = '🌸',
  style = 'floral-word',
  accentColor = '#e07a5f'
} = {}) {
  const size = 384;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const cleanWord = (word || 'MNEM').trim().toUpperCase().slice(0, 12);
  const cx = size / 2;

  if (style === 'floral-word') {
    // Pedestal isométrico creme/oliva com a palavra em letras 3D cobertas de ícones/flores
    drawIsoBox(ctx, cx, 316, 250, 96, 28, '#f5efe2', '#e4d8c0', '#cbbba0', INK);
    drawIsoBox(ctx, cx, 290, 224, 82, 12, '#7d9b6f', '#648257', '#4f6b44', INK);

    // Folhagem / aura orgânica atrás da palavra
    ctx.save();
    ctx.translate(cx, 206);
    ctx.transform(1, -0.18, 0, 1, 0, 0); // leve inclinação isométrica 2.5D!

    const fontSize = cleanWord.length <= 5 ? 74 : cleanWord.length <= 8 ? 56 : 44;
    ctx.font = `900 ${fontSize}px system-ui, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Extrusão 3D das letras
    for (let d = 12; d >= 1; d--) {
      ctx.fillStyle = d === 12 ? INK : '#5c4b3c';
      ctx.fillText(cleanWord, d * 0.7, d * 0.9);
    }

    // Contorno escuro grosso + preenchimento colorido
    ctx.lineWidth = 10;
    ctx.strokeStyle = INK;
    ctx.strokeText(cleanWord, 0, 0);

    const grad = ctx.createLinearGradient(0, -45, 0, 45);
    grad.addColorStop(0, '#fff9ec');
    grad.addColorStop(0.55, accentColor);
    grad.addColorStop(1, '#587854');
    ctx.fillStyle = grad;
    ctx.fillText(cleanWord, 0, 0);

    // Decora com flores / símbolos ao redor das letras (como "palavra feita de flores"!)
    const decoPoints = [
      [-92, -32, 34], [-42, -46, 30], [10, -44, 34], [64, -38, 30], [102, -16, 32],
      [-86, 24, 28], [-22, 32, 32], [44, 28, 30], [92, 22, 26], [0, -8, 28]
    ];
    decoPoints.forEach(([px, py, fs]) => {
      ctx.font = `${fs}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(emoji || '🌸', px, py);
    });
    ctx.restore();
  } else if (style === 'bottle') {
    // Frasco de medicamento gigante ilustrado 2.5D com rótulo e ícone mnemônico
    drawIsoBox(ctx, cx, 326, 178, 76, 18, '#e8dfd0', '#d5c7b1', '#beae96', INK);

    // Corpo do frasco
    ctx.fillStyle = '#f8f5ec';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(cx - 72, 118, 144, 188, 28);
    ctx.fill();
    ctx.stroke();

    // Sombra lateral direita do frasco
    ctx.fillStyle = 'rgba(43, 37, 32, 0.10)';
    ctx.beginPath();
    ctx.roundRect(cx + 12, 122, 56, 180, [0, 24, 24, 0]);
    ctx.fill();

    // Tampa colorida
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(cx - 56, 76, 112, 46, 14);
    ctx.fill();
    ctx.stroke();

    // Rótulo central com ícone + nome
    ctx.fillStyle = '#fffdf7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - 62, 152, 124, 118, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.fillRect(cx - 60, 154, 120, 22);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '50px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText(emoji || '💊', cx, 206);

    const fs = cleanWord.length <= 6 ? 24 : cleanWord.length <= 9 ? 19 : 15;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(cleanWord, cx, 248);
  } else {
    // Totem / Estátua Mnemônica 2.5D (ícone gigante + placa na base)
    drawIsoBox(ctx, cx, 324, 210, 88, 34, '#f2ead8', '#dfd2ba', '#c8b89b', INK);

    // Medalhão ilustrado no topo
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, 174, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#faf6eb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, 174, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '86px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText(emoji || '🧠', cx, 176);

    // Faixa com palavra na base
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(cx - 104, 246, 208, 48, 14);
    ctx.fill();
    ctx.stroke();

    const fs = cleanWord.length <= 7 ? 26 : 20;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = '#fef9c3';
    ctx.fillText(cleanWord, cx, 271);
  }

  return c;
}

function drawCroppedSpriteAt(ctx, sp, cx, bottomY, maxSize) {
  const ratio = (sp.width || 1) / (sp.height || 1);
  let dw, dh;
  if (ratio >= 1) {
    dw = maxSize;
    dh = maxSize / ratio;
  } else {
    dh = maxSize;
    dw = maxSize * ratio;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(sp, cx - dw / 2, bottomY - dh, dw, dh);
  return { dw, dh };
}

// ---------------- CIDADE ISOMÉTRICA 2.5D COM CACHE ESTÁTICO DE GPU ----------------
function traceIsoQuad(ctx, u1, v1, u2, v2) {
  const p1 = cityIso(u1, v1);
  const p2 = cityIso(u2, v1);
  const p3 = cityIso(u2, v2);
  const p4 = cityIso(u1, v2);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
}

function drawIsoQuad(ctx, u1, v1, u2, v2, fill, stroke = null, lineWidth = 1.4) {
  traceIsoQuad(ctx, u1, v1, u2, v2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Cache offscreen do mapa base da cidade (evita redesenhar 350+ vetores/gradientes a cada frame!)
let cityStaticCanvas = null;
let cityStaticKey = '';

function getOrBuildCityStaticLayer(WORLD_W, WORLD_H, isNight, hasFountain, hasPier) {
  const nextKey = `${WORLD_W}x${WORLD_H}_${isNight ? 1 : 0}_${hasFountain ? 1 : 0}_${hasPier ? 1 : 0}`;
  if (cityStaticCanvas && cityStaticKey === nextKey) {
    return cityStaticCanvas;
  }

  const off = document.createElement('canvas');
  off.width = WORLD_W;
  off.height = WORLD_H;
  const ctx = off.getContext('2d');
  const grain = getPaperGrainPattern(ctx);
  const cols = CITY_GRID.cols;
  const rows = CITY_GRID.rows;

  // 1. Mar + Horizonte ilustrado
  const bgGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  if (isNight) {
    bgGrad.addColorStop(0, '#0c1629');
    bgGrad.addColorStop(0.28, '#132742');
    bgGrad.addColorStop(0.55, '#12314a');
    bgGrad.addColorStop(1, '#091a2c');
  } else {
    bgGrad.addColorStop(0, '#a8d8ee');
    bgGrad.addColorStop(0.24, '#d8eef2');
    bgGrad.addColorStop(0.45, '#6fc0d4');
    bgGrad.addColorStop(1, '#3a86ab');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Ondinhas decorativas leves no mar
  ctx.strokeStyle = isNight ? 'rgba(186, 230, 253, 0.20)' : 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const wx = ((i * 137) % (WORLD_W - 140)) + 50;
    const wy = 480 + ((i * 97) % (WORLD_H - 520));
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 18, wy - 4, wx + 36, wy);
    ctx.stroke();
  }

  // 2. Cadeia de montanhas ilustradas
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  const mountainPeaks = [
    cityIso(0, 12.5), cityIso(0, 9.2), cityIso(0, 6.0), cityIso(0, 2.8),
    cityIso(0.5, 0), cityIso(3.5, 0), cityIso(6.8, 0), cityIso(10.2, 0),
    cityIso(13.6, 0), cityIso(16.8, 0), cityIso(19.2, 0)
  ];
  mountainPeaks.forEach((mp, idx) => {
    const mw = 148 + (idx % 3) * 18;
    const mh = 86 + (idx % 3) * 20;
    const baseY = mp.y + 18;
    const mx = mp.x - mw * 0.5;

    ctx.fillStyle = isNight ? '#2b3f52' : '#6c8b7b';
    ctx.beginPath();
    ctx.moveTo(mx, baseY);
    ctx.lineTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isNight ? 'rgba(15,23,42,0.34)' : 'rgba(43,37,32,0.14)';
    ctx.beginPath();
    ctx.moveTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw, baseY);
    ctx.lineTo(mx + mw * 0.54, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isNight ? '#cbd5e1' : '#f7f4ea';
    ctx.beginPath();
    ctx.moveTo(mx + mw * 0.34, baseY - mh * 0.67);
    ctx.lineTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw * 0.66, baseY - mh * 0.67);
    ctx.lineTo(mx + mw * 0.55, baseY - mh * 0.58);
    ctx.lineTo(mx + mw * 0.45, baseY - mh * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 3. Faixa de areia + falésia 3D da ilha
  const pRight = cityIso(cols, 0);
  const pBottom = cityIso(cols, rows);
  const pLeft = cityIso(0, rows);
  const slabH = 24;

  drawIsoQuad(ctx, -0.35, rows, cols + 0.9, rows + 1.05, isNight ? '#594e3f' : '#ecd9ae', INK, 1.5);
  drawIsoQuad(ctx, cols, -0.35, cols + 0.9, rows + 1.05, isNight ? '#4f4537' : '#e4cf9f', INK, 1.5);

  ctx.strokeStyle = isNight ? 'rgba(186, 230, 253, 0.30)' : 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 2.4;
  const beachSW = cityIso(-0.35, rows + 1.05);
  const beachS = cityIso(cols + 0.9, rows + 1.05);
  const beachSE = cityIso(cols + 0.9, -0.35);
  ctx.beginPath();
  ctx.moveTo(beachSW.x, beachSW.y + 4);
  ctx.lineTo(beachS.x, beachS.y + 4);
  ctx.lineTo(beachSE.x, beachSE.y + 4);
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = isNight ? '#4a3d31' : '#a9855d';
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pBottom.x, pBottom.y + slabH);
  ctx.lineTo(pLeft.x, pLeft.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isNight ? '#3a2f25' : '#8d6c49';
  ctx.beginPath();
  ctx.moveTo(pBottom.x, pBottom.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(pRight.x, pRight.y + slabH);
  ctx.lineTo(pBottom.x, pBottom.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawIsoQuad(ctx, 0, 0, cols, rows, isNight ? '#21372e' : '#8cb476', INK, 1.8);
  if (grain) {
    traceIsoQuad(ctx, 0, 0, cols, rows);
    ctx.fillStyle = grain;
    ctx.fill();
  }

  // 4. Avenidas Isométricas
  const roadColor = isNight ? '#273244' : '#596678';
  const sidewalkColor = isNight ? '#475569' : '#e8e0cd';
  const uRoads = [5, 10, 15];
  const vRoads = [5, 10];

  uRoads.forEach((ru) => drawIsoQuad(ctx, ru - 0.16, 0, ru + 1.16, rows, sidewalkColor));
  vRoads.forEach((rv) => drawIsoQuad(ctx, 0, rv - 0.16, cols, rv + 1.16, sidewalkColor));
  uRoads.forEach((ru) => drawIsoQuad(ctx, ru, 0, ru + 1, rows, roadColor));
  vRoads.forEach((rv) => drawIsoQuad(ctx, 0, rv, cols, rv + 1, roadColor));

  ctx.strokeStyle = isNight ? 'rgba(253, 224, 71, 0.55)' : 'rgba(248, 245, 232, 0.72)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([10, 10]);
  uRoads.forEach((ru) => {
    const a = cityIso(ru + 0.5, 0.25);
    const b = cityIso(ru + 0.5, rows - 0.25);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  vRoads.forEach((rv) => {
    const a = cityIso(0.25, rv + 0.5);
    const b = cityIso(cols - 0.25, rv + 0.5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  uRoads.forEach((ru) => {
    vRoads.forEach((rv) => {
      drawIsoQuad(ctx, ru, rv, ru + 1, rv + 1, roadColor);
      ctx.strokeStyle = 'rgba(248, 245, 232, 0.85)';
      ctx.lineWidth = 2.2;
      for (let s = 0; s < 4; s++) {
        const offS = 0.2 + s * 0.2;
        const c1 = cityIso(ru + offS, rv - 0.14);
        const c2 = cityIso(ru + offS, rv - 0.02);
        const c3 = cityIso(ru - 0.14, rv + offS);
        const c4 = cityIso(ru - 0.02, rv + offS);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
        ctx.moveTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y);
        ctx.stroke();
      }
    });
  });

  // 5. 12 Quadras Isométricas Organizadas
  const uBlocks = [[0.18, 4.82], [6.18, 9.82], [11.18, 14.82], [16.18, 19.82]];
  const vBlocks = [[0.18, 4.82], [6.18, 9.82], [11.18, 14.82]];

  uBlocks.forEach(([u1, u2], bi) => {
    vBlocks.forEach(([v1, v2], bj) => {
      drawIsoQuad(ctx, u1, v1, u2, v2, sidewalkColor, INK, 1.3);
      if (bi === 1 && bj === 1) {
        drawIsoQuad(ctx, u1 + 0.18, v1 + 0.18, u2 - 0.18, v2 - 0.18, isNight ? '#334155' : '#ede6d5', INK, 1.1);
        drawIsoQuad(ctx, u1 + 0.42, v1 + 0.42, u2 - 0.42, v2 - 0.42, isNight ? '#1f4033' : '#8fd182', INK, 1.1);
      } else {
        const lawn = isNight ? '#243e33' : ((bi + bj) % 2 === 0 ? '#97bd82' : '#8fb67a');
        drawIsoQuad(ctx, u1 + 0.22, v1 + 0.22, u2 - 0.22, v2 - 0.22, lawn, 'rgba(43,37,32,0.22)', 1);
      }
    });
  });

  // 6. Praça Central (lago, bacia da fonte e bancos)
  const pondC = cityIso(8.15, 8.15);
  ctx.fillStyle = isNight ? '#475569' : '#d6ccb8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(pondC.x, pondC.y, 44, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const pondGrad = ctx.createRadialGradient(pondC.x - 10, pondC.y - 6, 4, pondC.x, pondC.y, 42);
  if (isNight) {
    pondGrad.addColorStop(0, '#1d4e6f');
    pondGrad.addColorStop(1, '#12324a');
  } else {
    pondGrad.addColorStop(0, '#8dd8ee');
    pondGrad.addColorStop(1, '#4ea8c7');
  }
  ctx.fillStyle = pondGrad;
  ctx.beginPath();
  ctx.ellipse(pondC.x, pondC.y, 38, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pondC.x - 16, pondC.y - 4);
  ctx.quadraticCurveTo(pondC.x - 4, pondC.y - 7, pondC.x + 8, pondC.y - 4);
  ctx.stroke();

  if (hasFountain) {
    const fc = cityIso(7.1, 7.1);
    ctx.fillStyle = '#e8e0ce';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(fc.x, fc.y, 16, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.ellipse(fc.x, fc.y, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  [[6.9, 9.0], [9.1, 6.9]].forEach(([bu, bv]) => {
    const bp = cityIso(bu, bv);
    drawIsoBox(ctx, bp.x, bp.y + 2, 18, 9, 5, '#b68153', '#96653d', '#7b5130', INK);
  });

  // 7. Deck de madeira do Pier (estático)
  if (hasPier) {
    drawIsoQuad(ctx, 9.6, rows + 0.3, 10.6, rows + 2.2, '#a47148', INK, 1.4);
    for (let s = 0.6; s <= 2.0; s += 0.35) {
      const a = cityIso(9.6, rows + s);
      const b = cityIso(10.6, rows + s);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // 8. Postes de luz e caixas dos semáforos
  [[5.0, 5.0], [10.0, 5.0], [10.0, 10.0]].forEach(([su, sv]) => {
    const sp = cityIso(su - 0.12, sv - 0.12);
    ctx.fillStyle = '#2b2520';
    ctx.beginPath();
    ctx.roundRect(sp.x - 5, sp.y - 24, 10, 20, 3);
    ctx.fill();
  });

  [
    [4.85, 2.5], [10.0, 2.5], [15.0, 2.5],
    [4.85, 7.8], [15.0, 7.8],
    [4.85, 12.6], [10.0, 12.6], [15.0, 12.6]
  ].forEach(([lu, lv]) => {
    const lp = cityIso(lu, lv);
    if (isNight) {
      const glow = ctx.createRadialGradient(lp.x, lp.y - 16, 2, lp.x, lp.y - 10, 38);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
      glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y - 10, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y + 2);
    ctx.lineTo(lp.x, lp.y - 16);
    ctx.stroke();
    ctx.fillStyle = isNight ? '#fef08a' : '#f8f5ec';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y - 18, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  cityStaticCanvas = off;
  cityStaticKey = nextKey;
  return off;
}

export function drawIllustratedCityLandscape(ctx, WORLD_W, WORLD_H, _TILE, { isNight, trafficLightGreen, now, ducks, hasFountain, hasPier, ecoMode = false }) {
  ctx.save();
  const staticLayer = getOrBuildCityStaticLayer(WORLD_W, WORLD_H, isNight, hasFountain, hasPier);
  ctx.drawImage(staticLayer, 0, 0);

  const rows = CITY_GRID.rows;
  const animNow = ecoMode ? 0 : now;

  // Detalhes levíssimos (patinhos, jato da fonte, barquinho e luzes do semáforo)
  ducks.forEach((d) => {
    const dp = cityIso(d.u, d.v);
    const dy = dp.y + (ecoMode ? 0 : Math.sin(d.angle) * 2);
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(dp.x, dy, 4.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f97316';
    ctx.fillRect(dp.x + 3.2, dy - 1, 2.2, 1.8);
  });

  if (hasFountain) {
    const fc = cityIso(7.1, 7.1);
    const spH = 9 + (ecoMode ? 0 : Math.sin(animNow * 0.006) * 2.5);
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fc.x, fc.y);
    ctx.lineTo(fc.x, fc.y - spH);
    ctx.stroke();
  }

  if (hasPier) {
    const boatP = cityIso(11.3, rows + 2.1);
    const boatY = boatP.y + (ecoMode ? 0 : Math.sin(animNow * 0.003) * 2.5);
    ctx.fillStyle = '#f8f5ec';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(boatP.x - 14, boatY);
    ctx.lineTo(boatP.x + 14, boatY);
    ctx.lineTo(boatP.x + 9, boatY + 8);
    ctx.lineTo(boatP.x - 9, boatY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(boatP.x, boatY - 2);
    ctx.lineTo(boatP.x, boatY - 20);
    ctx.lineTo(boatP.x + 12, boatY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  [[5.0, 5.0], [10.0, 5.0], [10.0, 10.0]].forEach(([su, sv]) => {
    const sp = cityIso(su - 0.12, sv - 0.12);
    ctx.fillStyle = trafficLightGreen ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y - 18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = trafficLightGreen ? '#14532d' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y - 10, 2.8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// Lote livre isométrico (clicável para construir novo prédio!)
export function drawIsoLotEmpty(ctx, u, v, isNight = false) {
  ctx.save();
  const r = 0.92;
  traceIsoQuad(ctx, u - r, v - r, u + r, v + r);
  ctx.fillStyle = isNight ? 'rgba(248, 245, 232, 0.10)' : 'rgba(248, 245, 232, 0.34)';
  ctx.fill();
  ctx.strokeStyle = isNight ? 'rgba(226, 232, 240, 0.45)' : 'rgba(43, 37, 32, 0.50)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  const c = cityIso(u, v);
  ctx.fillStyle = isNight ? 'rgba(226, 232, 240, 0.80)' : 'rgba(43, 37, 32, 0.78)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('＋ Lote Livre', c.x, c.y + 3);
  ctx.restore();
}

const BUILDING_SIZE_TUNING = {
  city_hospital: 102,
  city_tower: 108,
  city_academy: 104,
  city_lab: 102,
  city_clinic: 104,
  city_pavilion: 104,
  city_citadel: 110
};

export function drawPixelBuilding(ctx, u, v, baseColor, condition, isNight, label, buildingType = 'city_hospital') {
  ctx.save();
  const c = cityIso(u, v);

  // Fundação isométrica firme no terreno
  const padR = 1.02;
  drawIsoQuad(
    ctx,
    u - padR,
    v - padR,
    u + padR,
    v + padR,
    isNight ? '#334155' : '#e5ddc8',
    baseColor || '#38bdf8',
    2
  );
  drawIsoQuad(
    ctx,
    u - 0.80,
    v - 0.80,
    u + 0.88,
    v + 0.88,
    'rgba(24, 20, 16, 0.16)'
  );

  const bottomY = c.y + 35;
  const spriteKey = SPRITE_URLS[buildingType] ? buildingType : 'city_hospital';
  const variant =
    condition === 'worn' ? 'worn' : condition === 'old' ? 'old' : isNight ? 'night' : 'day';
  const sp = getSpriteVariant(spriteKey, variant);
  const maxSize = BUILDING_SIZE_TUNING[spriteKey] || 102;

  if (sp) {
    drawCroppedSpriteAt(ctx, sp, c.x, bottomY, maxSize);

    if (condition === 'old') {
      ctx.fillStyle = '#536e4b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      [[-24, -6, 9, 5], [22, -7, 9, 4], [-6, -2, 8, 4]].forEach(([ox, oy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(c.x + ox, bottomY + oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  } else {
    drawIsoBox(ctx, c.x, bottomY - 12, 72, 36, 44, '#f8f6ef', '#ede9dd', '#d6d1c4', INK);
  }

  // Placa compacta da especialidade acima do telhado
  const condCol = condition === 'new' ? '#22c55e' : condition === 'worn' ? '#f59e0b' : '#ef4444';
  ctx.font = 'bold 10.5px system-ui, sans-serif';
  const textW = ctx.measureText(label).width;
  const tagW = Math.max(82, textW + 30);
  const tagY = bottomY - (maxSize + 10);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = baseColor || '#94a3b8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(c.x - tagW / 2, tagY, tagW, 20, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = condCol;
  ctx.beginPath();
  ctx.arc(c.x - tagW / 2 + 10, tagY + 10, 3.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.fillText(label, c.x - tagW / 2 + 18, tagY + 14);

  ctx.restore();
}

export function drawHouse(ctx, u, v, roofColor, isNight) {
  ctx.save();
  const c = cityIso(u, v);

  const r = 0.62;
  drawIsoQuad(ctx, u - r, v - r, u + r, v + r, isNight ? '#2d3c36' : '#ddd4be', 'rgba(43,37,32,0.28)', 1.1);
  drawIsoQuad(ctx, u - 0.50, v - 0.50, u + 0.56, v + 0.56, 'rgba(24, 20, 16, 0.14)');

  const bottomY = c.y + 21;
  const sp = getSpriteVariant('city_house', isNight ? 'night' : 'day');
  if (sp) {
    drawCroppedSpriteAt(ctx, sp, c.x, bottomY, 64);
  } else {
    drawIsoBox(ctx, c.x, bottomY - 6, 36, 18, 20, '#f1ede4', '#e8e2d5', '#d6cfc0', INK);
    drawIsoBox(ctx, c.x, bottomY - 26, 40, 20, 6, roofColor || '#d97b48', roofColor || '#d97b48', '#334155', INK);
  }
  ctx.restore();
}

export function drawMuseum(ctx, u, v, isNight) {
  ctx.save();
  const c = cityIso(u, v);

  const r = 1.05;
  drawIsoQuad(ctx, u - r, v - r, u + r, v + r, isNight ? '#3b4252' : '#efe7d2', '#f59e0b', 1.8);
  drawIsoQuad(ctx, u - 0.82, v - 0.82, u + 0.88, v + 0.88, 'rgba(24, 20, 16, 0.16)');

  const bottomY = c.y + 34;
  const sp = getSpriteVariant('city_museum', isNight ? 'night' : 'day');
  if (sp) {
    drawCroppedSpriteAt(ctx, sp, c.x, bottomY, 100);
  } else {
    drawIsoBox(ctx, c.x, bottomY - 8, 62, 32, 30, '#fef3c7', '#f5e8c7', '#e2d0a7', INK);
  }

  const tagW = 86;
  const tagY = bottomY - 104;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(c.x - tagW / 2, tagY, tagW, 19, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ MUSEU', c.x, tagY + 13);
  ctx.restore();
}

export function drawTree(ctx, u, v, wilted, isNight = false) {
  ctx.save();
  const c = cityIso(u, v);
  const bottomY = c.y + 13;

  ctx.fillStyle = 'rgba(24, 20, 16, 0.16)';
  ctx.beginPath();
  ctx.ellipse(c.x, bottomY - 3, 12, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const variant = wilted ? 'wilted' : isNight ? 'night' : 'day';
  const sp = getSpriteVariant('city_tree', variant);
  if (sp) {
    drawCroppedSpriteAt(ctx, sp, c.x, bottomY, 46);
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#855f40';
    ctx.fillRect(c.x - 2.5, bottomY - 12, 5, 12);
    ctx.fillStyle = wilted ? '#9a7b56' : '#5a7a52';
    ctx.beginPath();
    ctx.arc(c.x, bottomY - 17, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// Avatar ilustrado 2.5D (estudante de medicina com jaleco + cor personalizada + balão de emote)
export function drawAvatar(ctx, x, y, shirtColor = '#38bdf8', label = 'Você', emote = '', scale = 1, isOnlinePeer = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  if (isOnlinePeer) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
  }

  ctx.fillStyle = 'rgba(20, 18, 16, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(-2.8, 7.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(2.8, 7.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(-6.5, -6, 13, 13, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#faf8f2';
  ctx.beginPath();
  ctx.roundRect(-7, -5.5, 4.4, 12, 2);
  ctx.roundRect(2.6, -5.5, 4.4, 12, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fcd5b5';
  ctx.beginPath();
  ctx.arc(0, -12, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#47362b';
  ctx.beginPath();
  ctx.arc(0, -13.5, 6.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(3, -15, -4, -14.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-2.1, -11.4, 0.9, 0, Math.PI * 2);
  ctx.arc(2.1, -11.4, 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.font = 'bold 9.5px system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    const w = Math.max(32, textW + 12);
    ctx.fillStyle = isOnlinePeer ? 'rgba(14, 116, 144, 0.92)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isOnlinePeer ? '#67e8f9' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -33, w, 14, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -23);
  }

  if (emote) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    const ew = Math.max(26, ctx.measureText(emote).width + 14);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-ew / 2, -55, ew, 18, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -37);
    ctx.lineTo(0, -33);
    ctx.lineTo(3, -37);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(emote, 0, -42.5);
  }
  ctx.restore();
}

export function drawCar(ctx, x, y, color, axis = 'u') {
  ctx.save();
  ctx.translate(x, y);
  // Inclina o carrinho para acompanhar o ângulo exato das avenidas isométricas (2:1)
  const angle = axis === 'u' ? Math.atan2(0.5, 1) : Math.atan2(0.5, -1);
  ctx.rotate(angle);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;

  // Sombra rente ao asfalto
  ctx.fillStyle = 'rgba(20, 18, 16, 0.26)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carroceria
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-12, -5.5, 24, 11, 3.5);
  ctx.fill();
  ctx.stroke();

  // Teto / para-brisa
  ctx.fillStyle = '#d8f3fc';
  ctx.beginPath();
  ctx.roundRect(-5, -3.8, 10, 7.6, 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ---------------- OBJETOS DOS QUARTOS ----------------
export function drawRoomObject(ctx, type, cx, cy, tileW, { editMode = false, highlighted = false, alpha = 1, flip = false, srsStatus = null } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const tune = SPRITE_TUNING[type] || { scale: 1.20, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 };

  // Sombra suave em duas camadas no piso
  ctx.fillStyle = highlighted ? 'rgba(56, 189, 248, 0.34)' : 'rgba(28, 22, 16, 0.20)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + tileW * 0.08, tileW * tune.shadowRx, tileW * tune.shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(28, 22, 16, 0.14)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + tileW * 0.06, tileW * tune.shadowRx * 0.72, tileW * tune.shadowRy * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  if (highlighted || editMode) {
    ctx.strokeStyle = highlighted ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = highlighted ? 2.4 : 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + tileW * 0.08, tileW * (tune.shadowRx + 0.05), tileW * (tune.shadowRy + 0.03), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const sp = spriteCache[type];
  if (sp) {
    const maxDim = tileW * tune.scale;
    const ratio = (sp.width || 1) / (sp.height || 1);
    let dw, dh;
    if (ratio >= 1) {
      dw = maxDim;
      dh = maxDim / ratio;
    } else {
      dh = maxDim;
      dw = maxDim * ratio;
    }
    const drawX = cx - dw / 2;
    const drawY = cy + tileW * tune.yLift - dh;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    if (flip) {
      ctx.save();
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
      ctx.drawImage(sp, drawX, drawY, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(sp, drawX, drawY, dw, dh);
    }
  } else {
    const s = tileW / 64;
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-s, s);
    else ctx.scale(s, s);
    drawIsoBox(ctx, 0, 4, 28, 16, 18, '#ede9dd', '#cbd5e1', '#94a3b8', INK);
    ctx.restore();
  }

  // Indicador sutil de revisão pendente no canto do ladrilho (sem atrapalhar o desenho)
  if (!editMode && (srsStatus === 'old' || srsStatus === 'worn')) {
    const dotX = cx + tileW * tune.shadowRx * 0.85;
    const dotY = cy + tileW * 0.14;
    ctx.fillStyle = srsStatus === 'old' ? '#ef4444' : '#f59e0b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------- RENDERIZADOR MODULAR DE PLANTA DE QUARTOS + CORREDORES ----------------
function isoPt(gx, gy, originX, originY, tileW, tileH) {
  return {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2)
  };
}

function drawWallSegment(ctx, a, b, wallH, wainscotH, baseboardH, wallThick, side, theme, grain, isNight, deco = null) {
  const outX = side === 'left' ? -wallThick : wallThick;
  const outY = -wallThick * 0.5;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;

  // Corpo principal da parede
  const grad = ctx.createLinearGradient(a.x, a.y - wallH, b.x, b.y);
  grad.addColorStop(0, side === 'left' ? theme.wallLeft : theme.wallRight);
  grad.addColorStop(1, side === 'left' ? theme.wallLeftShade : theme.wallRightShade);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wallH);
  ctx.lineTo(b.x, b.y - wallH);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(a.x, a.y);
  ctx.closePath();
  ctx.fill();
  if (grain) { ctx.fillStyle = grain; ctx.fill(); }

  // Meia-parede (wainscoting)
  ctx.fillStyle = side === 'left' ? theme.wainscotLeft : theme.wainscotRight;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wainscotH);
  ctx.lineTo(b.x, b.y - wainscotH);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(a.x, a.y);
  ctx.closePath();
  ctx.fill();
  if (grain) { ctx.fillStyle = grain; ctx.fill(); }

  // Friso da meia-parede
  ctx.fillStyle = theme.railColor;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wainscotH - 4);
  ctx.lineTo(b.x, b.y - wainscotH - 4);
  ctx.lineTo(b.x, b.y - wainscotH + 1);
  ctx.lineTo(a.x, a.y - wainscotH + 1);
  ctx.closePath();
  ctx.fill();

  // Rodapé
  ctx.fillStyle = side === 'left' ? theme.baseboardLeft : theme.baseboardRight;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - baseboardH);
  ctx.lineTo(b.x, b.y - baseboardH);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(a.x, a.y);
  ctx.closePath();
  ctx.fill();

  // Linhas horizontais limpas da parede (sem divisórias verticais feias entre segmentos contínuos)
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wainscotH - 4); ctx.lineTo(b.x, b.y - wainscotH - 4);
  ctx.moveTo(a.x, a.y - wainscotH + 1); ctx.lineTo(b.x, b.y - wainscotH + 1);
  ctx.moveTo(a.x, a.y - baseboardH); ctx.lineTo(b.x, b.y - baseboardH);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.stroke();

  // Topo 3D de corte da parede
  ctx.fillStyle = theme.wallTop;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wallH);
  ctx.lineTo(b.x, b.y - wallH);
  ctx.lineTo(b.x + outX, b.y - wallH + outY);
  ctx.lineTo(a.x + outX, a.y - wallH + outY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Decoração opcional neste segmento (janela ou pôster clínico)
  if (deco === 'window') {
    const wTop = wallH - Math.floor(wallH * 0.16);
    const wBot = wainscotH + Math.floor(wallH * 0.10);
    const t1 = 0.14, t2 = 0.86;
    const p1x = a.x + (b.x - a.x) * t1;
    const p1y = a.y + (b.y - a.y) * t1;
    const p2x = a.x + (b.x - a.x) * t2;
    const p2y = a.y + (b.y - a.y) * t2;

    ctx.fillStyle = '#f8f5ec';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y - wTop);
    ctx.lineTo(p2x, p2y - wTop);
    ctx.lineTo(p2x, p2y - wBot);
    ctx.lineTo(p1x, p1y - wBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isNight ? '#26456b' : '#c6e6f9';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(p1x + (p2x - p1x) * 0.1, p1y + (p2y - p1y) * 0.1 - wTop + 4);
    ctx.lineTo(p2x - (p2x - p1x) * 0.1, p2y - (p2y - p1y) * 0.1 - wTop + 4);
    ctx.lineTo(p2x - (p2x - p1x) * 0.1, p2y - (p2y - p1y) * 0.1 - wBot - 4);
    ctx.lineTo(p1x + (p2x - p1x) * 0.1, p1y + (p2y - p1y) * 0.1 - wBot - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (deco === 'poster') {
    const fTop = wallH - Math.floor(wallH * 0.18);
    const fBot = wainscotH + Math.floor(wallH * 0.15);
    const t1 = 0.16, t2 = 0.84;
    const p1x = a.x + (b.x - a.x) * t1;
    const p1y = a.y + (b.y - a.y) * t1;
    const p2x = a.x + (b.x - a.x) * t2;
    const p2y = a.y + (b.y - a.y) * t2;

    ctx.fillStyle = '#7c5d41';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y - fTop);
    ctx.lineTo(p2x, p2y - fTop);
    ctx.lineTo(p2x, p2y - fBot);
    ctx.lineTo(p1x, p1y - fBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fcf8ed';
    ctx.beginPath();
    ctx.moveTo(p1x + 3, p1y - fTop + 4);
    ctx.lineTo(p2x - 3, p2y - fTop + 2);
    ctx.lineTo(p2x - 3, p2y - fBot - 4);
    ctx.lineTo(p1x + 3, p1y - fBot - 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Desenha qualquer planta modular isométrica 2.5D (quartos expandidos, corredores, múltiplos cômodos acoplados)
 * com ordenação de profundidade perfeita entre paredes, móveis e avatares!
 */
export function drawModularRoom(ctx, {
  cells,
  objects = [],
  avatars = [],
  ghost = null,
  layoutPreview = null, // { tiles: [{gx, gy}], isErase: boolean }
  hiddenWalls = {},
  wallToolActive = false,
  hoveredWall = null, // { key, side, gx, gy, hidden }
  originX,
  originY,
  tileW,
  tileH,
  themeId = 'clinic',
  isNight = false,
  editMode = false,
  hoverTile = null,
  selectedMoveTile = null,
  movingObjectId = null
}) {
  const theme = getRoomTheme(themeId);
  const grain = getPaperGrainPattern(ctx);
  const wallH = Math.floor(tileW * 1.24);
  const wallThick = Math.max(7, Math.floor(tileW * 0.13));
  const slabH = Math.max(11, Math.floor(tileW * 0.21));
  const wainscotH = Math.floor(wallH * 0.34);
  const baseboardH = Math.max(5, Math.floor(tileW * 0.10));

  const hasCell = (x, y) => Boolean(cells[`${x},${y}`]);
  const cellList = Object.entries(cells).map(([k, zone]) => {
    const [xs, ys] = k.split(',');
    return { gx: parseInt(xs, 10), gy: parseInt(ys, 10), zone };
  });
  cellList.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Sombra suave projetada debaixo de toda a planta
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (const cell of cellList) {
    const top = isoPt(cell.gx, cell.gy, originX, originY, tileW, tileH);
    const right = isoPt(cell.gx + 1, cell.gy, originX, originY, tileW, tileH);
    const bottom = isoPt(cell.gx + 1, cell.gy + 1, originX, originY, tileW, tileH);
    const left = isoPt(cell.gx, cell.gy + 1, originX, originY, tileW, tileH);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + slabH + 8);
    ctx.lineTo(right.x, right.y + slabH + 8);
    ctx.lineTo(bottom.x, bottom.y + slabH + 14);
    ctx.lineTo(left.x, left.y + slabH + 8);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Base 3D da laje nas bordas frontais expostas
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  for (const cell of cellList) {
    const right = isoPt(cell.gx + 1, cell.gy, originX, originY, tileW, tileH);
    const bottom = isoPt(cell.gx + 1, cell.gy + 1, originX, originY, tileW, tileH);
    const left = isoPt(cell.gx, cell.gy + 1, originX, originY, tileW, tileH);

    if (!hasCell(cell.gx, cell.gy + 1)) {
      ctx.fillStyle = theme.slabLeft;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(bottom.x, bottom.y + slabH);
      ctx.lineTo(left.x, left.y + slabH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (!hasCell(cell.gx + 1, cell.gy)) {
      ctx.fillStyle = theme.slabRight;
      ctx.beginPath();
      ctx.moveTo(bottom.x, bottom.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(right.x, right.y + slabH);
      ctx.lineTo(bottom.x, bottom.y + slabH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Piso Texturizado (quartos + corredores diferenciados)
  for (const cell of cellList) {
    const { gx, gy, zone } = cell;
    const top = isoPt(gx, gy, originX, originY, tileW, tileH);
    const right = isoPt(gx + 1, gy, originX, originY, tileW, tileH);
    const bottom = isoPt(gx + 1, gy + 1, originX, originY, tileW, tileH);
    const left = isoPt(gx, gy + 1, originX, originY, tileW, tileH);

    const isEven = (gx + gy) % 2 === 0;
    if (zone === 'corridor') {
      ctx.fillStyle = isEven ? (theme.corridorA || '#dfe4db') : (theme.corridorB || '#d3dacd');
    } else {
      ctx.fillStyle = isEven ? theme.floorA : theme.floorB;
    }

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.fill();

    if (grain) {
      ctx.fillStyle = grain;
      ctx.fill();
    }

    if (theme.floorStyle === 'wood' && zone !== 'corridor') {
      ctx.strokeStyle = theme.floorGrout;
      ctx.lineWidth = 1;
      for (let k = 1; k <= 2; k++) {
        const t = k / 3;
        ctx.beginPath();
        ctx.moveTo(top.x + (left.x - top.x) * t, top.y + (left.y - top.y) * t);
        ctx.lineTo(right.x + (bottom.x - right.x) * t, right.y + (bottom.y - right.y) * t);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left.x + 4, left.y);
      ctx.lineTo(top.x, top.y + 2);
      ctx.lineTo(right.x - 4, right.y);
      ctx.stroke();
    }

    // Rejunte / grade de edição
    ctx.strokeStyle = editMode ? 'rgba(56, 189, 248, 0.38)' : theme.floorGrout;
    ctx.lineWidth = editMode ? 1.15 : 0.9;
    ctx.stroke();

    // Oclusão suave ao longo de paredes traseiras (somente onde a parede não foi apagada)
    if (!hasCell(gx - 1, gy) && !(hiddenWalls && hiddenWalls[`L:${gx},${gy}`])) {
      ctx.fillStyle = 'rgba(30, 24, 18, 0.10)';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(left.x + (bottom.x - left.x) * 0.25, left.y + (bottom.y - left.y) * 0.25);
      ctx.lineTo(top.x + (right.x - top.x) * 0.25, top.y + (right.y - top.y) * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    if (!hasCell(gx, gy - 1) && !(hiddenWalls && hiddenWalls[`R:${gx},${gy}`])) {
      ctx.fillStyle = 'rgba(30, 24, 18, 0.08)';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(right.x + (bottom.x - right.x) * 0.25, right.y + (bottom.y - right.y) * 0.25);
      ctx.lineTo(top.x + (left.x - top.x) * 0.25, top.y + (left.y - top.y) * 0.25);
      ctx.closePath();
      ctx.fill();
    }

    // Destaque de tile sob hover / seleção de mover
    if (hoverTile && hoverTile.gx === gx && hoverTile.gy === gy && !layoutPreview) {
      ctx.fillStyle = hoverTile.occupied ? 'rgba(251, 191, 36, 0.28)' : 'rgba(56, 189, 248, 0.28)';
      ctx.fill();
      ctx.strokeStyle = hoverTile.occupied ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (selectedMoveTile && selectedMoveTile.gx === gx && selectedMoveTile.gy === gy) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }

  // 4. Pré-visualização de expansão / corredor / cômodo na aba Planta
  if (layoutPreview && layoutPreview.tiles && layoutPreview.tiles.length > 0) {
    for (const pt of layoutPreview.tiles) {
      const top = isoPt(pt.gx, pt.gy, originX, originY, tileW, tileH);
      const right = isoPt(pt.gx + 1, pt.gy, originX, originY, tileW, tileH);
      const bottom = isoPt(pt.gx + 1, pt.gy + 1, originX, originY, tileW, tileH);
      const left = isoPt(pt.gx, pt.gy + 1, originX, originY, tileW, tileH);

      ctx.fillStyle = layoutPreview.isErase
        ? 'rgba(239, 68, 68, 0.34)'
        : pt.zone === 'corridor'
          ? 'rgba(250, 204, 21, 0.32)'
          : 'rgba(34, 197, 94, 0.32)';
      ctx.strokeStyle = layoutPreview.isErase
        ? '#ef4444'
        : pt.zone === 'corridor'
          ? '#facc15'
          : '#22c55e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 5. Renderização ordenada por profundidade: Paredes 3D + Móveis + Ghost + Avatares
  const renderables = [];

  for (const cell of cellList) {
    const { gx, gy, zone } = cell;
    // Parede traseira esquerda (borda com gx-1)
    if (!hasCell(gx - 1, gy)) {
      const wallKey = `L:${gx},${gy}`;
      const isHidden = Boolean(hiddenWalls && hiddenWalls[wallKey]);
      if (!isHidden || wallToolActive) {
        const hasUp = hasCell(gx, gy - 1) && !hasCell(gx - 1, gy - 1) && !(hiddenWalls && hiddenWalls[`L:${gx},${gy - 1}`]);
        const hasDown = hasCell(gx, gy + 1) && !hasCell(gx - 1, gy + 1) && !(hiddenWalls && hiddenWalls[`L:${gx},${gy + 1}`]);
        const deco = zone !== 'corridor' && hasUp && hasDown && (Math.abs(gy) % 3 === 2) ? 'window' : null;
        renderables.push({
          kind: 'wall-left',
          depth: gx + gy + 0.22,
          gx,
          gy,
          deco,
          wallKey,
          isHidden
        });
      }
    }
    // Parede traseira direita (borda com gy-1)
    if (!hasCell(gx, gy - 1)) {
      const wallKey = `R:${gx},${gy}`;
      const isHidden = Boolean(hiddenWalls && hiddenWalls[wallKey]);
      if (!isHidden || wallToolActive) {
        const hasLeft = hasCell(gx - 1, gy) && !hasCell(gx - 1, gy - 1) && !(hiddenWalls && hiddenWalls[`R:${gx - 1},${gy}`]);
        const hasRight = hasCell(gx + 1, gy) && !hasCell(gx + 1, gy - 1) && !(hiddenWalls && hiddenWalls[`R:${gx + 1},${gy}`]);
        const deco = zone !== 'corridor' && hasLeft && hasRight && (Math.abs(gx) % 4 === 2) ? 'poster' : null;
        renderables.push({
          kind: 'wall-right',
          depth: gx + gy + 0.22,
          gx,
          gy,
          deco,
          wallKey,
          isHidden
        });
      }
    }
  }

  objects.forEach((obj) => {
    renderables.push({
      kind: 'object',
      depth: obj.gx + obj.gy + 0.55,
      gx: obj.gx + 0.5,
      gy: obj.gy + 0.5,
      obj,
      highlighted:
        movingObjectId === obj.id ||
        (editMode && !layoutPreview && hoverTile && hoverTile.gx === obj.gx && hoverTile.gy === obj.gy)
    });
  });

  if (ghost) {
    renderables.push({
      kind: 'ghost',
      depth: ghost.gx + ghost.gy + 0.55,
      gx: ghost.gx + 0.5,
      gy: ghost.gy + 0.5,
      type: ghost.type,
      flip: Boolean(ghost.flip)
    });
  }

  const avScale = Math.max(1.05, tileW / 68);
  avatars.forEach((av) => {
    renderables.push({
      kind: 'avatar',
      depth: av.gx + av.gy - 0.45,
      gx: av.gx,
      gy: av.gy,
      color: av.color,
      name: av.name,
      emote: av.emote || '',
      isPeer: Boolean(av.isPeer)
    });
  });

  renderables.sort((a, b) => a.depth - b.depth);

  const drawWallOverlay = (a, b, isHidden, isHovered) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - wallH);
    ctx.lineTo(b.x, b.y - wallH);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(a.x, a.y);
    ctx.closePath();
    if (isHidden) {
      ctx.fillStyle = isHovered ? 'rgba(34, 197, 94, 0.34)' : 'rgba(56, 189, 248, 0.12)';
      ctx.strokeStyle = isHovered ? '#22c55e' : 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = isHovered ? 2.4 : 1.3;
      ctx.setLineDash([6, 5]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.42)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.6;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  for (const item of renderables) {
    if (item.kind === 'wall-left') {
      const a = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      const b = isoPt(item.gx, item.gy + 1, originX, originY, tileW, tileH);
      const isHovered = Boolean(wallToolActive && hoveredWall && hoveredWall.key === item.wallKey);
      if (!item.isHidden) {
        drawWallSegment(ctx, a, b, wallH, wainscotH, baseboardH, wallThick, 'left', theme, grain, isNight, item.deco);
      }
      if (wallToolActive && (item.isHidden || isHovered)) {
        drawWallOverlay(a, b, item.isHidden, isHovered);
      }
    } else if (item.kind === 'wall-right') {
      const a = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      const b = isoPt(item.gx + 1, item.gy, originX, originY, tileW, tileH);
      const isHovered = Boolean(wallToolActive && hoveredWall && hoveredWall.key === item.wallKey);
      if (!item.isHidden) {
        drawWallSegment(ctx, a, b, wallH, wainscotH, baseboardH, wallThick, 'right', theme, grain, isNight, item.deco);
      }
      if (wallToolActive && (item.isHidden || isHovered)) {
        drawWallOverlay(a, b, item.isHidden, isHovered);
      }
    } else if (item.kind === 'object') {
      const pt = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      drawRoomObject(ctx, item.obj.type, pt.x, pt.y, tileW, {
        editMode,
        highlighted: item.highlighted,
        alpha: movingObjectId === item.obj.id ? 0.65 : 1,
        flip: Boolean(item.obj.flip),
        srsStatus: item.obj._srsStatus || null
      });
    } else if (item.kind === 'ghost') {
      const pt = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      drawRoomObject(ctx, item.type, pt.x, pt.y, tileW, {
        editMode: false,
        highlighted: true,
        alpha: 0.55,
        flip: Boolean(item.flip)
      });
    } else if (item.kind === 'avatar') {
      const pt = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      drawAvatar(ctx, pt.x, pt.y, item.color, item.name, item.emote, avScale, item.isPeer);
    }
  }

  ctx.restore();
}
