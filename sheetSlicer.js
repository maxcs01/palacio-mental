// Recortador Automático de Folhas com Vários Objetos (100% no navegador, grátis e sem IA!)
import { exportSpriteToDataUrl } from './sprites.js';

function detectBorderBackground(d, w, h) {
  const samples = [];
  let transpCount = 0;
  const stepX = Math.max(1, Math.floor(w / 40));
  const stepY = Math.max(1, Math.floor(h / 40));

  const pushPx = (x, y) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 24) {
      transpCount++;
    } else {
      samples.push([d[i], d[i + 1], d[i + 2]]);
    }
  };

  for (let x = 0; x < w; x += stepX) {
    pushPx(x, 0);
    pushPx(x, h - 1);
  }
  for (let y = 0; y < h; y += stepY) {
    pushPx(0, y);
    pushPx(w - 1, y);
  }

  if (transpCount > samples.length) {
    return { isTransparentBg: true, r: 255, g: 255, b: 255 };
  }

  // Histograma quantizado (passo 8) para achar a cor dominante da borda mesmo com compressão JPEG
  const buckets = new Map();
  for (const [r, g, b] of samples) {
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    const entry = buckets.get(key) || { count: 0, sr: 0, sg: 0, sb: 0 };
    entry.count++;
    entry.sr += r;
    entry.sg += g;
    entry.sb += b;
    buckets.set(key, entry);
  }

  let best = { count: 0, sr: 255, sg: 255, sb: 255 };
  for (const entry of buckets.values()) {
    if (entry.count > best.count) best = entry;
  }

  const denom = Math.max(1, best.count);
  return {
    isTransparentBg: false,
    r: Math.round(best.sr / denom),
    g: Math.round(best.sg / denom),
    b: Math.round(best.sb / denom)
  };
}

function cropCleanBox(rgbaCanvas, box, pad = 4) {
  const w = rgbaCanvas.width;
  const h = rgbaCanvas.height;
  const x1 = Math.max(0, box.minX - pad);
  const y1 = Math.max(0, box.minY - pad);
  const x2 = Math.min(w - 1, box.maxX + pad);
  const y2 = Math.min(h - 1, box.maxY + pad);
  const cw = Math.max(1, x2 - x1 + 1);
  const ch = Math.max(1, y2 - y1 + 1);

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(rgbaCanvas, x1, y1, cw, ch, 0, 0, cw, ch);
  return {
    canvas: out,
    dataUrl: exportSpriteToDataUrl(out, 256),
    width: cw,
    height: ch
  };
}

/**
 * Une duas ou mais caixas selecionadas pelo usuário em um único objeto recortado.
 */
export function mergeSlicedBoxes(rgbaCanvas, boxes) {
  if (!rgbaCanvas || !boxes || boxes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  const unionBox = { minX, minY, maxX, maxY };
  const cropped = cropCleanBox(rgbaCanvas, unionBox, 4);
  return {
    box: unionBox,
    dataUrl: cropped.dataUrl,
    width: cropped.width,
    height: cropped.height
  };
}

/**
 * Detecta, remove o fundo e separa automaticamente todos os objetos de uma imagem/folha.
 * Funciona com fundo branco, cinza, colorido uniforme ou PNG transparente.
 */
export function sliceSpriteSheet(img, { tolerance = 24, mergeGap = 14, minSize = 24 } = {}) {
  const maxLongEdge = 1500;
  const rawW = img.naturalWidth || img.width || 512;
  const rawH = img.naturalHeight || img.height || 512;
  const scale = Math.min(1, maxLongEdge / Math.max(rawW, rawH));
  const w = Math.max(32, Math.round(rawW * scale));
  const h = Math.max(32, Math.round(rawH * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const bg = detectBorderBackground(d, w, h);
  const tol = Math.max(6, Math.min(80, Number(tolerance) || 24));
  const tolDistSq = (tol * 1.48) * (tol * 1.48);

  const isBgColor = (i) => {
    if (d[i + 3] < 24) return true;
    if (bg.isTransparentBg) return false;
    const dr = d[i] - bg.r;
    const dg = d[i + 1] - bg.g;
    const db = d[i + 2] - bg.b;
    return Math.abs(dr) <= tol && Math.abs(dg) <= tol && Math.abs(db) <= tol && (dr * dr + dg * dg + db * db) <= tolDistSq;
  };

  // Passo 1: Flood-fill a partir das bordas para tornar todo o fundo transparente
  const bgMask = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  const trySeed = (p) => {
    if (bgMask[p]) return;
    if (isBgColor(p * 4)) {
      bgMask[p] = 1;
      stack[sp++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    trySeed(x);
    trySeed((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    trySeed(y * w);
    trySeed(y * w + (w - 1));
  }

  while (sp > 0) {
    const p = stack[--sp];
    d[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) trySeed(p - 1);
    if (x < w - 1) trySeed(p + 1);
    if (y > 0) trySeed(p - w);
    if (y < h - 1) trySeed(p + w);
  }

  // Passo 2: Limpar também "ilhas internas" de fundo grande (ex: entre alças de estetoscópio ou buracos grandes)
  if (!bg.isTransparentBg) {
    const holeTol = Math.max(8, Math.round(tol * 0.78));
    const isStrongBg = (i) => {
      if (d[i + 3] === 0) return false;
      return (
        Math.abs(d[i] - bg.r) <= holeTol &&
        Math.abs(d[i + 1] - bg.g) <= holeTol &&
        Math.abs(d[i + 2] - bg.b) <= holeTol
      );
    };
    // Suavização de 1px na borda para evitar halo da cor de fundo
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (bgMask[p]) continue;
        if (bgMask[p - 1] || bgMask[p + 1] || bgMask[p - w] || bgMask[p + w]) {
          const i = p * 4;
          const dist = Math.hypot(d[i] - bg.r, d[i + 1] - bg.g, d[i + 2] - bg.b);
          if (dist < tol * 2.1) {
            d[i + 3] = Math.min(d[i + 3], Math.max(0, Math.round(((dist - tol * 0.7) / (tol * 1.4)) * 255)));
          }
        }
      }
    }
    // Remove buracos internos claramente da mesma cor exata do fundo (ex: interior de máscara/estetoscópio)
    const innerVis = new Uint8Array(w * h);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const p0 = y * w + x;
        if (bgMask[p0] || innerVis[p0] || !isStrongBg(p0 * 4)) continue;
        const comp = [];
        let qs = 0;
        innerVis[p0] = 1;
        stack[qs++] = p0;
        while (qs > 0) {
          const p = stack[--qs];
          comp.push(p);
          const px = p % w;
          const py = (p - px) / w;
          const nb = [
            px > 0 ? p - 1 : -1,
            px < w - 1 ? p + 1 : -1,
            py > 0 ? p - w : -1,
            py < h - 1 ? p + w : -1
          ];
          for (let k = 0; k < 4; k++) {
            const np = nb[k];
            if (np >= 0 && !bgMask[np] && !innerVis[np] && isStrongBg(np * 4)) {
              innerVis[np] = 1;
              stack[qs++] = np;
            }
          }
        }
        if (comp.length >= 24 && comp.length < w * h * 0.08) {
          for (let k = 0; k < comp.length; k++) {
            d[comp[k] * 4 + 3] = 0;
            bgMask[comp[k]] = 1;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Passo 3: Grade reduzida para agrupamento ultrarrápido de partes próximas (ex: objeto + plaquinha)
  const step = Math.max(2, Math.round(Math.max(w, h) / 380));
  const gw = Math.ceil(w / step);
  const gh = Math.ceil(h / step);
  const fgGrid = new Uint8Array(gw * gh);

  for (let y = 0; y < h; y++) {
    const gy = Math.floor(y / step);
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!bgMask[row + x] && d[(row + x) * 4 + 3] > 28) {
        fgGrid[gy * gw + Math.floor(x / step)] = 1;
      }
    }
  }

  // Dilatação separável horizontal + vertical (O(gw*gh))
  const dilR = Math.max(0, Math.round((Number(mergeGap) || 0) / step));
  let dilMask = fgGrid;
  if (dilR > 0) {
    const tmp = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const rOff = gy * gw;
      let run = 0;
      for (let gx = 0; gx < Math.min(gw, dilR + 1); gx++) run += fgGrid[rOff + gx];
      for (let gx = 0; gx < gw; gx++) {
        if (run > 0) tmp[rOff + gx] = 1;
        const rem = gx - dilR;
        const add = gx + dilR + 1;
        if (rem >= 0) run -= fgGrid[rOff + rem];
        if (add < gw) run += fgGrid[rOff + add];
      }
    }
    const tmp2 = new Uint8Array(gw * gh);
    for (let gx = 0; gx < gw; gx++) {
      let run = 0;
      for (let gy = 0; gy < Math.min(gh, dilR + 1); gy++) run += tmp[gy * gw + gx];
      for (let gy = 0; gy < gh; gy++) {
        if (run > 0) tmp2[gy * gw + gx] = 1;
        const rem = gy - dilR;
        const add = gy + dilR + 1;
        if (rem >= 0) run -= tmp[rem * gw + gx];
        if (add < gh) run += tmp[add * gw + gx];
      }
    }
    dilMask = tmp2;
  }

  // Passo 4: Componentes conectados na grade dilatada, medindo caixa exata pelos pixels reais (sem dilatação)
  const vis = new Uint8Array(gw * gh);
  const gStack = new Int32Array(gw * gh);
  const rawBoxes = [];

  for (let gp0 = 0; gp0 < gw * gh; gp0++) {
    if (!dilMask[gp0] || vis[gp0]) continue;
    let gsp = 0;
    vis[gp0] = 1;
    gStack[gsp++] = gp0;

    let minGx = gw, minGy = gh, maxGx = -1, maxGy = -1;
    let fgCells = 0;

    while (gsp > 0) {
      const gp = gStack[--gsp];
      const gx = gp % gw;
      const gy = (gp - gx) / gw;
      if (fgGrid[gp]) {
        fgCells++;
        if (gx < minGx) minGx = gx;
        if (gx > maxGx) maxGx = gx;
        if (gy < minGy) minGy = gy;
        if (gy > maxGy) maxGy = gy;
      }
      if (gx > 0 && dilMask[gp - 1] && !vis[gp - 1]) { vis[gp - 1] = 1; gStack[gsp++] = gp - 1; }
      if (gx < gw - 1 && dilMask[gp + 1] && !vis[gp + 1]) { vis[gp + 1] = 1; gStack[gsp++] = gp + 1; }
      if (gy > 0 && dilMask[gp - gw] && !vis[gp - gw]) { vis[gp - gw] = 1; gStack[gsp++] = gp - gw; }
      if (gy < gh - 1 && dilMask[gp + gw] && !vis[gp + gw]) { vis[gp + gw] = 1; gStack[gsp++] = gp + gw; }
    }

    if (fgCells === 0 || maxGx < minGx) continue;

    // Refina a caixa nos pixels reais em alta resolução
    const sx1 = Math.max(0, minGx * step);
    const sy1 = Math.max(0, minGy * step);
    const sx2 = Math.min(w - 1, (maxGx + 1) * step - 1);
    const sy2 = Math.min(h - 1, (maxGy + 1) * step - 1);

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = sy1; y <= sy2; y++) {
      const row = y * w;
      for (let x = sx1; x <= sx2; x++) {
        if (!bgMask[row + x] && d[(row + x) * 4 + 3] > 28) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw >= minSize || bh >= minSize) {
      if (bw * bh >= minSize * minSize * 0.55) {
        rawBoxes.push({ minX, minY, maxX, maxY, bw, bh });
      }
    }
  }

  // Passo 5: Ordena em ordem natural de leitura (linhas de cima para baixo, colunas da esquerda para direita)
  rawBoxes.sort((a, b) => {
    const ay = (a.minY + a.maxY) / 2;
    const by = (b.minY + b.maxY) / 2;
    const rowH = Math.max(a.bh, b.bh, 40) * 0.55;
    if (Math.abs(ay - by) > rowH) return ay - by;
    return a.minX - b.minX;
  });

  // Limite de segurança de 48 objetos por folha
  const items = rawBoxes.slice(0, 48).map((box, idx) => {
    const cropped = cropCleanBox(work, box, 4);
    return {
      id: `slice-${idx}-${Date.now()}`,
      box,
      dataUrl: cropped.dataUrl,
      width: cropped.width,
      height: cropped.height,
      selected: true,
      name: `Objeto ${idx + 1}`
    };
  });

  return {
    rgbaCanvas: work,
    bgColor: bg,
    items
  };
}
