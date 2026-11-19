// Persistência local de PDFs em IndexedDB + Leitor com PDF.js na página exata

const DB_NAME = 'palacio_mental_pdfs';
const STORE_NAME = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalPdf(id, file) {
  const buf = await file.arrayBuffer();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ name: file.name, bytes: buf }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalPdf(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export function extractDriveId(url) {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m2 ? m2[1] : null;
}

let pdfjsLibPromise = null;
function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export async function buildPdfViewerElement({ title, url, page = 1, quote = '', localPdfId = null }) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';

  const targetPage = Math.max(1, parseInt(page, 10) || 1);
  const driveId = extractDriveId(url);

  // Caso 1: PDF salvo localmente no IndexedDB (ou via URL direta sem ser Drive)
  if (localPdfId || (url && !driveId)) {
    const controls = document.createElement('div');
    controls.className = 'row-actions';
    controls.style.alignItems = 'center';
    controls.innerHTML = `
      <button id="pdfPrev" class="btn-secondary">◀</button>
      <span id="pdfPageInfo" style="font-size:13px;">Carregando página ${targetPage}...</span>
      <button id="pdfNext" class="btn-secondary">▶</button>
    `;
    const canvasEl = document.createElement('canvas');
    canvasEl.style.width = '100%';
    canvasEl.style.borderRadius = '8px';
    canvasEl.style.border = '1px solid var(--border)';
    canvasEl.style.background = '#fff';

    const quoteInfo = document.createElement('small');
    quoteInfo.style.color = 'var(--warn)';

    wrap.appendChild(controls);
    if (quote) {
      quoteInfo.textContent = `Trecho marcado: "${quote}"`;
      wrap.appendChild(quoteInfo);
    }
    wrap.appendChild(canvasEl);

    if (url) {
      const extLink = document.createElement('a');
      extLink.href = `${url}#page=${targetPage}`;
      extLink.target = '_blank';
      extLink.rel = 'noopener';
      extLink.className = 'btn-secondary';
      extLink.style.textDecoration = 'none';
      extLink.style.alignSelf = 'flex-start';
      extLink.textContent = 'Abrir link original ↗';
      wrap.appendChild(extLink);
    }

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        let src;
        if (localPdfId) {
          const rec = await getLocalPdf(localPdfId);
          if (!rec) {
            controls.querySelector('#pdfPageInfo').textContent = 'Arquivo local não encontrado neste dispositivo.';
            return;
          }
          src = { data: new Uint8Array(rec.bytes) };
        } else {
          src = url;
        }

        const pdf = await pdfjsLib.getDocument(src).promise;
        let current = Math.min(targetPage, pdf.numPages);

        async function renderPage(num) {
          const p = await pdf.getPage(num);
          const viewport = p.getViewport({ scale: 1.5 });
          canvasEl.width = viewport.width;
          canvasEl.height = viewport.height;
          const pCtx = canvasEl.getContext('2d');
          await p.render({ canvasContext: pCtx, viewport }).promise;

          // Destaque simples se houver trecho buscado
          if (quote) {
            const txt = await p.getTextContent();
            const qLower = quote.toLowerCase();
            txt.items.forEach((item) => {
              if (item.str && item.str.toLowerCase().includes(qLower)) {
                const [, , , , tx, ty] = item.transform;
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                pCtx.fillStyle = 'rgba(250, 204, 21, 0.35)';
                pCtx.fillRect(vx, vy - 14, Math.max(40, item.width * 1.5), 18);
              }
            });
          }

          controls.querySelector('#pdfPageInfo').textContent = `Página ${num} de ${pdf.numPages}`;
        }

        await renderPage(current);
        controls.querySelector('#pdfPrev').onclick = () => {
          if (current > 1) renderPage(--current);
        };
        controls.querySelector('#pdfNext').onclick = () => {
          if (current < pdf.numPages) renderPage(++current);
        };
      } catch (err) {
        controls.querySelector('#pdfPageInfo').textContent =
          'Não foi possível renderizar direto (CORS ou link inválido). Use "Abrir link original ↗" abaixo.';
      }
    })();

    return wrap;
  }

  // Caso 2: Link do Google Drive
  if (driveId) {
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview#page=${targetPage}`;
    const viewUrl = `https://drive.google.com/file/d/${driveId}/view#page=${targetPage}`;
    wrap.innerHTML = `
      <p style="font-size:12px;color:var(--muted)">
        Google Drive — <strong>${title}</strong> (Página alvo: <strong>${targetPage}</strong>)
        ${quote ? `<br/><span style="color:var(--warn)">Trecho: "${quote}"</span>` : ''}
      </p>
      <iframe class="pdf-frame" src="${previewUrl}" allow="autoplay"></iframe>
      <div class="row-actions">
        <a href="${viewUrl}" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;">Abrir no Google Drive (Pág. ${targetPage}) ↗</a>
      </div>
    `;
    return wrap;
  }

  wrap.innerHTML = `<p>Nenhum PDF ou link configurado neste objeto ainda. Clique em Editar para vincular um PDF ou link do Google Drive.</p>`;
  return wrap;
}
