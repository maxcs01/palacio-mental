// Gerador de Sprites Ilustrados 2.5D 100% Gratuito no Navegador (AI Horde - sem custo e sem cadastro)
import { processIllustratedSprite, exportSpriteToDataUrl } from './sprites.js';

const HORDE_API = 'https://aihorde.net/api/v2';
const HORDE_ANON_KEY = '0000000000';
const CLIENT_AGENT = 'PalacioMentalMedicina:1.0:web';

// Mini dicionário PT -> EN focado em Medicina e Mnemônicos visuais para resultados bem mais fiéis
const PT_EN_MAP = [
  ['palavra feita de flores', '3d word made entirely of colorful blooming flowers'],
  ['feito de flores', 'made entirely of colorful blooming flowers'],
  ['feita de flores', 'made entirely of colorful blooming flowers'],
  ['palavra escrita', '3d sculpted word reading'],
  ['palavra', '3d sculpted word'],
  ['flores', 'blooming flowers'],
  ['flor', 'flower'],
  ['remédio', 'medicine pill bottle'],
  ['remedio', 'medicine pill bottle'],
  ['medicamento', 'medicine pill bottle'],
  ['comprimido', 'medicine pill tablet'],
  ['cápsula', 'medicine capsule'],
  ['capsula', 'medicine capsule'],
  ['seringa', 'medical syringe'],
  ['coração', 'anatomical heart'],
  ['coracao', 'anatomical heart'],
  ['pulmão', 'anatomical lungs'],
  ['pulmao', 'anatomical lungs'],
  ['pulmões', 'anatomical lungs'],
  ['pulmoes', 'anatomical lungs'],
  ['cérebro', 'anatomical brain'],
  ['cerebro', 'anatomical brain'],
  ['rim', 'anatomical kidney'],
  ['rins', 'anatomical kidneys'],
  ['fígado', 'anatomical liver'],
  ['figado', 'anatomical liver'],
  ['estômago', 'anatomical stomach'],
  ['estomago', 'anatomical stomach'],
  ['osso', 'bone'],
  ['ossos', 'bones'],
  ['bactéria', 'cute cartoon bacteria'],
  ['bacteria', 'cute cartoon bacteria'],
  ['vírus', 'cute cartoon virus'],
  ['virus', 'cute cartoon virus'],
  ['coroa', 'golden crown'],
  ['escudo', 'medieval shield'],
  ['espada', 'sword'],
  ['cadeado', 'padlock'],
  ['chave', 'golden key'],
  ['fogo', 'flames fire'],
  ['gelo', 'ice crystal'],
  ['raio', 'lightning bolt'],
  ['asas', 'angel wings'],
  ['asa', 'wing'],
  ['relógio', 'clock'],
  ['relogio', 'clock'],
  ['ampulheta', 'hourglass'],
  ['balança', 'balance scale'],
  ['balanca', 'balance scale'],
  ['microscópio', 'microscope'],
  ['microscopio', 'microscope'],
  ['estetoscópio', 'stethoscope'],
  ['estetoscopio', 'stethoscope'],
  ['jaleco', 'white doctor coat'],
  ['tubarão', 'shark'],
  ['tubarao', 'shark'],
  ['leão', 'lion'],
  ['leao', 'lion'],
  ['gato', 'cat'],
  ['cachorro', 'dog'],
  ['pássaro', 'bird'],
  ['passaro', 'bird'],
  ['árvore', 'tree'],
  ['arvore', 'tree'],
  ['estrela', 'star'],
  ['lua', 'crescent moon'],
  ['sol', 'sun'],
  ['dourado', 'golden'],
  ['dourada', 'golden'],
  ['azul', 'blue'],
  ['verde', 'green'],
  ['vermelho', 'red'],
  ['vermelha', 'red'],
  ['roxo', 'purple'],
  ['roxa', 'purple'],
  ['amarelo', 'yellow'],
  ['amarela', 'yellow'],
  ['rosa', 'pink'],
  ['branco', 'white'],
  ['branca', 'white'],
  ['com', 'with'],
  ['de', 'of']
];

export function buildIsometricPrompt(rawUserText) {
  let text = String(rawUserText || '').trim();
  // Aplica substituições preservando palavras em caixa alta (ex: nomes de remédios como CIPRO)
  PT_EN_MAP.forEach(([pt, en]) => {
    const re = new RegExp(`\\b${pt}\\b`, 'gi');
    text = text.replace(re, en);
  });

  const positive = [
    `isometric 2.5D cozy game asset illustration of ${text}`,
    'clean dark brown charcoal ink outline',
    'soft cel-shading',
    'warm cozy hospital palette (cream, olive green, muted steel blue)',
    'single centered object',
    'isolated on pure solid white background #FFFFFF',
    'no floor, no ground shadow, no room, vector game sprite'
  ].join(', ');

  const negative = [
    'photorealistic, 3d render, blurry, noisy, dark background, grey background, gradient background',
    'floor, tiles, ground shadow, cast shadow, border, frame, cropped, cut off, watermark, signature, multiple objects'
  ].join(', ');

  return `${positive} ### ${negative}`;
}

async function pickBestFreeModels() {
  const preferred = [
    'AlbedoBase XL (SDXL)',
    'DreamShaper',
    'Deliberate',
    'ICBINP - I Can\'t Believe It\'s Not Photography',
    'stable_diffusion'
  ];
  try {
    const r = await fetch(`${HORDE_API}/status/models?type=image&model_state=known`);
    if (!r.ok) return ['Deliberate', 'stable_diffusion'];
    const list = await r.json();
    const active = list.filter((m) => m.count > 0 && !/nsfw|hentai|pony/i.test(m.name));
    const chosen = [];
    for (const pref of preferred) {
      if (active.some((m) => m.name === pref)) chosen.push(pref);
    }
    if (chosen.length === 0) {
      active
        .sort((a, b) => (a.eta || 999) - (b.eta || 999) || b.count - a.count)
        .slice(0, 3)
        .forEach((m) => chosen.push(m.name));
    }
    return chosen.length ? chosen : ['stable_diffusion'];
  } catch {
    return ['Deliberate', 'stable_diffusion'];
  }
}

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível decodificar a imagem gerada.'));
    img.src = src;
  });
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(id);
          reject(new DOMException('Cancelado', 'AbortError'));
        },
        { once: true }
      );
    }
  });
}

/**
 * Gera uma imagem gratuita via AI Horde (com base64 direto para evitar bloqueio CORS),
 * remove o fundo branco automaticamente e devolve pronta no padrão dos quartos.
 */
export async function generateFreeAiSprite(userPrompt, { onStatus, signal } = {}) {
  const say = (msg) => {
    if (typeof onStatus === 'function') onStatus(msg);
  };

  say('Conectando ao gerador gratuito...');
  const models = await pickBestFreeModels();
  const fullPrompt = buildIsometricPrompt(userPrompt);

  say('Enviando pedido para a fila gratuita...');
  const submitRes = await fetch(`${HORDE_API}/generate/async`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: HORDE_ANON_KEY,
      'Client-Agent': CLIENT_AGENT
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      models,
      params: {
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7.5,
        sampler_name: 'k_euler_a',
        n: 1
      },
      nsfw: false,
      censor_nsfw: true,
      r2: false
    })
  });

  if (!submitRes.ok) {
    const errTxt = await submitRes.text().catch(() => '');
    throw new Error(`Servidor gratuito ocupado (${submitRes.status}). ${errTxt.slice(0, 120)}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  if (!jobId) {
    throw new Error(submitData.message || 'Não foi possível iniciar a geração gratuita.');
  }

  // Polling leve (máx ~90s)
  const startedAt = Date.now();
  while (Date.now() - startedAt < 95000) {
    await sleep(2600, signal);
    const checkRes = await fetch(`${HORDE_API}/generate/check/${jobId}`, { signal });
    if (!checkRes.ok) continue;
    const chk = await checkRes.json();

    if (chk.faulted) {
      throw new Error('A geração falhou no servidor gratuito. Tente novamente.');
    }
    if (chk.done) {
      break;
    }

    const pos = typeof chk.queue_position === 'number' ? chk.queue_position : null;
    const eta = typeof chk.wait_time === 'number' ? chk.wait_time : null;
    if (chk.processing > 0) {
      say(`Desenhando seu objeto... ${eta ? `(~${eta}s)` : ''}`);
    } else if (pos !== null) {
      say(`Na fila gratuita (posição ${pos + 1}${eta ? ` • ~${eta}s` : ''})...`);
    } else {
      say('Aguardando servidor gratuito desenhar...');
    }
  }

  say('Baixando e recortando fundo branco...');
  const statusRes = await fetch(`${HORDE_API}/generate/status/${jobId}`, { signal });
  if (!statusRes.ok) {
    throw new Error('Erro ao baixar imagem gerada.');
  }
  const statusData = await statusRes.json();
  const gen = statusData.generations?.[0];
  if (!statusData.done || !gen || !gen.img) {
    throw new Error('O servidor gratuito demorou demais. Tente novamente ou use o modo Mnemônico Instantâneo!');
  }

  const rawImgSrc = /^https?:|^data:/i.test(gen.img)
    ? gen.img
    : `data:image/webp;base64,${gen.img}`;

  const img = await loadImageFromSrc(rawImgSrc);
  const processedCanvas = processIllustratedSprite(img, false);
  const dataUrl = exportSpriteToDataUrl(processedCanvas, 256);

  return {
    canvas: processedCanvas,
    dataUrl,
    modelUsed: gen.model || models[0]
  };
}
