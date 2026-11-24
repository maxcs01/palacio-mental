// Motor Sofisticado de Recorte por Contorno (Sobel Edge-Barrier + Alpha Matting + Defringe + Slicer)
// 100% no navegador, zero uso de GPU pesada, respeita o contorno real dos objetos sem bordas serrilhadas!
import { exportSpriteToDataUrl } from './sprites.js';

/**
 * Analisa as bordas da imagem para modelar fundos lisos, com gradiente/vinheta,
 * ou até "falsos PNGs" quadriculados (checkerboard branco/cinza)!
 */
function analyzeBackgroundModel(d, w, h) {
  const samples = [];
  let transpCount = 0;
  const stepX = Math.max(1, Math.floor(w / 64));
  const stepY = Math.max(1, Math.floor(h / 64));

  const pushPx = (x, y) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 28) {
      transpCount++;
    } else {
      samples.push({ x, y, r: d[i], g: d[i + 1], b: d[i + 2] });
    }
  };

  for (let x = 0; x < w; x += stepX) {
    pushPx(x, 0);
    if (h > 2) pushPx(x, 1);
    pushPx(x, h - 1);
    if (h > 2) pushPx(x, h - 2);
  }
  for (let y = 2; y < h - 2; y += stepY) {
    pushPx(0, y);
    if (w > 2) pushPx(1, y);
    pushPx(w - 1, y);
    if (w > 2) pushPx(w - 2, y);
  }

  if (transpCount > samples.length * 1.1) {
    return { isTransparentBg: true, palette: [[255, 255, 255]], corners: null };
  }

  // Agrupa cores das bordas em buckets (passo 10) para lidar com compressão JPEG e fundos quadriculados
  const buckets = new Map();
  for (const s of samples) {
    const key = `${Math.round(s.r / 10)},${Math.round(s.g / 10)},${Math.round(s.b / 10)}`;
    const entry = buckets.get(key) || { count: 0, sr: 0, sg: 0, sb: 0 };
    entry.count++;
    entry.sr += s.r;
    entry.sg += s.g;
    entry.sb += s.b;
    buckets.set(key, entry);
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const palette = [];

  if (sorted.length > 0) {
    const c1 = sorted[0];
    palette.push([
      Math.round(c1.sr / c1.count),
      Math.round(c1.sg / c1.count),
      Math.round(c1.sb / c1.count)
    ]);
  } else {
    palette.push([255, 255, 255]);
  }

  // Se houver uma 2ª cor expressiva na borda (ex: fundo quadriculado cinza/branco ou degradê), inclui na paleta!
  if (sorted.length > 1 && sorted[1].count >= samples.length * 0.14) {
    const c2 = sorted[1];
    const r2 = Math.round(c2.sr / c2.count);
    const g2 = Math.round(c2.sg / c2.count);
    const b2 = Math.round(c2.sb / c2.count);
    const dist12 = Math.hypot(r2 - palette[0][0], g2 - palette[0][1], b2 - palette[0][2]);
    if (dist12 > 8 && dist12 < 95) {
      palette.push([r2, g2, b2]);
    }
  }

  // Calcula também os 4 cantos médios para interpolar suavemente sombras/vinhetas de iluminação no fundo
  const cornerAvg = (cx0, cy0) => {
    let sr = 0, sg = 0, sb = 0, cnt = 0;
    const radX = Math.max(4, Math.floor(w * 0.06));
    const radY = Math.max(4, Math.floor(h * 0.06));
    for (const s of samples) {
      if (Math.abs(s.x - cx0) <= radX && Math.abs(s.y - cy0) <= radY) {
        const d0 = Math.hypot(s.r - palette[0][0], s.g - palette[0][1], s.b - palette[0][2]);
        if (d0 < 65) {
          sr += s.r; sg += s.g; sb += s.b; cnt++;
        }
      }
    }
    if (cnt === 0) return palette[0];
    return [Math.round(sr / cnt), Math.round(sg / cnt), Math.round(sb / cnt)];
  };

  const corners = {
    tl: cornerAvg(0, 0),
    tr: cornerAvg(w - 1, 0),
    bl: cornerAvg(0, h - 1),
    br: cornerAvg(w - 1, h - 1)
  };

  return { isTransparentBg: false, palette, corners };
}

function getLocalExpectedBg(model, x, y, w, h) {
  if (!model.corners) return model.palette[0];
  const u = w > 1 ? x / (w - 1) : 0;
  const v = h > 1 ? y / (h - 1) : 0;
  const { tl, tr, bl, br } = model.corners;
  const wTL = (1 - u) * (1 - v);
  const wTR = u * (1 - v);
  const wBL = (1 - u) * v;
  const wBR = u * v;
  return [
    tl[0] * wTL + tr[0] * wTR + bl[0] * wBL + br[0] * wBR,
    tl[1] * wTL + tr[1] * wTR + bl[1] * wBL + br[1] * wBR,
    tl[2] * wTL + tr[2] * wTR + bl[2] * wBL + br[2] * wBR
  ];
}

function minBgDistance(r, g, b, model, x, y, w, h) {
  const loc = getLocalExpectedBg(model, x, y, w, h);
  let bestSq = (r - loc[0]) ** 2 + (g - loc[1]) ** 2 + (b - loc[2]) ** 2;
  let bestRgb = loc;

  for (let k = 0; k < model.palette.length; k++) {
    const p = model.palette[k];
    const sq = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
    if (sq < bestSq) {
      bestSq = sq;
      bestRgb = p;
    }
  }
  return { dist: Math.sqrt(bestSq), bgR: bestRgb[0], bgG: bestRgb[1], bgB: bestRgb[2] };
}

/**
 * Calcula barreira de contorno por operador Sobel nos 3 canais RGB + fechamento morfológico de 1px
 * para impedir que o recorte invada áreas claras internas do objeto (ex: caixas brancas, máscaras, rótulos).
 */
function buildContourBarrier(d, w, h, edgeStrength = 38) {
  const grad = new Uint16Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const rPrev = (y - 1) * w;
    const rCur = y * w;
    const rNext = (y + 1) * w;
    for (let x = 1; x < w - 1; x++) {
      let maxMag = 0;
      for (let c = 0; c < 3; c++) {
        const tl = d[(rPrev + x - 1) * 4 + c];
        const tc = d[(rPrev + x) * 4 + c];
        const tr = d[(rPrev + x + 1) * 4 + c];
        const ml = d[(rCur + x - 1) * 4 + c];
        const mr = d[(rCur + x + 1) * 4 + c];
        const bl = d[(rNext + x - 1) * 4 + c];
        const bc = d[(rNext + x) * 4 + c];
        const br = d[(rNext + x + 1) * 4 + c];

        const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const mag = (Math.abs(gx) + Math.abs(gy)) >> 2;
        if (mag > maxMag) maxMag = mag;
      }
      grad[rCur + x] = maxMag;
    }
  }

  // Barreira forte de contorno + fechamento de micro-frestas de 1px no traço do desenho
  const thresh = Math.max(14, Number(edgeStrength) || 38);
  const rawWall = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (grad[p] >= thresh) rawWall[p] = 1;
  }

  // Dilatação 1px seguida de erosão 1px (morphological closing) para selar frestas de 1px no contorno
  const dilated = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (
        rawWall[p] ||
        rawWall[p - 1] || rawWall[p + 1] ||
        rawWall[p - w] || rawWall[p + w]
      ) {
        dilated[p] = 1;
      }
    }
  }

  const closedWall = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (
        dilated[p] &&
        (rawWall[p] ||
          (dilated[p - 1] && dilated[p + 1]) ||
          (dilated[p - w] && dilated[p + w]))
      ) {
        closedWall[p] = 1;
      }
    }
  }

  return { grad, closedWall };
}

/**
 * Aplica recorte inteligente guiado por contorno diretamente no ImageData:
 * 1) Flood-fill adaptativo barrado pelo contorno Sobel
 * 2) Limpeza de vazados internos (ex: alças, pernas de móveis)
 * 3) Alpha Matting sub-pixel + Descontaminação de cor (Defringe — remove halo branco/cinza!)
 * 4) Suavização leve de borda anti-serrilhado
 */
export function applyContourMattingToImageData(
  imgData,
  w,
  h,
  { tolerance = 26, edgeStrength = 38, defringe = true, skipInnerHoles = false } = {}
) {
  const d = imgData.data;
  const model = analyzeBackgroundModel(d, w, h);
  const bgMask = new Uint8Array(w * h);

  if (model.isTransparentBg) {
    for (let p = 0; p < w * h; p++) {
      if (d[p * 4 + 3] < 24) bgMask[p] = 1;
    }
    return { model, bgMask };
  }

  const tol = Math.max(6, Math.min(85, Number(tolerance) || 26));
  const { grad, closedWall } = buildContourBarrier(d, w, h, edgeStrength);

  // Passo 1: Flood-fill geodésico a partir das bordas respeitando a barreira de contorno
  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  const canFlood = (p, isBorderSeed = false) => {
    const i = p * 4;
    if (d[i + 3] < 24) return true;
    // Nunca atravessa uma linha de contorno forte (exceto se for literalmente a mesma cor exata do fundo na borda)
    const x = p % w;
    const y = (p - x) / w;
    const { dist } = minBgDistance(d[i], d[i + 1], d[i + 2], model, x, y, w, h);
    if (closedWall[p] && dist > tol * 0.48 && !isBorderSeed) return false;
    return dist <= tol * 1.38;
  };

  const pushSeed = (p, isBorder = false) => {
    if (visited[p]) return;
    visited[p] = 1;
    if (canFlood(p, isBorder)) {
      bgMask[p] = 1;
      stack[sp++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    pushSeed(x, true);
    pushSeed((h - 1) * w + x, true);
  }
  for (let y = 1; y < h - 1; y++) {
    pushSeed(y * w, true);
    pushSeed(y * w + (w - 1), true);
  }

  // Vizinhança de 8 direções permite contornar cantos diagonais sem prender fundo nos cantos!
  while (sp > 0) {
    const p = stack[--sp];
    d[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;

    if (x > 0) pushSeed(p - 1);
    if (x < w - 1) pushSeed(p + 1);
    if (y > 0) pushSeed(p - w);
    if (y < h - 1) pushSeed(p + w);
    if (x > 0 && y > 0) pushSeed(p - w - 1);
    if (x < w - 1 && y > 0) pushSeed(p - w + 1);
    if (x > 0 && y < h - 1) pushSeed(p + w - 1);
    if (x < w - 1 && y < h - 1) pushSeed(p + w + 1);
  }

  // Passo 2: Vazados internos claramente da cor exata do fundo (ex: vão entre alças, pernas de cadeira/maca)
  if (!skipInnerHoles) {
    const holeVis = new Uint8Array(w * h);
    const holeTol = Math.max(7, tol * 0.62);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const p0 = y * w + x;
        if (bgMask[p0] || holeVis[p0] || closedWall[p0]) continue;
        const i0 = p0 * 4;
        const { dist: d0 } = minBgDistance(d[i0], d[i0 + 1], d[i0 + 2], model, x, y, w, h);
        if (d0 > holeTol) continue;

        // Só abre vazado interno se for cercado por contorno nítido (evita furar rótulos brancos!)
        const comp = [];
        let qs = 0;
        let borderWallHits = 0;
        let borderTotal = 0;
        holeVis[p0] = 1;
        stack[qs++] = p0;

        while (qs > 0) {
          const p = stack[--qs];
          comp.push(p);
          const px = p % w;
          const py = (p - px) / w;
          const nbs = [
            px > 0 ? p - 1 : -1,
            px < w - 1 ? p + 1 : -1,
            py > 0 ? p - w : -1,
            py < h - 1 ? p + w : -1
          ];
          for (let k = 0; k < 4; k++) {
            const np = nbs[k];
            if (np < 0 || bgMask[np]) continue;
            const npy = Math.floor(np / w);
            const npx = np - npy * w;
            const ni = np * 4;
            const { dist: nd } = minBgDistance(d[ni], d[ni + 1], d[ni + 2], model, npx, npy, w, h);
            if (nd <= holeTol && !closedWall[np]) {
              if (!holeVis[np]) {
                holeVis[np] = 1;
                stack[qs++] = np;
              }
            } else {
              borderTotal++;
              if (closedWall[np] || grad[np] >= 28) borderWallHits++;
            }
          }
        }

        const wallRatio = borderTotal > 0 ? borderWallHits / borderTotal : 0;
        if (comp.length >= 28 && comp.length < w * h * 0.06 && wallRatio >= 0.68) {
          for (let k = 0; k < comp.length; k++) {
            const cp = comp[k];
            d[cp * 4 + 3] = 0;
            bgMask[cp] = 1;
          }
        }
      }
    }
  }

  // Passo 3: Remove micro-ilhas isoladas de ruído de fundo (1 a 6 pixels soltos fora do objeto)
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (bgMask[p]) continue;
      const transpNeighbors =
        bgMask[p - 1] + bgMask[p + 1] + bgMask[p - w] + bgMask[p + w] +
        bgMask[p - w - 1] + bgMask[p - w + 1] + bgMask[p + w - 1] + bgMask[p + w + 1];
      if (transpNeighbors >= 7) {
        d[p * 4 + 3] = 0;
        bgMask[p] = 1;
      }
    }
  }

  // Passo 4: Alpha Matting de Contorno (faixa de 2px) + Descontaminação de Cor (Defringe)
  // Elimina completamente o "serrilhado branco/cinza" ao redor do contorno do objeto!
  const edgeBand = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (bgMask[p]) continue;
      if (bgMask[p - 1] || bgMask[p + 1] || bgMask[p - w] || bgMask[p + w]) {
        edgeBand[p] = 1; // 1px da borda externa
      }
    }
  }
  for (let y = 2; y < h - 2; y++) {
    const row = y * w;
    for (let x = 2; x < w - 2; x++) {
      const p = row + x;
      if (bgMask[p] || edgeBand[p]) continue;
      if (edgeBand[p - 1] || edgeBand[p + 1] || edgeBand[p - w] || edgeBand[p + w]) {
        edgeBand[p] = 2; // 2px da borda externa
      }
    }
  }

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      const ring = edgeBand[p];
      if (!ring) continue;

      const i = p * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const { dist, bgR, bgG, bgB } = minBgDistance(r, g, b, model, x, y, w, h);

      // Faixa suave proporcional à distância da cor do fundo
      const low = ring === 1 ? tol * 0.42 : tol * 0.25;
      const high = ring === 1 ? tol * 2.15 : tol * 1.45;

      if (dist < high) {
        let alphaNorm = Math.max(0, Math.min(1, (dist - low) / Math.max(1, high - low)));
        // Curva suave (smoothstep) para contorno sedoso sem degraus
        alphaNorm = alphaNorm * alphaNorm * (3 - 2 * alphaNorm);

        // Preserva linhas escuras de contorno (tinta preta/marrom) bem firmes!
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
        if (bgLum - lum > 75) {
          alphaNorm = Math.max(alphaNorm, 0.92);
        }

        const newAlpha = Math.round(alphaNorm * 255);
        d[i + 3] = Math.min(d[i + 3], newAlpha);

        // Descontaminação RGB (Defringe): recupera a cor pura do traço sem mistura com o fundo!
        if (defringe && alphaNorm > 0.08 && alphaNorm < 0.96) {
          const inv = 1 - alphaNorm;
          d[i] = Math.max(0, Math.min(255, Math.round((r - inv * bgR) / alphaNorm)));
          d[i + 1] = Math.max(0, Math.min(255, Math.round((g - inv * bgG) / alphaNorm)));
          d[i + 2] = Math.max(0, Math.min(255, Math.round((b - inv * bgB) / alphaNorm)));
        }
      }
    }
  }

  // Passo 5: Anti-aliasing leve apenas no canal Alpha da borda externa (suaviza diagonais isométricas)
  const alphaSnap = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) alphaSnap[p] = d[p * 4 + 3];

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      if (edgeBand[p] !== 1) continue;
      const aC = alphaSnap[p];
      if (aC === 0 || aC > 242) continue;
      const avg =
        (alphaSnap[p] * 4 +
          alphaSnap[p - 1] +
          alphaSnap[p + 1] +
          alphaSnap[p - w] +
          alphaSnap[p + w]) >> 3;
      d[p * 4 + 3] = avg;
    }
  }

  return { model, bgMask };
}

/**
 * Auto-recorta o canvas para a caixa exata de pixels visíveis.
 */
export function autoCropTransparentCanvas(sourceCanvas, pad = 4) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, w, h).data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (d[(row + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return sourceCanvas;

  const x1 = Math.max(0, minX - pad);
  const y1 = Math.max(0, minY - pad);
  const x2 = Math.min(w - 1, maxX + pad);
  const y2 = Math.min(h - 1, maxY + pad);
  const cw = Math.max(1, x2 - x1 + 1);
  const ch = Math.max(1, y2 - y1 + 1);

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(sourceCanvas, x1, y1, cw, ch, 0, 0, cw, ch);
  return out;
}

/**
 * Recorta 1 objeto individual preservando proporção original (sem esticar!) e contorno limpo.
 */
export function smartCutoutSingleImage(
  img,
  { tolerance = 26, edgeStrength = 38, defringe = true, skipInnerHoles = false, maxDim = 512 } = {}
) {
  const rawW = img.naturalWidth || img.width || 512;
  const rawH = img.naturalHeight || img.height || 512;
  const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const w = Math.max(32, Math.round(rawW * scale));
  const h = Math.max(32, Math.round(rawH * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  applyContourMattingToImageData(imgData, w, h, { tolerance, edgeStrength, defringe, skipInnerHoles });
  ctx.putImageData(imgData, 0, 0);

  // Guarda uma cópia da imagem original redimensionada para permitir o pincel "Restaurar" se o usuário quiser retocar!
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  origCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

  return {
    workCanvas: work,
    origCanvas,
    croppedCanvas: autoCropTransparentCanvas(work, 4)
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

  const sub = document.createElement('canvas');
  sub.width = cw;
  sub.height = ch;
  sub.getContext('2d').drawImage(rgbaCanvas, x1, y1, cw, ch, 0, 0, cw, ch);

  const tight = autoCropTransparentCanvas(sub, 3);
  return {
    canvas: tight,
    dataUrl: exportSpriteToDataUrl(tight, 256),
    width: tight.width,
    height: tight.height
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
 * Detecta, aplica recorte de contorno sofisticado (Sobel + Defringe) e separa todos os objetos de uma folha.
 */
export function sliceSpriteSheet(
  img,
  { tolerance = 26, mergeGap = 14, edgeStrength = 38, minSize = 22 } = {}
) {
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
  const { model, bgMask } = applyContourMattingToImageData(imgData, w, h, {
    tolerance,
    edgeStrength,
    defringe: true,
    skipInnerHoles: false
  });
  ctx.putImageData(imgData, 0, 0);
  const d = imgData.data;

  // Grade reduzida para agrupamento rápido de partes próximas (ex: objeto + plaquinha)
  const step = Math.max(2, Math.round(Math.max(w, h) / 380));
  const gw = Math.ceil(w / step);
  const gh = Math.ceil(h / step);
  const fgGrid = new Uint8Array(gw * gh);

  for (let y = 0; y < h; y++) {
    const gy = Math.floor(y / step);
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!bgMask[row + x] && d[(row + x) * 4 + 3] > 32) {
        fgGrid[gy * gw + Math.floor(x / step)] = 1;
      }
    }
  }

  // Dilatação separável horizontal + vertical
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

  // Componentes conectados na grade dilatada
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

    const sx1 = Math.max(0, minGx * step);
    const sy1 = Math.max(0, minGy * step);
    const sx2 = Math.min(w - 1, (maxGx + 1) * step - 1);
    const sy2 = Math.min(h - 1, (maxGy + 1) * step - 1);

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = sy1; y <= sy2; y++) {
      const row = y * w;
      for (let x = sx1; x <= sx2; x++) {
        if (!bgMask[row + x] && d[(row + x) * 4 + 3] > 32) {
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

  rawBoxes.sort((a, b) => {
    const ay = (a.minY + a.maxY) / 2;
    const by = (b.minY + b.maxY) / 2;
    const rowH = Math.max(a.bh, b.bh, 40) * 0.55;
    if (Math.abs(ay - by) > rowH) return ay - by;
    return a.minX - b.minX;
  });

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
    bgColor: model.palette[0],
    items
  };
}
