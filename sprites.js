// Desenho Isométrico 2.5D Ilustrado (contorno escuro limpo + texturas aconchegantes + sprites HD)
import { ROOM_THEMES } from './data.js';

export const INK = '#2b2520';

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

export function drawPixelBuilding(ctx, x, y, w, h, baseColor, condition, isNight, label) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h - 10;

  // Sombra isométrica suave no chão
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 46, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halo sutil indicando prédio clicável
  ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.7)' : 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 48, 24, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Paleta conforme estado de conservação (Novo / Desgastado / Velho)
  let topCol = baseColor || '#5a7a61';
  let leftCol = '#ede9dd';
  let rightCol = '#d6d1c4';
  if (condition === 'worn') {
    leftCol = '#d8d3c8';
    rightCol = '#bdb7aa';
  } else if (condition === 'old') {
    topCol = '#64748b';
    leftCol = '#94a3b8';
    rightCol = '#758599';
  }

  // Corpo isométrico do prédio (2 andares)
  drawIsoBox(ctx, cx, cy, 78, 40, 50, '#f8f6ef', leftCol, rightCol, INK);
  // Cobertura / Telhado colorido
  drawIsoBox(ctx, cx, cy - 50, 82, 42, 10, topCol, topCol, '#334155', INK);

  // Cruz médica no topo isométrico
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillRect(cx - 3, cy - 66, 6, 12);
  ctx.fillRect(cx - 7, cy - 63, 14, 6);

  // Janelas na face esquerda e direita
  const winCol = isNight && condition !== 'old' ? '#fde047' : condition === 'old' ? '#1e293b' : '#7ba4c7';
  ctx.fillStyle = winCol;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const lx = cx - 30 + col * 14;
      const ly = cy - 36 + row * 18 + col * 7;
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx + 9, ly + 4.5); ctx.lineTo(lx + 9, ly + 13); ctx.lineTo(lx, ly + 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const rx = cx + 8 + col * 14;
      const ry = cy - 29 + row * 18 - col * 7;
      ctx.beginPath();
      ctx.moveTo(rx, ry); ctx.lineTo(rx + 9, ry - 4.5); ctx.lineTo(rx + 9, ry + 4); ctx.lineTo(rx, ry + 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Porta da recepção na face direita inferior
  ctx.fillStyle = isNight ? '#fef08a' : '#334155';
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy + 12); ctx.lineTo(cx + 22, cy + 7); ctx.lineTo(cx + 22, cy - 6); ctx.lineTo(cx + 12, cy - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (condition === 'worn' || condition === 'old') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 10); ctx.lineTo(cx - 18, cy - 4); ctx.lineTo(cx - 20, cy + 3);
    ctx.stroke();
  }
  if (condition === 'old') {
    ctx.fillStyle = '#4d6b53';
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy + 12, 10, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 26, cy + 10, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Placa limpa com nome da especialidade
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  const tagW = Math.max(76, label.length * 7 + 14);
  ctx.beginPath();
  ctx.roundRect(cx - tagW / 2, cy - 92, tagW, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - 79);

  ctx.restore();
}

export function drawHouse(ctx, x, y, roofColor, isNight) {
  ctx.save();
  const cx = x + 18;
  const cy = y + 24;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  drawIsoBox(ctx, cx, cy, 34, 18, 18, '#f1ede4', '#e8e2d5', '#d6cfc0', INK);
  drawIsoBox(ctx, cx, cy - 18, 38, 20, 6, roofColor, roofColor, '#334155', INK);
  ctx.fillStyle = isNight ? '#fde047' : '#7ba4c7';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillRect(cx - 11, cy - 10, 6, 6);
  ctx.strokeRect(cx - 11, cy - 10, 6, 6);
  ctx.restore();
}

export function drawMuseum(ctx, x, y, isNight) {
  ctx.save();
  const cx = x + 36;
  const cy = y + 36;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 38, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  drawIsoBox(ctx, cx, cy, 62, 32, 30, '#fef3c7', '#f5e8c7', '#e2d0a7', INK);
  drawIsoBox(ctx, cx, cy - 30, 66, 34, 8, '#b45309', '#92400e', '#78350f', INK);
  ctx.fillStyle = isNight ? '#fde047' : INK;
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MUSEU', cx, cy - 42);
  ctx.restore();
}

export function drawTree(ctx, x, y, wilted) {
  ctx.save();
  const cx = x + 10;
  const cy = y + 20;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#855f40';
  ctx.fillRect(cx - 3, cy - 8, 6, 12);
  ctx.strokeRect(cx - 3, cy - 8, 6, 12);

  if (wilted) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 8, cy - 16);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy - 15);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#4d6b53';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b8e72';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 17, 7, 0, Math.PI * 2);
    ctx.fill();
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

  // Anel sutil pulsante para identificar colegas online clicáveis
  if (isOnlinePeer) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
  }

  // Sombra suave no chão
  ctx.fillStyle = 'rgba(20, 18, 16, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sapatinhos
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(-2.8, 7.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(2.8, 7.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo / Scrubs coloridos
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(-6.5, -6, 13, 13, 4);
  ctx.fill();
  ctx.stroke();

  // Jaleco branco aberto por cima (dá charme médico ilustrado!)
  ctx.fillStyle = '#faf8f2';
  ctx.beginPath();
  ctx.roundRect(-7, -5.5, 4.4, 12, 2);
  ctx.roundRect(2.6, -5.5, 4.4, 12, 2);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#fcd5b5';
  ctx.beginPath();
  ctx.arc(0, -12, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cabelo ilustrado
  ctx.fillStyle = '#47362b';
  ctx.beginPath();
  ctx.arc(0, -13.5, 6.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(3, -15, -4, -14.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Olhinhos simpáticos
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
    // Pontinha do balão
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
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + (horizontal ? 12 : 7), y + (horizontal ? 11 : 18), horizontal ? 12 : 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  if (horizontal) {
    ctx.beginPath();
    ctx.roundRect(x, y, 24, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 6, y + 2, 11, 5);
    ctx.strokeRect(x + 6, y + 2, 11, 5);
  } else {
    ctx.beginPath();
    ctx.roundRect(x, y, 14, 21, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 2, y + 5, 10, 8);
    ctx.strokeRect(x + 2, y + 5, 10, 8);
  }
  ctx.restore();
}

// ---------------- TEXTURAS PROCEDURAIS ILUSTRADAS PARA OS QUARTOS ----------------
// Gera uma textura sutil de grão/reboco/cerâmica em canvas offscreen para combinar com os sprites 2.5D
let grainPatternCache = null;
function getPaperGrainPattern(ctx) {
  if (grainPatternCache) return grainPatternCache;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = c.getContext('2d');
  // Grão quente bem sutil (estilo ilustração em papel/aquarela)
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

function isoPt(gx, gy, originX, originY, tileW, tileH) {
  return {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2)
  };
}

/**
 * Desenha a arquitetura completa do quarto isométrico 2.5D ilustrado:
 * - Paredes com espessura 3D de corte, textura suave, meia-parede com friso e rodapé
 * - Janela ilustrada com feixe de luz natural (ou luar à noite)
 * - Porta clínica + quadro anatômico na parede direita
 * - Piso com textura cerâmica ou madeira + sombra de contato nas paredes + base 3D
 */
export function drawIllustratedRoomShell(ctx, {
  originX, originY, tileW, tileH, cols, rows,
  themeId = 'clinic', isNight = false, editMode = false,
  hoverTile = null, selectedMoveTile = null
}) {
  const theme = getRoomTheme(themeId);
  const wallH = Math.floor(tileW * 1.32);
  const wallThick = Math.max(8, Math.floor(tileW * 0.14));
  const slabH = Math.max(12, Math.floor(tileW * 0.22));
  const wainscotH = Math.floor(wallH * 0.34);
  const baseboardH = Math.max(6, Math.floor(tileW * 0.11));

  const p0 = isoPt(0, 0, originX, originY, tileW, tileH);
  const pLeft = isoPt(0, rows, originX, originY, tileW, tileH);
  const pRight = isoPt(cols, 0, originX, originY, tileW, tileH);
  const pFront = isoPt(cols, rows, originX, originY, tileW, tileH);

  // Vetores unitários de espessura de parede para fora
  const outLeftX = -wallThick;
  const outLeftY = -wallThick * 0.5;
  const outRightX = wallThick;
  const outRightY = -wallThick * 0.5;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Sombra suave projetada debaixo de toda a maquete do quarto
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.moveTo(pLeft.x - 10, pLeft.y + slabH + 10);
  ctx.lineTo(pFront.x, pFront.y + slabH + 22);
  ctx.lineTo(pRight.x + 10, pRight.y + slabH + 10);
  ctx.lineTo(p0.x, p0.y + slabH + 8);
  ctx.closePath();
  ctx.fill();

  // 2. Base 3D da laje do piso (faces frontais esquerda e direita)
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;

  // Borda frontal esquerda (pLeft -> pFront)
  ctx.fillStyle = theme.slabLeft;
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y);
  ctx.lineTo(pFront.x, pFront.y);
  ctx.lineTo(pFront.x, pFront.y + slabH);
  ctx.lineTo(pLeft.x, pLeft.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Borda frontal direita (pFront -> pRight)
  ctx.fillStyle = theme.slabRight;
  ctx.beginPath();
  ctx.moveTo(pFront.x, pFront.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(pRight.x, pRight.y + slabH);
  ctx.lineTo(pFront.x, pFront.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Parede Traseira Esquerda (gradiente de luz + textura)
  const gradL = ctx.createLinearGradient(p0.x, p0.y - wallH, pLeft.x, pLeft.y);
  gradL.addColorStop(0, theme.wallLeft);
  gradL.addColorStop(1, theme.wallLeftShade);
  ctx.fillStyle = gradL;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();

  const grain = getPaperGrainPattern(ctx);
  if (grain) {
    ctx.fillStyle = grain;
    ctx.fill();
  }
  ctx.stroke();

  // Meia-parede esquerda (wainscoting) + painéis sutis
  ctx.fillStyle = theme.wainscotLeft;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wainscotH);
  ctx.lineTo(pLeft.x, pLeft.y - wainscotH);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  if (grain) { ctx.fillStyle = grain; ctx.fill(); }
  ctx.stroke();

  // Moldura/friso superior da meia-parede esquerda
  ctx.fillStyle = theme.railColor;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wainscotH - 5);
  ctx.lineTo(pLeft.x, pLeft.y - wainscotH - 5);
  ctx.lineTo(pLeft.x, pLeft.y - wainscotH + 1);
  ctx.lineTo(p0.x, p0.y - wainscotH + 1);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Rodapé esquerdo
  ctx.fillStyle = theme.baseboardLeft;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - baseboardH);
  ctx.lineTo(pLeft.x, pLeft.y - baseboardH);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Parede Traseira Direita (sombreada + textura)
  ctx.lineWidth = 2;
  const gradR = ctx.createLinearGradient(p0.x, p0.y - wallH, pRight.x, pRight.y);
  gradR.addColorStop(0, theme.wallRight);
  gradR.addColorStop(1, theme.wallRightShade);
  ctx.fillStyle = gradR;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pRight.x, pRight.y - wallH);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  if (grain) { ctx.fillStyle = grain; ctx.fill(); }
  ctx.stroke();

  // Meia-parede direita
  ctx.fillStyle = theme.wainscotRight;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wainscotH);
  ctx.lineTo(pRight.x, pRight.y - wainscotH);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  if (grain) { ctx.fillStyle = grain; ctx.fill(); }
  ctx.stroke();

  // Friso superior da meia-parede direita
  ctx.fillStyle = theme.railColor;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wainscotH - 5);
  ctx.lineTo(pRight.x, pRight.y - wainscotH - 5);
  ctx.lineTo(pRight.x, pRight.y - wainscotH + 1);
  ctx.lineTo(p0.x, p0.y - wainscotH + 1);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Rodapé direito
  ctx.fillStyle = theme.baseboardRight;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - baseboardH);
  ctx.lineTo(pRight.x, pRight.y - baseboardH);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Espessura 3D do corte das paredes (topo + laterais externas)
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;

  // Topo da parede esquerda
  ctx.fillStyle = theme.wallTop;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pLeft.x, pLeft.y - wallH);
  ctx.lineTo(pLeft.x + outLeftX, pLeft.y - wallH + outLeftY);
  ctx.lineTo(p0.x + outLeftX, p0.y - wallH + outLeftY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Topo da parede direita
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(pRight.x, pRight.y - wallH);
  ctx.lineTo(pRight.x + outRightX, pRight.y - wallH + outRightY);
  ctx.lineTo(p0.x + outRightX, p0.y - wallH + outRightY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Quina superior (tampão do vértice)
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH);
  ctx.lineTo(p0.x + outLeftX, p0.y - wallH + outLeftY);
  ctx.lineTo(p0.x, p0.y - wallH + outLeftY * 2);
  ctx.lineTo(p0.x + outRightX, p0.y - wallH + outRightY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Corte frontal esquerdo da parede
  ctx.fillStyle = theme.wallRightShade;
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y - wallH);
  ctx.lineTo(pLeft.x + outLeftX, pLeft.y - wallH + outLeftY);
  ctx.lineTo(pLeft.x + outLeftX, pLeft.y + slabH + outLeftY);
  ctx.lineTo(pLeft.x, pLeft.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Corte frontal direito da parede
  ctx.fillStyle = theme.wallLeftShade;
  ctx.beginPath();
  ctx.moveTo(pRight.x, pRight.y - wallH);
  ctx.lineTo(pRight.x + outRightX, pRight.y - wallH + outRightY);
  ctx.lineTo(pRight.x + outRightX, pRight.y + slabH + outRightY);
  ctx.lineTo(pRight.x, pRight.y + slabH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6. Janela Ilustrada na parede esquerda (entre gy=1.3 e gy=3.5)
  const wA = isoPt(0, 1.35, originX, originY, tileW, tileH);
  const wB = isoPt(0, 3.65, originX, originY, tileW, tileH);
  const wBot = wainscotH + Math.floor(wallH * 0.08);
  const wTop = wallH - Math.floor(wallH * 0.14);

  // Moldura externa da janela
  ctx.fillStyle = '#f8f5ec';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(wA.x, wA.y - wTop);
  ctx.lineTo(wB.x, wB.y - wTop);
  ctx.lineTo(wB.x, wB.y - wBot);
  ctx.lineTo(wA.x, wA.y - wBot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vidro da janela (dia ensolarado ou noite estrelada)
  const glassGrad = ctx.createLinearGradient(wA.x, wA.y - wTop, wB.x, wB.y - wBot);
  if (isNight) {
    glassGrad.addColorStop(0, '#1e3a5f');
    glassGrad.addColorStop(1, '#314e78');
  } else {
    glassGrad.addColorStop(0, '#bfe3f7');
    glassGrad.addColorStop(1, '#e8f6fd');
  }
  const pad = 5;
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(wA.x - pad * 0.8, wA.y - wTop + pad * 1.1);
  ctx.lineTo(wB.x + pad * 0.8, wB.y - wTop + pad * 0.3);
  ctx.lineTo(wB.x + pad * 0.8, wB.y - wBot - pad * 1.1);
  ctx.lineTo(wA.x - pad * 0.8, wA.y - wBot - pad * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Divisória central da janela
  const wMidX = (wA.x + wB.x) / 2;
  const wMidY = (wA.y + wB.y) / 2;
  ctx.strokeStyle = '#f8f5ec';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wMidX, wMidY - wTop + 4);
  ctx.lineTo(wMidX, wMidY - wBot - 4);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // 7. Porta Clínica na parede direita (entre gx=4.6 e gx=5.9)
  const dA = isoPt(4.55, 0, originX, originY, tileW, tileH);
  const dB = isoPt(5.95, 0, originX, originY, tileW, tileH);
  const doorH = Math.floor(wallH * 0.78);
  ctx.fillStyle = '#c89e72';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(dA.x, dA.y - doorH);
  ctx.lineTo(dB.x, dB.y - doorH);
  ctx.lineTo(dB.x, dB.y);
  ctx.lineTo(dA.x, dA.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Visor de vidro da porta hospitalar
  const dmX = (dA.x + dB.x) / 2;
  const dmY = (dA.y + dB.y) / 2;
  const dvW = (dB.x - dA.x) * 0.32;
  const dvYOff = (dB.y - dA.y) * 0.32;
  ctx.fillStyle = isNight ? '#3b526b' : '#cde4f2';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dmX - dvW, dmY - dvYOff - doorH * 0.84);
  ctx.lineTo(dmX + dvW, dmY + dvYOff - doorH * 0.84);
  ctx.lineTo(dmX + dvW, dmY + dvYOff - doorH * 0.48);
  ctx.lineTo(dmX - dvW, dmY - dvYOff - doorH * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Maçaneta metálica
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(dA.x + (dB.x - dA.x) * 0.2, dA.y + (dB.y - dA.y) * 0.2 - doorH * 0.42, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Quadro / Pôster clínico discreto na parede direita (entre gx=1.4 e gx=3.1)
  const fA = isoPt(1.4, 0, originX, originY, tileW, tileH);
  const fB = isoPt(3.0, 0, originX, originY, tileW, tileH);
  const fTop = wallH - Math.floor(wallH * 0.17);
  const fBot = wainscotH + Math.floor(wallH * 0.14);
  ctx.fillStyle = '#7c5d41';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(fA.x, fA.y - fTop);
  ctx.lineTo(fB.x, fB.y - fTop);
  ctx.lineTo(fB.x, fB.y - fBot);
  ctx.lineTo(fA.x, fA.y - fBot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Interior do quadro (fundo creme com linhas de diagrama médico)
  ctx.fillStyle = '#fcf8ed';
  ctx.beginPath();
  ctx.moveTo(fA.x + 4, fA.y - fTop + 5);
  ctx.lineTo(fB.x - 4, fB.y - fTop + 2);
  ctx.lineTo(fB.x - 4, fB.y - fBot - 5);
  ctx.lineTo(fA.x + 4, fA.y - fBot - 2);
  ctx.closePath();
  ctx.fill();

  // Pequena onda/cruz sutil no pôster
  ctx.strokeStyle = '#6a8362';
  ctx.lineWidth = 1.6;
  const pMidX = (fA.x + fB.x) / 2;
  const pMidY = (fA.y + fB.y) / 2 - (fTop + fBot) / 2;
  ctx.beginPath();
  ctx.moveTo(pMidX - 12, pMidY - 2);
  ctx.lineTo(pMidX - 5, pMidY);
  ctx.lineTo(pMidX - 1, pMidY - 7);
  ctx.lineTo(pMidX + 4, pMidY + 5);
  ctx.lineTo(pMidX + 12, pMidY + 3);
  ctx.stroke();

  // 8. Piso Isométrico Texturizado (cerâmica ou madeira)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = isoPt(c, r, originX, originY, tileW, tileH);
      const right = isoPt(c + 1, r, originX, originY, tileW, tileH);
      const bottom = isoPt(c + 1, r + 1, originX, originY, tileW, tileH);
      const left = isoPt(c, r + 1, originX, originY, tileW, tileH);

      const isEven = (r + c) % 2 === 0;
      ctx.fillStyle = isEven ? theme.floorA : theme.floorB;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.fill();

      // Textura orgânica sobre o ladrilho
      if (grain) {
        ctx.fillStyle = grain;
        ctx.fill();
      }

      if (theme.floorStyle === 'wood') {
        // Ripas paralelas de madeira dentro do ladrilho isométrico
        ctx.strokeStyle = theme.floorGrout;
        ctx.lineWidth = 1;
        for (let k = 1; k <= 2; k++) {
          const t = k / 3;
          const sx = top.x + (left.x - top.x) * t;
          const sy = top.y + (left.y - top.y) * t;
          const ex = right.x + (bottom.x - right.x) * t;
          const ey = right.y + (bottom.y - right.y) * t;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      } else {
        // Sutil brilho diagonal de piso cerâmico polido
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left.x + 4, left.y);
        ctx.lineTo(top.x, top.y + 2);
        ctx.lineTo(right.x - 4, right.y);
        ctx.stroke();
      }

      // Rejunte / grade de edição
      ctx.strokeStyle = editMode ? 'rgba(56, 189, 248, 0.42)' : theme.floorGrout;
      ctx.lineWidth = editMode ? 1.2 : 1;
      ctx.stroke();

      // Destaque de tile sob hover ou selecionado para mover
      if (hoverTile && hoverTile.gx === c && hoverTile.gy === r) {
        ctx.fillStyle = hoverTile.occupied
          ? 'rgba(251, 191, 36, 0.28)'
          : 'rgba(56, 189, 248, 0.28)';
        ctx.fill();
        ctx.strokeStyle = hoverTile.occupied ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (selectedMoveTile && selectedMoveTile.gx === c && selectedMoveTile.gy === r) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    }
  }

  // 9. Sombra suave de oclusão ambiental junto às duas paredes
  const aoL = isoPt(0.55, 0, originX, originY, tileW, tileH);
  const aoLB = isoPt(0.55, rows, originX, originY, tileW, tileH);
  const gradAoL = ctx.createLinearGradient(p0.x, p0.y, aoL.x, aoL.y);
  gradAoL.addColorStop(0, 'rgba(30, 24, 18, 0.16)');
  gradAoL.addColorStop(1, 'rgba(30, 24, 18, 0)');
  ctx.fillStyle = gradAoL;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.lineTo(aoLB.x, aoLB.y);
  ctx.lineTo(aoL.x, aoL.y);
  ctx.closePath();
  ctx.fill();

  const aoR = isoPt(0, 0.55, originX, originY, tileW, tileH);
  const aoRB = isoPt(cols, 0.55, originX, originY, tileW, tileH);
  const gradAoR = ctx.createLinearGradient(p0.x, p0.y, aoR.x, aoR.y);
  gradAoR.addColorStop(0, 'rgba(30, 24, 18, 0.14)');
  gradAoR.addColorStop(1, 'rgba(30, 24, 18, 0)');
  ctx.fillStyle = gradAoR;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(aoRB.x, aoRB.y);
  ctx.lineTo(aoR.x, aoR.y);
  ctx.closePath();
  ctx.fill();

  // 10. Feixe suave de luz natural entrando pela janela sobre o piso
  const sunA = isoPt(0, 1.4, originX, originY, tileW, tileH);
  const sunB = isoPt(0, 3.6, originX, originY, tileW, tileH);
  const sunC = isoPt(2.9, 4.1, originX, originY, tileW, tileH);
  const sunD = isoPt(2.9, 1.9, originX, originY, tileW, tileH);
  const sunGrad = ctx.createLinearGradient(sunA.x, sunA.y, sunC.x, sunC.y);
  if (isNight) {
    sunGrad.addColorStop(0, 'rgba(147, 197, 253, 0.14)');
    sunGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
  } else {
    sunGrad.addColorStop(0, 'rgba(255, 250, 224, 0.26)');
    sunGrad.addColorStop(1, 'rgba(255, 250, 224, 0)');
  }
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.moveTo(sunA.x, sunA.y);
  ctx.lineTo(sunB.x, sunB.y);
  ctx.lineTo(sunC.x, sunC.y);
  ctx.lineTo(sunD.x, sunD.y);
  ctx.closePath();
  ctx.fill();

  // Contorno externo limpo do piso (encaixa com o traço dos móveis)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y);
  ctx.lineTo(pFront.x, pFront.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.stroke();

  ctx.restore();
}

// ---------------- SPRITES ILUSTRADOS HD COM AUTO-CROP E LIMPEZA DE FUNDO ----------------
export const SPRITE_URLS = {
  bed: '/assets/bed.jpg',
  monitor: '/assets/monitor.jpg',
  ct: '/assets/ct.jpg',
  xray: '/assets/xray.jpg',
  blood: '/assets/blood.jpg',
  ausculta: '/assets/ausculta.jpg',
  meds: '/assets/meds.jpg',
  book: '/assets/book.jpg',
  pdf: '/assets/pdf.jpg'
};

// Ajuste fino de escala e deslocamento vertical por objeto para proporção realista no quarto
const SPRITE_TUNING = {
  bed: { scale: 1.44, yLift: 0.24, shadowRx: 0.42, shadowRy: 0.20 },
  ct: { scale: 1.38, yLift: 0.24, shadowRx: 0.40, shadowRy: 0.20 },
  ausculta: { scale: 1.24, yLift: 0.22, shadowRx: 0.36, shadowRy: 0.18 },
  meds: { scale: 1.22, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  monitor: { scale: 1.20, yLift: 0.20, shadowRx: 0.28, shadowRy: 0.14 },
  xray: { scale: 1.18, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  blood: { scale: 1.18, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 },
  pdf: { scale: 1.18, yLift: 0.22, shadowRx: 0.34, shadowRy: 0.17 },
  book: { scale: 1.06, yLift: 0.20, shadowRx: 0.30, shadowRy: 0.15 }
};

const spriteCache = {};

function processIllustratedSprite(img) {
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

  // Passo 2: Limpar frestas puramente brancas presas entre pernas/rodas na metade inferior do móvel
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
      // Remove apenas bolsões pequenos/médios totalmente na parte inferior (vãos entre pernas/rodinhas)
      if (!touchesUpper && comp.length >= 12 && comp.length < 18000) {
        for (let k = 0; k < comp.length; k++) {
          d[comp[k] * 4 + 3] = 0;
        }
      }
    }
  }

  // Passo 3: Suavização de 1px na borda (remove halo branco residual)
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

  // Passo 4: Auto-crop (recorta margens vazias para o objeto aparecer bem maior e alinhado no ladrilho)
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
      spriteCache[key] = processIllustratedSprite(img);
    } catch {
      spriteCache[key] = img;
    }
  };
  img.src = url;
});

// Objetos hospitalares isométricos 2.5D ilustrados (SEM legenda de texto!)
export function drawRoomObject(ctx, type, cx, cy, tileW, { editMode = false, highlighted = false, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const tune = SPRITE_TUNING[type] || { scale: 1.18, yLift: 0.22, shadowRx: 0.32, shadowRy: 0.16 };

  // Sombra suave em duas camadas no piso (integra o móvel à textura do chão)
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
    ctx.drawImage(sp, drawX, drawY, dw, dh);
    ctx.restore();
    return;
  }

  // Fallback vetorial caso o sprite ainda esteja carregando
  const s = tileW / 64;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  drawIsoBox(ctx, 0, 4, 28, 16, 18, '#ede9dd', '#cbd5e1', '#94a3b8', INK);
  ctx.restore();
}
