// Desenho procedural em Pixel Art 2D (nítido, sem borrão)

export function drawPixelBuilding(ctx, x, y, w, h, baseColor, condition, isNight, label) {
  ctx.save();

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 4, y + h - 4, w, 8);

  // Cor da fachada conforme desgaste
  let wallColor = '#e2e8f0';
  let roofColor = baseColor;
  if (condition === 'worn') {
    wallColor = '#cbd5e1';
  } else if (condition === 'old') {
    wallColor = '#94a3b8';
    roofColor = '#64748b';
  }

  // Brilho sutil de prédio clicável
  ctx.strokeStyle = isNight ? '#38bdf8' : '#fef08a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

  // Corpo principal
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y + 14, w, h - 14);

  // Telhado / Topo
  ctx.fillStyle = roofColor;
  ctx.fillRect(x - 2, y, w + 4, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x - 2, y, w + 4, 4);

  // Cruz médica no topo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + w / 2 - 2, y + 3, 4, 10);
  ctx.fillRect(x + w / 2 - 5, y + 6, 10, 4);

  // Janelas
  const cols = 3;
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 10 + c * 22;
      const wy = y + 24 + r * 18;
      if (isNight && condition !== 'old') {
        ctx.fillStyle = '#fde047'; // janela acesa à noite
      } else if (condition === 'old') {
        ctx.fillStyle = '#1e293b'; // janela apagada/quebrada
      } else {
        ctx.fillStyle = '#38bdf8';
      }
      ctx.fillRect(wx, wy, 12, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(wx + 5, wy, 2, 10);
    }
  }

  // Porta da recepção
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + w / 2 - 9, y + h - 18, 18, 18);
  ctx.fillStyle = isNight ? '#fef08a' : '#7dd3fc';
  ctx.fillRect(x + w / 2 - 7, y + h - 16, 14, 14);

  // Desgaste visual (rachaduras e mato)
  if (condition === 'worn' || condition === 'old') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 6, y + 38, 8, 2);
    ctx.fillRect(x + 12, y + 40, 2, 6);
    ctx.fillRect(x + w - 14, y + 28, 6, 2);
  }
  if (condition === 'old') {
    // Mato crescido e sujeira
    ctx.fillStyle = '#3f6212';
    ctx.fillRect(x + 2, y + h - 6, 12, 6);
    ctx.fillRect(x + w - 16, y + h - 5, 14, 5);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.fillRect(x, y + 14, w, h - 14);
  }

  // Placa com nome da especialidade
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(x - 4, y - 18, w + 8, 15);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 7);

  ctx.restore();
}

export function drawHouse(ctx, x, y, roofColor, isNight) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 2, y + 26, 32, 6);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x, y + 10, 32, 18);
  ctx.fillStyle = roofColor;
  ctx.fillRect(x - 2, y + 4, 36, 8);
  ctx.fillStyle = isNight ? '#fde047' : '#60a5fa';
  ctx.fillRect(x + 5, y + 14, 7, 7);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 18, y + 16, 8, 12);
}

export function drawTree(ctx, x, y, wilted) {
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 6, y + 14, 6, 12);
  if (wilted) {
    // Árvore murcha / sem folhas
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + 2, y + 10, 14, 3);
    ctx.fillRect(x + 4, y + 6, 3, 6);
    ctx.fillRect(x + 11, y + 7, 3, 5);
  } else {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x, y + 2, 18, 14);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 3, y, 12, 8);
  }
}

export function drawAvatar(ctx, x, y, shirtColor = '#38bdf8', label = 'Você') {
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - 5, y + 8, 10, 4);
  // Pernas
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 4, y + 3, 3, 6);
  ctx.fillRect(x + 1, y + 3, 3, 6);
  // Jaleco / camisa
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x - 5, y - 5, 10, 9);
  // Cabeça
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(x - 4, y - 12, 8, 7);
  // Cabelo
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - 4, y - 13, 8, 3);

  if (label) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(x - 16, y - 25, 32, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 17);
  }
}

export function drawCar(ctx, x, y, color, horizontal = true) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 1, y + 2, horizontal ? 22 : 14, horizontal ? 12 : 20);
  ctx.fillStyle = color;
  if (horizontal) {
    ctx.fillRect(x, y, 22, 11);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 5, y + 2, 11, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 2, y + 10, 4, 2);
    ctx.fillRect(x + 15, y + 10, 4, 2);
  } else {
    ctx.fillRect(x, y, 13, 20);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 2, y + 5, 9, 9);
  }
}

// Helper para desenhar caixa isométrica 2.5D com contorno escuro limpo (estilo ilustrado)
function drawIsoBox(ctx, cx, cy, w, d, h, topCol, leftCol, rightCol, stroke = '#1e293b') {
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
