// Desenho Isométrico 2.5D Ilustrado (contorno escuro limpo + paleta hospitalar aconchegante)

export function drawIsoBox(ctx, cx, cy, w, d, h, topCol, leftCol, rightCol, stroke = '#1e293b') {
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
  drawIsoBox(ctx, cx, cy, 78, 40, 50, '#f8f6ef', leftCol, rightCol, '#1e293b');
  // Cobertura / Telhado colorido
  drawIsoBox(ctx, cx, cy - 50, 82, 42, 10, topCol, topCol, '#334155', '#1e293b');

  // Cruz médica no topo isométrico
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.fillRect(cx - 3, cy - 66, 6, 12);
  ctx.fillRect(cx - 7, cy - 63, 14, 6);

  // Janelas na face esquerda e direita
  const winCol = isNight && condition !== 'old' ? '#fde047' : condition === 'old' ? '#1e293b' : '#7ba4c7';
  ctx.fillStyle = winCol;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      // Face esquerda
      const lx = cx - 30 + col * 14;
      const ly = cy - 36 + row * 18 + col * 7;
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx + 9, ly + 4.5); ctx.lineTo(lx + 9, ly + 13); ctx.lineTo(lx, ly + 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Face direita
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

  // Rachaduras / mato se desgastado ou velho
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
  drawIsoBox(ctx, cx, cy, 34, 18, 18, '#f1ede4', '#e8e2d5', '#d6cfc0', '#1e293b');
  drawIsoBox(ctx, cx, cy - 18, 38, 20, 6, roofColor, roofColor, '#334155', '#1e293b');
  // Janelinha
  ctx.fillStyle = isNight ? '#fde047' : '#7ba4c7';
  ctx.strokeStyle = '#1e293b';
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
  drawIsoBox(ctx, cx, cy, 62, 32, 30, '#fef3c7', '#f5e8c7', '#e2d0a7', '#1e293b');
  drawIsoBox(ctx, cx, cy - 30, 66, 34, 8, '#b45309', '#92400e', '#78350f', '#1e293b');
  ctx.fillStyle = isNight ? '#fde047' : '#1e293b';
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

  ctx.strokeStyle = '#1e293b';
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

export function drawAvatar(ctx, x, y, shirtColor = '#38bdf8', label = 'Você') {
  ctx.save();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;

  // Sombra
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo / Jaleco ilustrado
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 5, 10, 12, 3);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(x, y - 10, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (label) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    const w = Math.max(30, label.length * 6 + 10);
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 28, w, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 19);
  }
  ctx.restore();
}

export function drawCar(ctx, x, y, color, horizontal = true) {
  ctx.save();
  ctx.strokeStyle = '#1e293b';
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

// Cache de sprites PNG/JPG ilustrados com remoção automática de fundo branco externo
const SPRITE_URLS = {
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
const spriteCache = {};

function stripWhiteBackground(img) {
  const size = 256;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, size, size);
  const imgData = octx.getImageData(0, 0, size, size);
  const d = imgData.data;
  const visited = new Uint8Array(size * size);
  const stack = [0, size - 1, (size - 1) * size, size * size - 1];

  const isBg = (idx) => d[idx] > 235 && d[idx + 1] > 235 && d[idx + 2] > 235;

  while (stack.length > 0) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (!isBg(i)) continue;
    d[i + 3] = 0; // transparente
    const x = p % size;
    const y = (p - x) / size;
    if (x > 0) stack.push(p - 1);
    if (x < size - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - size);
    if (y < size - 1) stack.push(p + size);
  }
  octx.putImageData(imgData, 0, 0);
  return off;
}

Object.entries(SPRITE_URLS).forEach(([key, url]) => {
  const img = new Image();
  img.onload = () => {
    try {
      spriteCache[key] = stripWhiteBackground(img);
    } catch {
      spriteCache[key] = img;
    }
  };
  img.src = url;
});

// Objetos hospitalares isométricos 2.5D ilustrados (SEM legenda de texto!)
export function drawRoomObject(ctx, type, cx, cy, tileW, selected = false) {
  ctx.save();
  const s = tileW / 64; // fator de escala relativo ao tile isométrico
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  // Sombra suave no piso
  ctx.fillStyle = selected ? 'rgba(56, 189, 248, 0.35)' : 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Se houver sprite ilustrado carregado para este tipo, desenha ele em alta qualidade!
  if (spriteCache[type]) {
    ctx.drawImage(spriteCache[type], -30, -48, 60, 60);
    ctx.restore();
    return;
  }

  const outline = '#1e293b';

  if (type === 'bed') {
    // Leito hospitalar com cobertor azul, travesseiro e mesinha com livro
    drawIsoBox(ctx, 0, 4, 42, 24, 9, '#f1ede1', '#cbd5e1', '#94a3b8', outline);
    // Cobertor azul suave
    drawIsoBox(ctx, -4, -3, 28, 18, 4, '#7ba4c7', '#5b84a8', '#476b8c', outline);
    // Travesseiro creme
    drawIsoBox(ctx, 10, -8, 12, 10, 4, '#fffdf7', '#e2dfd5', '#cbd5e1', outline);
    // Cabeceira
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -14); ctx.lineTo(12, -26);
    ctx.lineTo(22, -21); ctx.lineTo(22, -9);
    ctx.stroke();
  } else if (type === 'monitor') {
    // Base + pedestal + monitor cardíaco com onda ECG verde
    drawIsoBox(ctx, 0, 4, 20, 12, 4, '#cbd5e1', '#94a3b8', '#64748b', outline);
    drawIsoBox(ctx, 0, 0, 6, 4, 16, '#94a3b8', '#64748b', '#475569', outline);
    drawIsoBox(ctx, 0, -14, 24, 14, 18, '#ede9dd', '#d6d1c4', '#b8b2a4', outline);
    // Tela ECG
    ctx.fillStyle = '#0f2922';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -29); ctx.lineTo(-1, -24); ctx.lineTo(-1, -14); ctx.lineTo(-10, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Onda ECG verde
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-9, -22); ctx.lineTo(-7, -22); ctx.lineTo(-5, -26); ctx.lineTo(-3, -18); ctx.lineTo(-2, -21);
    ctx.stroke();
  } else if (type === 'ct') {
    // Tomógrafo isométrico: arco/anel + maca
    drawIsoBox(ctx, -6, 6, 26, 14, 7, '#ede9dd', '#cbd5e1', '#94a3b8', outline);
    drawIsoBox(ctx, 6, 2, 24, 20, 28, '#f5f2e8', '#d6d1c4', '#b8b2a4', outline);
    // Abertura circular escura do tomógrafo
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, -10, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'xray') {
    // Máquina de Radiografia com painel iluminado azul claro
    drawIsoBox(ctx, 0, 4, 26, 16, 28, '#cbd5e1', '#94a3b8', '#64748b', outline);
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -22); ctx.lineTo(-1, -17); ctx.lineTo(-1, -4); ctx.lineTo(-10, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Costelas estilizadas
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-6, -18); ctx.lineTo(-6, -8);
    ctx.moveTo(-8, -15); ctx.lineTo(-3, -13);
    ctx.moveTo(-8, -11); ctx.lineTo(-3, -9);
    ctx.stroke();
  } else if (type === 'blood') {
    // Bancada com tubos de sangue (vermelho, roxo, azul)
    drawIsoBox(ctx, 0, 4, 26, 14, 14, '#ede9dd', '#cbd5e1', '#94a3b8', outline);
    ['#ef4444', '#a855f7', '#38bdf8'].forEach((col, i) => {
      const tx = -6 + i * 6;
      const ty = -12 + i * 2;
      ctx.fillStyle = col;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.2;
      ctx.fillRect(tx - 2, ty - 10, 4, 11);
      ctx.strokeRect(tx - 2, ty - 10, 4, 11);
    });
  } else if (type === 'ausculta') {
    // Poltrona verde-oliva com mesinha lateral (igual à referência!)
    drawIsoBox(ctx, 0, 4, 28, 22, 12, '#5a7a61', '#46614c', '#354b3a', outline);
    drawIsoBox(ctx, 5, -6, 16, 18, 16, '#6b8e72', '#527058', '#3f5744', outline);
    drawIsoBox(ctx, -10, -4, 10, 8, 2, '#c2956e', '#a37854', '#855f40', outline);
  } else if (type === 'meds') {
    // Carrinho de medicação / soro
    drawIsoBox(ctx, 0, 4, 24, 14, 6, '#cbd5e1', '#94a3b8', '#64748b', outline);
    drawIsoBox(ctx, 0, -6, 24, 14, 4, '#ede9dd', '#cbd5e1', '#94a3b8', outline);
    // Frascos no topo
    ctx.fillStyle = '#c27a54';
    ctx.strokeStyle = outline;
    ctx.fillRect(-5, -18, 5, 7);
    ctx.strokeRect(-5, -18, 5, 7);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(2, -16, 4, 6);
    ctx.strokeRect(2, -16, 4, 6);
  } else {
    // Criado-mudo com abajur quente / livro
    drawIsoBox(ctx, 0, 4, 22, 16, 16, '#c2956e', '#a37854', '#855f40', outline);
    // Abajur creme/amarelo
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -16); ctx.lineTo(5, -16); ctx.lineTo(3, -24); ctx.lineTo(-3, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
