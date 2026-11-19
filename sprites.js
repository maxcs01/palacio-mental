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

export function drawRoomObject(ctx, type, x, y, size, selected = false) {
  ctx.save();
  // Base do tile do objeto
  ctx.fillStyle = selected ? '#0284c7' : '#334155';
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
  ctx.strokeStyle = selected ? '#7dd3fc' : '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

  // Ícone pixel/simbólico nítido (SEM legenda de texto!)
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (type === 'ct') {
    // Tomógrafo em pixel art
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 14, cy - 12, 28, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 7, cy - 8, 14, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 5, cy + 8, 10, 8);
  } else if (type === 'xray') {
    // Máquina de Radiografia
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 12, cy - 14, 24, 26);
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 8, cy - 10, 16, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 2, cy - 8, 4, 10);
    ctx.fillRect(cx - 6, cy - 5, 12, 2);
    ctx.fillRect(cx - 5, cy - 1, 10, 2);
  } else if (type === 'blood') {
    // Tubos de sangue
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 10, cy + 4, 20, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 7, cy - 10, 4, 14);
    ctx.fillRect(cx - 1, cy - 10, 4, 14);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx + 5, cy - 10, 4, 14);
  } else if (type === 'ausculta') {
    // Estetoscópio / Ausculta
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 8, cy - 12, 4, 12);
    ctx.fillRect(cx + 4, cy - 12, 4, 12);
    ctx.fillRect(cx - 8, cy, 16, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 4, cy + 4, 8, 8);
  } else if (type === 'monitor') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 13, cy - 12, 26, 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cx - 10, cy - 3, 6, 2);
    ctx.fillRect(cx - 4, cy - 9, 2, 10);
    ctx.fillRect(cx - 2, cy - 3, 12, 2);
  } else if (type === 'meds') {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 10, cy - 6, 10, 10);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx, cy - 6, 10, 10);
  } else if (type === 'bed') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 14, cy - 8, 28, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 12, cy - 6, 8, 12);
  } else {
    // Livro / PDF
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 10, cy - 12, 20, 24);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx - 6, cy - 8, 12, 16);
  }

  ctx.restore();
}
