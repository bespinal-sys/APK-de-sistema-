const MAX_PLAN_SIDE = 3600;
const MAX_PHOTO_SIDE = 1600;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = src;
  });
}

/** Reduce una imagen (archivo o dataURL) a un tamaño máximo y la devuelve como dataURL. */
export async function shrinkImage(source, { maxSide, quality = 0.85, type = 'image/jpeg' }) {
  const src = typeof source === 'string' ? source : await readAsDataURL(source);
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL(type, quality), width, height };
}

export async function photoFromFile(file) {
  const { dataUrl } = await shrinkImage(file, { maxSide: MAX_PHOTO_SIDE, quality: 0.8 });
  return dataUrl;
}

export const isPdf = (file) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

async function openPdf(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

export async function getPdfPageCount(file) {
  const pdf = await openPdf(file);
  const n = pdf.numPages;
  pdf.destroy();
  return n;
}

/** Convierte la página indicada de un PDF en imagen para usarla como plano. */
export async function planFromPdf(file, pageNumber = 1) {
  const pdf = await openPdf(file);
  const page = await pdf.getPage(Math.min(Math.max(1, pageNumber), pdf.numPages));
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, MAX_PLAN_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  pdf.destroy();
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    fileName: file.name,
  };
}

export async function planFromImage(file) {
  const keepPng = file.type === 'image/png';
  const out = await shrinkImage(file, {
    maxSide: MAX_PLAN_SIDE,
    quality: 0.9,
    type: keepPng ? 'image/png' : 'image/jpeg',
  });
  return { ...out, fileName: file.name };
}

/** Dibuja los hallazgos numerados sobre el plano y devuelve una imagen JPEG lista para el PDF. */
export async function renderPlanWithPins(plan, pins, { maxSide = 2400 } = {}) {
  const img = await loadImage(plan.dataUrl);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const r = Math.max(16, Math.max(w, h) * 0.011);
  for (const p of pins) {
    const cx = p.x * w;
    const cy = p.y * h;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * (String(p.number).length > 2 ? 0.8 : 1.05))}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.number), cx, cy + r * 0.04);
  }
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h };
}

/** Miniatura pequeña para las tarjetas de la pantalla principal. */
export async function makeThumb(dataUrl) {
  const { dataUrl: thumb } = await shrinkImage(dataUrl, { maxSide: 480, quality: 0.7 });
  return thumb;
}
