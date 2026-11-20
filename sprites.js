// Desenho Isométrico 2.5D Ilustrado (Cidade Viva + Planta Modular de Quartos + Sprites HD)
import { ROOM_THEMES } from './data.js';

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
  city_hospital: '/assets/city-hospital.jpg',
  city_museum: '/assets/city-museum.jpg',
  city_house: '/assets/city-house.jpg',
  city_tree: '/assets/city-tree.jpg'
};

const CITY_SPRITE_KEYS = new Set(['city_hospital', 'city_museum', 'city_house', 'city_tree']);

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
  trophy: { scale: 1.16, yLift: 0.20, shadowRx: 0.28, shadowRy: 0.14 }
};

const spriteCache = {};

export function processIllustratedSprite(img, skipInnerHoles = false) {
  const size = 512;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0, size, size);
  const imgData = octx.getImageData(0, 0, size, size);
  const d = imgData.data;

  // Passo 1: Flood-fill a partir de toda a borda para remover fundo branco externo
  const visited = new Uint8Array(size * size);
  const stack = [];
  for (let i = 0; i < size; i++) {
    stack.push(i);
    stack.push((size - 1) * size + i);
    stack.push(i * size);
    stack.push(i * size + (size - 1));
  }

  const isOuterWhite = (idx) => {
    const r = d[idx], g = d[idx + 1], b = d[idx + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return r > 232 && g > 232 && b > 232 && (max - min) < 20;
  };

  while (stack.length > 0) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (!isOuterWhite(i)) continue;
    d[i + 3] = 0;
    const x = p % size;
    const y = (p - x) / size;
    if (x > 0) stack.push(p - 1);
    if (x < size - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - size);
    if (y < size - 1) stack.push(p + size);
  }

  // Passo 2: Limpar frestas puramente brancas presas entre pernas/rodas (somente em móveis)
  if (!skipInnerHoles) {
    const lowerStart = Math.floor(size * 0.48);
    const holeVis = new Uint8Array(size * size);
    const isPureWhite = (idx) => {
      const r = d[idx], g = d[idx + 1], b = d[idx + 2], a = d[idx + 3];
      if (a === 0) return false;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return r >= 249 && g >= 249 && b >= 249 && (max - min) <= 6;
    };

    for (let y = lowerStart; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const p0 = y * size + x;
        if (holeVis[p0] || !isPureWhite(p0 * 4)) continue;
        const comp = [];
        const q = [p0];
        let touchesUpper = false;
        while (q.length > 0) {
          const p = q.pop();
          if (holeVis[p]) continue;
          holeVis[p] = 1;
          if (!isPureWhite(p * 4)) continue;
          const px = p % size;
          const py = (p - px) / size;
          if (py < lowerStart - 6) touchesUpper = true;
          comp.push(p);
          if (px > 0) q.push(p - 1);
          if (px < size - 1) q.push(p + 1);
          if (py > 0) q.push(p - size);
          if (py < size - 1) q.push(p + size);
        }
        if (!touchesUpper && comp.length >= 12 && comp.length < 18000) {
          for (let k = 0; k < comp.length; k++) {
            d[comp[k] * 4 + 3] = 0;
          }
        }
      }
    }
  }

  // Passo 3: Suavização de 1px na borda (remove halo branco)
  const alphaCopy = new Uint8Array(size * size);
  for (let p = 0; p < size * size; p++) alphaCopy[p] = d[p * 4 + 3];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      if (alphaCopy[p] === 0) continue;
      const nearTransp =
        alphaCopy[p - 1] === 0 ||
        alphaCopy[p + 1] === 0 ||
        alphaCopy[p - size] === 0 ||
        alphaCopy[p + size] === 0;
      if (nearTransp) {
        const i = p * 4;
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (lum > 215) {
          d[i + 3] = Math.max(0, Math.round((255 - lum) * 4));
        }
      }
    }
  }

  octx.putImageData(imgData, 0, 0);

  // Passo 4: Auto-crop
  let minX = size, minY = size, maxX = 0, maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (d[(y * size + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return off;

  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(size - 1, maxX + pad);
  maxY = Math.min(size - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  const cropped = document.createElement('canvas');
  cropped.width = cw;
  cropped.height = ch;
  cropped.getContext('2d').drawImage(off, minX, minY, cw, ch, 0, 0, cw, ch);
  return cropped;
}

Object.entries(SPRITE_URLS).forEach(([key, url]) => {
  const img = new Image();
  img.onload = () => {
    try {
      spriteCache[key] = processIllustratedSprite(img, CITY_SPRITE_KEYS.has(key));
    } catch {
      spriteCache[key] = img;
    }
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
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sp, cx - dw / 2, bottomY - dh, dw, dh);
  return { dw, dh };
}

// ---------------- CIDADE ILUSTRADA 2.5D (MESMO ESTILO DOS QUARTOS) ----------------
export function drawIllustratedCityLandscape(ctx, WORLD_W, WORLD_H, TILE, { isNight, trafficLightGreen, now, ducks, hasFountain, hasPier }) {
  ctx.save();
  const grain = getPaperGrainPattern(ctx);

  // 1. Gramado base aconchegante com textura de papel ilustrado
  const grassGrad = ctx.createLinearGradient(0, 2 * TILE, 0, 14 * TILE);
  if (isNight) {
    grassGrad.addColorStop(0, '#243c32');
    grassGrad.addColorStop(1, '#1c3129');
  } else {
    grassGrad.addColorStop(0, '#9fc288');
    grassGrad.addColorStop(0.55, '#91b67b');
    grassGrad.addColorStop(1, '#84aa6f');
  }
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 1.8 * TILE, WORLD_W, 12.6 * TILE);

  // Manchas suaves de relevo no gramado
  ctx.fillStyle = isNight ? 'rgba(255,255,255,0.03)' : 'rgba(240, 245, 200, 0.22)';
  [
    [3.5, 4.8, 170, 75],
    [11, 5.2, 160, 68],
    [19.5, 5.0, 180, 76],
    [5.0, 12.0, 165, 65],
    [19.5, 11.8, 175, 70]
  ].forEach(([gx, gy, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(gx * TILE, gy * TILE, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  if (grain) {
    ctx.fillStyle = grain;
    ctx.fillRect(0, 1.8 * TILE, WORLD_W, 12.6 * TILE);
  }

  // 2. Céu + Cadeia de Montanhas Ilustradas no limite norte
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 2.5 * TILE);
  if (isNight) {
    skyGrad.addColorStop(0, '#111b2e');
    skyGrad.addColorStop(1, '#22334d');
  } else {
    skyGrad.addColorStop(0, '#b7def2');
    skyGrad.addColorStop(1, '#e6f3ec');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WORLD_W, 2.35 * TILE);

  // Montanhas de fundo (camada azulada suave)
  ctx.fillStyle = isNight ? '#26384f' : '#8aa5ad';
  ctx.beginPath();
  ctx.moveTo(0, 2.35 * TILE);
  for (let i = 0; i <= 14; i++) {
    const px = (i / 14) * WORLD_W;
    const peak = (i % 2 === 0 ? 0.85 : 1.55) * TILE;
    ctx.lineTo(px, peak);
  }
  ctx.lineTo(WORLD_W, 2.35 * TILE);
  ctx.closePath();
  ctx.fill();

  // Montanhas frontais ilustradas com neve e traço suave
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  for (let i = 0; i < 12; i++) {
    const mx = i * (WORLD_W / 11.5) - 24;
    const mw = 138;
    const mh = 76 + (i % 3) * 16;
    const baseY = 2.4 * TILE;

    ctx.fillStyle = isNight ? '#334756' : '#6c8778';
    ctx.beginPath();
    ctx.moveTo(mx, baseY);
    ctx.lineTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Face sombreada direita
    ctx.fillStyle = isNight ? 'rgba(15,23,42,0.32)' : 'rgba(43,37,32,0.14)';
    ctx.beginPath();
    ctx.moveTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw, baseY);
    ctx.lineTo(mx + mw * 0.54, baseY);
    ctx.closePath();
    ctx.fill();

    // Topo nevado creme-suave
    ctx.fillStyle = isNight ? '#cbd5e1' : '#f7f4ea';
    ctx.beginPath();
    ctx.moveTo(mx + mw * 0.34, baseY - mh * 0.68);
    ctx.lineTo(mx + mw * 0.5, baseY - mh);
    ctx.lineTo(mx + mw * 0.66, baseY - mh * 0.68);
    ctx.lineTo(mx + mw * 0.56, baseY - mh * 0.58);
    ctx.lineTo(mx + mw * 0.44, baseY - mh * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Orla verde na base das montanhas
  ctx.fillStyle = isNight ? '#1f362d' : '#739862';
  ctx.fillRect(0, 2.25 * TILE, WORLD_W, 14);

  // 3. Calçadas & Avenidas Ilustradas (com meio-fio creme e asfalto suave)
  const roadY = 7.9 * TILE;
  const roadH = 1.15 * TILE;
  const roadX = 13.85 * TILE;
  const roadW = 1.15 * TILE;
  const curb = 9;

  // Calçadas creme ao redor das avenidas
  ctx.fillStyle = isNight ? '#4b5563' : '#e6decb';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.fillRect(0, roadY - curb, WORLD_W, roadH + curb * 2);
  ctx.fillRect(roadX - curb, 2.35 * TILE, roadW + curb * 2, 11.45 * TILE);

  // Asfalto ilustrado
  ctx.fillStyle = isNight ? '#283244' : '#586475';
  ctx.fillRect(0, roadY, WORLD_W, roadH);
  ctx.fillRect(roadX, 2.35 * TILE, roadW, 11.45 * TILE);

  // Contorno limpo dos meios-fios
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, roadY); ctx.lineTo(roadX, roadY);
  ctx.moveTo(roadX + roadW, roadY); ctx.lineTo(WORLD_W, roadY);
  ctx.moveTo(0, roadY + roadH); ctx.lineTo(roadX, roadY + roadH);
  ctx.moveTo(roadX + roadW, roadY + roadH); ctx.lineTo(WORLD_W, roadY + roadH);
  ctx.moveTo(roadX, 2.35 * TILE); ctx.lineTo(roadX, roadY);
  ctx.moveTo(roadX + roadW, 2.35 * TILE); ctx.lineTo(roadX + roadW, roadY);
  ctx.moveTo(roadX, roadY + roadH); ctx.lineTo(roadX, 13.75 * TILE);
  ctx.moveTo(roadX + roadW, roadY + roadH); ctx.lineTo(roadX + roadW, 13.75 * TILE);
  ctx.stroke();

  // Faixa tracejada central das avenidas
  ctx.strokeStyle = isNight ? 'rgba(253, 224, 71, 0.55)' : 'rgba(248, 245, 232, 0.72)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(0, roadY + roadH / 2); ctx.lineTo(roadX - 24, roadY + roadH / 2);
  ctx.moveTo(roadX + roadW + 24, roadY + roadH / 2); ctx.lineTo(WORLD_W, roadY + roadH / 2);
  ctx.moveTo(roadX + roadW / 2, 2.4 * TILE); ctx.lineTo(roadX + roadW / 2, roadY - 22);
  ctx.moveTo(roadX + roadW / 2, roadY + roadH + 22); ctx.lineTo(roadX + roadW / 2, 13.6 * TILE);
  ctx.stroke();
  ctx.setLineDash([]);

  // Faixas de pedestre limpas
  ctx.fillStyle = '#f8f5ec';
  for (let s = 0; s < 5; s++) {
    ctx.fillRect(roadX - 20, roadY + 6 + s * 9, 14, 5);
    ctx.fillRect(roadX + roadW + 6, roadY + 6 + s * 9, 14, 5);
  }

  // Semáforo ilustrado
  ctx.fillStyle = '#2b2520';
  ctx.beginPath();
  ctx.roundRect(roadX - 18, roadY - 30, 12, 24, 4);
  ctx.fill();
  ctx.fillStyle = trafficLightGreen ? '#22c55e' : '#ef4444';
  ctx.beginPath();
  ctx.arc(roadX - 12, roadY - 22, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = trafficLightGreen ? '#14532d' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(roadX - 12, roadY - 12, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Praça Central Ilustrada (calçamento em pedra creme, laguinho orgânico, pontezinha, flores e bancos)
  const px = 9.4 * TILE;
  const py = 9.35 * TILE;
  const pw = 4.15 * TILE;
  const ph = 3.55 * TILE;

  // Base em pedra clara da praça
  ctx.fillStyle = isNight ? '#334155' : '#e8e0ce';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 20);
  ctx.fill();
  ctx.stroke();

  // Gramado interno arredondado da praça
  ctx.fillStyle = isNight ? '#1f4033' : '#8fd182';
  ctx.beginPath();
  ctx.roundRect(px + 12, py + 12, pw - 24, ph - 24, 14);
  ctx.fill();
  ctx.stroke();

  // Laguinho arredondado com borda de pedra
  const pondCx = 11.75 * TILE;
  const pondCy = 11.05 * TILE;
  ctx.fillStyle = isNight ? '#475569' : '#d6ccb8';
  ctx.beginPath();
  ctx.ellipse(pondCx, pondCy, 56, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const pondGrad = ctx.createRadialGradient(pondCx - 12, pondCy - 8, 6, pondCx, pondCy, 52);
  if (isNight) {
    pondGrad.addColorStop(0, '#1d4e6f');
    pondGrad.addColorStop(1, '#12324a');
  } else {
    pondGrad.addColorStop(0, '#8dd8ee');
    pondGrad.addColorStop(1, '#4ea8c7');
  }
  ctx.fillStyle = pondGrad;
  ctx.beginPath();
  ctx.ellipse(pondCx, pondCy, 50, 31, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ondinhas sutis no lago
  const waveShift = Math.sin(now * 0.002) * 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(pondCx - 22 + waveShift, pondCy - 6);
  ctx.quadraticCurveTo(pondCx - 10 + waveShift, pondCy - 10, pondCx + 2 + waveShift, pondCy - 6);
  ctx.moveTo(pondCx - 6 - waveShift, pondCy + 10);
  ctx.quadraticCurveTo(pondCx + 8 - waveShift, pondCy + 6, pondCx + 20 - waveShift, pondCy + 10);
  ctx.stroke();

  // Patinhos no lago
  ducks.forEach((d) => {
    const dy = d.y + Math.sin(d.angle) * 2.5;
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(d.x, dy, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f97316';
    ctx.fillRect(d.x + 3.5, dy - 1, 2.5, 2);
  });

  // Fonte permanente da praça (inaugurada pelo Prefeito com 2 rondas!)
  if (hasFountain) {
    const fx = 10.25 * TILE;
    const fy = 10.35 * TILE;
    ctx.fillStyle = '#e5dcc8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jato animado
    const spH = 8 + Math.sin(now * 0.006) * 2.5;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - spH);
    ctx.stroke();
  }

  // Banquinhos de madeira ilustrados
  [[9.85 * TILE, 11.8 * TILE], [12.75 * TILE, 9.75 * TILE]].forEach(([bx, by]) => {
    ctx.fillStyle = '#a47148';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(bx, by, 24, 9, 3);
    ctx.fill();
    ctx.stroke();
  });

  // 5. Praia de Areia Quente + Mar Ilustrado no limite sul
  ctx.fillStyle = isNight ? '#594e3f' : '#ead7ad';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 13.7 * TILE);
  for (let x = 0; x <= WORLD_W; x += 96) {
    ctx.quadraticCurveTo(x + 48, 13.55 * TILE + ((x / 96) % 2) * 10, x + 96, 13.72 * TILE);
  }
  ctx.lineTo(WORLD_W, 14.35 * TILE);
  ctx.lineTo(0, 14.35 * TILE);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const seaGrad = ctx.createLinearGradient(0, 14.15 * TILE, 0, WORLD_H);
  if (isNight) {
    seaGrad.addColorStop(0, '#153a54');
    seaGrad.addColorStop(1, '#0b2236');
  } else {
    seaGrad.addColorStop(0, '#62b6cb');
    seaGrad.addColorStop(1, '#3684a8');
  }
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, 14.18 * TILE, WORLD_W, 2 * TILE);

  // Espuma animada das ondas
  const surf = Math.sin(now * 0.0022) * 4;
  ctx.strokeStyle = isNight ? 'rgba(186, 230, 253, 0.32)' : 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 12; i++) {
    const wx = i * 98 + 14 + surf;
    const wy = 14.48 * TILE + (i % 2) * 14;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 16, wy - 4, wx + 32, wy);
    ctx.stroke();
  }

  // Deck de madeira + barquinho (marco permanente do Prefeito com 5 rondas!)
  if (hasPier) {
    const dx = 11.4 * TILE;
    const dy = 13.75 * TILE;
    ctx.fillStyle = '#a47148';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(dx, dy, 34, 62, 4);
    ctx.fill();
    ctx.stroke();
    for (let p = 1; p <= 5; p++) {
      ctx.beginPath();
      ctx.moveTo(dx, dy + p * 10);
      ctx.lineTo(dx + 34, dy + p * 10);
      ctx.stroke();
    }
    // Barquinho balançando ao lado do pier
    const boatY = dy + 54 + Math.sin(now * 0.003) * 2.5;
    const boatX = dx + 52;
    ctx.fillStyle = '#f8f5ec';
    ctx.beginPath();
    ctx.moveTo(boatX - 14, boatY);
    ctx.lineTo(boatX + 14, boatY);
    ctx.lineTo(boatX + 9, boatY + 8);
    ctx.lineTo(boatX - 9, boatY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e07a5f';
    ctx.beginPath();
    ctx.moveTo(boatX, boatY - 2);
    ctx.lineTo(boatX, boatY - 20);
    ctx.lineTo(boatX + 12, boatY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 6. Postes de luz charmosos ao longo da avenida (acendem à noite!)
  [[3.2, 7.65], [7.6, 7.65], [11.8, 7.65], [16.8, 7.65], [21.0, 7.65]].forEach(([lx, ly]) => {
    const pxL = lx * TILE;
    const pyL = ly * TILE;
    if (isNight) {
      const glow = ctx.createRadialGradient(pxL, pyL - 18, 2, pxL, pyL - 10, 42);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
      glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pxL, pyL - 10, 42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pxL, pyL + 4);
    ctx.lineTo(pxL, pyL - 18);
    ctx.stroke();
    ctx.fillStyle = isNight ? '#fef08a' : '#f8f5ec';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(pxL, pyL - 20, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

export function drawPixelBuilding(ctx, x, y, w, h, baseColor, condition, isNight, label) {
  ctx.save();
  const cx = x + w / 2;
  const bottomY = y + h + 6;

  // Sombra isométrica aconchegante
  ctx.fillStyle = 'rgba(24, 20, 16, 0.24)';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY - 4, 58, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halo sutil colorido da especialidade indicando prédio clicável
  ctx.strokeStyle = baseColor || '#38bdf8';
  ctx.globalAlpha = isNight ? 0.72 : 0.6;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(cx, bottomY - 5, 62, 28, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const sp = spriteCache.city_hospital;
  if (sp) {
    ctx.save();
    if (condition === 'worn') {
      ctx.filter = 'saturate(0.65) brightness(0.93)';
    } else if (condition === 'old') {
      ctx.filter = 'saturate(0.28) brightness(0.82) contrast(0.95)';
    } else if (isNight) {
      ctx.filter = 'brightness(0.88)';
    }
    drawCroppedSpriteAt(ctx, sp, cx, bottomY, 134);
    ctx.restore();

    // Se estiver velho, acrescenta folhagens/mato na entrada para dar sinal claro de revisão
    if (condition === 'old') {
      ctx.fillStyle = '#536e4b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      [[-32, -8, 12, 6], [28, -10, 11, 5], [-10, -2, 9, 4]].forEach(([ox, oy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(cx + ox, bottomY + oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  } else {
    drawIsoBox(ctx, cx, bottomY - 10, 82, 42, 52, '#f8f6ef', '#ede9dd', '#d6d1c4', INK);
  }

  // Placa limpa da especialidade com cor do prédio + bolinha de estado (Novo/Desgastado/Velho)
  const condCol = condition === 'new' ? '#22c55e' : condition === 'worn' ? '#f59e0b' : '#ef4444';
  ctx.font = 'bold 11px system-ui, sans-serif';
  const textW = ctx.measureText(label).width;
  const tagW = Math.max(88, textW + 34);
  const tagY = bottomY - 146;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = baseColor || '#94a3b8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(cx - tagW / 2, tagY, tagW, 22, 8);
  ctx.fill();
  ctx.stroke();

  // Bolinha de status de revisão à esquerda
  ctx.fillStyle = condCol;
  ctx.beginPath();
  ctx.arc(cx - tagW / 2 + 11, tagY + 11, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.fillText(label, cx - tagW / 2 + 20, tagY + 15);

  ctx.restore();
}

export function drawHouse(ctx, x, y, roofColor, isNight) {
  ctx.save();
  const cx = x + 32;
  const bottomY = y + 48;

  ctx.fillStyle = 'rgba(24, 20, 16, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY - 3, 34, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  const sp = spriteCache.city_house;
  if (sp) {
    ctx.save();
    if (isNight) ctx.filter = 'brightness(0.84)';
    drawCroppedSpriteAt(ctx, sp, cx, bottomY, 82);
    ctx.restore();
  } else {
    drawIsoBox(ctx, cx, bottomY - 6, 36, 18, 20, '#f1ede4', '#e8e2d5', '#d6cfc0', INK);
    drawIsoBox(ctx, cx, bottomY - 26, 40, 20, 6, roofColor || '#d97b48', roofColor || '#d97b48', '#334155', INK);
  }
  ctx.restore();
}

export function drawMuseum(ctx, x, y, isNight) {
  ctx.save();
  const cx = x + 46;
  const bottomY = y + 66;

  ctx.fillStyle = 'rgba(24, 20, 16, 0.26)';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY - 4, 54, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  const sp = spriteCache.city_museum;
  if (sp) {
    ctx.save();
    if (isNight) ctx.filter = 'brightness(0.88)';
    drawCroppedSpriteAt(ctx, sp, cx, bottomY, 122);
    ctx.restore();
  } else {
    drawIsoBox(ctx, cx, bottomY - 8, 62, 32, 30, '#fef3c7', '#f5e8c7', '#e2d0a7', INK);
  }

  // Plaquinha dourada permanente do Museu
  const tagW = 92;
  const tagY = bottomY - 128;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(cx - tagW / 2, tagY, tagW, 19, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ MUSEU', cx, tagY + 13);
  ctx.restore();
}

export function drawTree(ctx, x, y, wilted, isNight = false) {
  ctx.save();
  const cx = x + 20;
  const bottomY = y + 36;

  ctx.fillStyle = 'rgba(24, 20, 16, 0.20)';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY - 2, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const sp = spriteCache.city_tree;
  if (sp) {
    ctx.save();
    if (wilted) {
      ctx.filter = 'sepia(0.55) saturate(0.6) brightness(0.88)';
    } else if (isNight) {
      ctx.filter = 'brightness(0.78)';
    }
    drawCroppedSpriteAt(ctx, sp, cx, bottomY, 64);
    ctx.restore();
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#855f40';
    ctx.fillRect(cx - 3, bottomY - 14, 6, 14);
    ctx.fillStyle = wilted ? '#9a7b56' : '#5a7a52';
    ctx.beginPath();
    ctx.arc(cx, bottomY - 20, 12, 0, Math.PI * 2);
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

export function drawCar(ctx, x, y, color, horizontal = true) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = 'rgba(24, 20, 16, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + (horizontal ? 13 : 8), y + (horizontal ? 11 : 19), horizontal ? 13 : 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  if (horizontal) {
    ctx.beginPath();
    ctx.roundRect(x, y, 26, 12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8f3fc';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 2, 12, 6, 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect(x, y, 15, 23, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8f3fc';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 5, 11, 9, 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------- OBJETOS DOS QUARTOS ----------------
export function drawRoomObject(ctx, type, cx, cy, tileW, { editMode = false, highlighted = false, alpha = 1, flip = false } = {}) {
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
    ctx.imageSmoothingQuality = 'high';
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
    ctx.restore();
    return;
  }

  const s = tileW / 64;
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-s, s);
  else ctx.scale(s, s);
  drawIsoBox(ctx, 0, 4, 28, 16, 18, '#ede9dd', '#cbd5e1', '#94a3b8', INK);
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

    // Oclusão suave ao longo de paredes traseiras
    if (!hasCell(gx - 1, gy)) {
      ctx.fillStyle = 'rgba(30, 24, 18, 0.10)';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(left.x + (bottom.x - left.x) * 0.25, left.y + (bottom.y - left.y) * 0.25);
      ctx.lineTo(top.x + (right.x - top.x) * 0.25, top.y + (right.y - top.y) * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    if (!hasCell(gx, gy - 1)) {
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
      const hasUp = hasCell(gx, gy - 1) && !hasCell(gx - 1, gy - 1);
      const hasDown = hasCell(gx, gy + 1) && !hasCell(gx - 1, gy + 1);
      const deco = zone !== 'corridor' && hasUp && hasDown && (Math.abs(gy) % 3 === 2) ? 'window' : null;
      renderables.push({
        kind: 'wall-left',
        depth: gx + gy + 0.22,
        gx,
        gy,
        deco
      });
    }
    // Parede traseira direita (borda com gy-1)
    if (!hasCell(gx, gy - 1)) {
      const hasLeft = hasCell(gx - 1, gy) && !hasCell(gx - 1, gy - 1);
      const hasRight = hasCell(gx + 1, gy) && !hasCell(gx + 1, gy - 1);
      const deco = zone !== 'corridor' && hasLeft && hasRight && (Math.abs(gx) % 4 === 2) ? 'poster' : null;
      renderables.push({
        kind: 'wall-right',
        depth: gx + gy + 0.22,
        gx,
        gy,
        deco
      });
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

  for (const item of renderables) {
    if (item.kind === 'wall-left') {
      const a = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      const b = isoPt(item.gx, item.gy + 1, originX, originY, tileW, tileH);
      drawWallSegment(ctx, a, b, wallH, wainscotH, baseboardH, wallThick, 'left', theme, grain, isNight, item.deco);
    } else if (item.kind === 'wall-right') {
      const a = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      const b = isoPt(item.gx + 1, item.gy, originX, originY, tileW, tileH);
      drawWallSegment(ctx, a, b, wallH, wainscotH, baseboardH, wallThick, 'right', theme, grain, isNight, item.deco);
    } else if (item.kind === 'object') {
      const pt = isoPt(item.gx, item.gy, originX, originY, tileW, tileH);
      drawRoomObject(ctx, item.obj.type, pt.x, pt.y, tileW, {
        editMode,
        highlighted: item.highlighted,
        alpha: movingObjectId === item.obj.id ? 0.65 : 1,
        flip: Boolean(item.obj.flip)
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
