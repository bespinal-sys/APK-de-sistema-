import { jsPDF } from 'jspdf';
import { activeFindings, numberFindings } from './merge.js';
import { renderPlanWithPins, shrinkImage } from './images.js';
import { severityOf, statusOf, APP_NAME } from './constants.js';

const NAVY = [15, 42, 67];
const ORANGE = [242, 140, 0];
const GRAY = [90, 100, 110];
const LIGHT = [240, 243, 246];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const fmtDate = (ts) =>
  new Date(ts).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Genera el informe PDF.
 * @param {Array} spaces  espacios a incluir
 * @param {Object} opts   { onlyOpen: boolean, projectName: string }
 * @returns {Promise<Blob>}
 */
export async function buildReport(spaces, { onlyOpen = false, projectName = '' } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210;
  const PH = 297;
  const M = 14;
  const CW = PW - M * 2;
  let y = 0;

  const header = (title, subtitle) => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, 24, 'F');
    doc.setFillColor(...ORANGE);
    doc.rect(0, 24, PW, 1.6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, M, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    if (subtitle) doc.text(subtitle, M, 19);
    y = 33;
  };

  const newPage = (title, subtitle) => {
    doc.addPage();
    header(title, subtitle);
  };

  const ensure = (h, title, subtitle) => {
    if (y + h > PH - 16) newPage(title, subtitle);
  };

  const filterFindings = (space) =>
    activeFindings(space)
      .filter((f) => !onlyOpen || f.status !== 'cerrado')
      .sort((a, b) => a.createdAt - b.createdAt);

  // ---------- Portada / resumen ----------
  header(`Informe de ${APP_NAME.toLowerCase()}`, projectName || 'Resumen general');
  doc.setTextColor(...GRAY);
  doc.setFontSize(9.5);
  doc.text(`Generado: ${fmtDate(Date.now())}`, M, y);
  if (onlyOpen) doc.text('Incluye solo hallazgos abiertos o en proceso', PW - M, y, { align: 'right' });
  y += 8;

  const cols = [
    { t: 'Espacio', w: 56, a: 'left' },
    { t: 'Plano', w: 18, a: 'center' },
    { t: 'Total', w: 20, a: 'center' },
    { t: 'Abiertos', w: 22, a: 'center' },
    { t: 'En proceso', w: 24, a: 'center' },
    { t: 'Cerrados', w: 22, a: 'center' },
    { t: 'Críticos', w: 20, a: 'center' },
  ];
  const drawRow = (cells, { head = false, shade = false } = {}) => {
    const rh = 8;
    if (head) {
      doc.setFillColor(...NAVY);
      doc.rect(M, y, CW, rh, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
    } else {
      if (shade) {
        doc.setFillColor(...LIGHT);
        doc.rect(M, y, CW, rh, 'F');
      }
      doc.setTextColor(30, 35, 40);
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(9);
    let x = M;
    cells.forEach((c, i) => {
      const col = cols[i];
      const tx = col.a === 'center' ? x + col.w / 2 : x + 2;
      doc.text(String(c), tx, y + 5.4, { align: col.a === 'center' ? 'center' : 'left', maxWidth: col.w - 3 });
      x += col.w;
    });
    y += rh;
  };

  drawRow(cols.map((c) => c.t), { head: true });
  const totals = { total: 0, abierto: 0, en_proceso: 0, cerrado: 0, critica: 0 };
  spaces.forEach((s, i) => {
    const all = filterFindings(s);
    const count = (st) => all.filter((f) => f.status === st).length;
    const row = {
      total: all.length,
      abierto: count('abierto'),
      en_proceso: count('en_proceso'),
      cerrado: count('cerrado'),
      critica: all.filter((f) => f.severity === 'critica' && f.status !== 'cerrado').length,
    };
    Object.keys(totals).forEach((k) => (totals[k] += row[k]));
    drawRow(
      [s.name, s.plan ? 'Sí' : 'No', row.total, row.abierto, row.en_proceso, row.cerrado, row.critica],
      { shade: i % 2 === 1 }
    );
  });
  drawRow(
    ['TOTAL', '', totals.total, totals.abierto, totals.en_proceso, totals.cerrado, totals.critica],
    { shade: true }
  );
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Críticos = hallazgos de severidad crítica que aún no están cerrados.', M, y + 5);

  // ---------- Un bloque por espacio ----------
  for (const space of spaces) {
    const list = filterFindings(space);
    const numbers = numberFindings(space);
    const title = space.name;
    const sub = `${list.length} hallazgo(s)${onlyOpen ? ' pendiente(s)' : ''}`;
    newPage(title, sub);

    if (space.plan) {
      const pins = list.map((f) => ({
        x: f.x,
        y: f.y,
        number: numbers.get(f.id),
        color: severityOf(f.severity).color,
      }));
      const img = await renderPlanWithPins(space.plan, pins);
      const maxH = 150;
      let w = CW;
      let h = (img.height / img.width) * w;
      if (h > maxH) {
        h = maxH;
        w = (img.width / img.height) * h;
      }
      const x = M + (CW - w) / 2;
      doc.setDrawColor(190, 197, 205);
      doc.rect(x - 0.4, y - 0.4, w + 0.8, h + 0.8);
      doc.addImage(img.dataUrl, 'JPEG', x, y, w, h);
      y += h + 6;
    } else {
      doc.setTextColor(...GRAY);
      doc.setFontSize(10);
      doc.text('Este espacio no tiene plano cargado.', M, y + 4);
      y += 12;
    }

    if (!list.length) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(10);
      doc.text('Sin hallazgos registrados.', M, y + 4);
      continue;
    }

    for (const f of list) {
      const sev = severityOf(f.severity);
      const st = statusOf(f.status);
      const num = numbers.get(f.id);

      const descLines = f.description ? doc.splitTextToSize(f.description, CW - 4) : [];
      const photos = f.photos || [];
      const photoRows = Math.ceil(photos.length / 3);
      const blockH = 18 + descLines.length * 4.4 + photoRows * 44;
      ensure(Math.min(blockH, 70), title, sub);

      // Encabezado del hallazgo
      doc.setFillColor(...hex(sev.color));
      doc.circle(M + 3.4, y + 3.4, 3.4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(num > 99 ? 6.5 : 8.5);
      doc.text(String(num), M + 3.4, y + 4.6, { align: 'center' });

      doc.setTextColor(25, 30, 35);
      doc.setFontSize(11);
      doc.text(f.title || '(sin título)', M + 9, y + 4.6, { maxWidth: CW - 9 });
      y += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      const meta = [
        `Severidad: ${sev.label}`,
        `Estado: ${st.label}`,
        `Categoría: ${f.category || '—'}`,
        f.responsible ? `Responsable: ${f.responsible}` : null,
        `Registrado: ${fmtDate(f.createdAt)}`,
      ].filter(Boolean);
      const metaLines = doc.splitTextToSize(meta.join('   •   '), CW - 4);
      doc.text(metaLines, M + 2, y);
      y += metaLines.length * 4 + 1.5;

      if (descLines.length) {
        doc.setFontSize(9.5);
        doc.setTextColor(35, 40, 45);
        for (const line of descLines) {
          ensure(5, title, sub);
          doc.text(line, M + 2, y);
          y += 4.4;
        }
        y += 1;
      }

      if (photos.length) {
        const pw = (CW - 8) / 3;
        const ph = 40;
        for (let i = 0; i < photos.length; i++) {
          if (i % 3 === 0) ensure(ph + 3, title, sub);
          const small = await shrinkImage(photos[i], { maxSide: 900, quality: 0.72 });
          const col = i % 3;
          const px = M + col * (pw + 4);
          // Ajusta la foto dentro de la celda manteniendo la proporción
          let w = pw;
          let h = (small.height / small.width) * w;
          if (h > ph) {
            h = ph;
            w = (small.width / small.height) * h;
          }
          doc.addImage(small.dataUrl, 'JPEG', px, y, w, h);
          if (col === 2 || i === photos.length - 1) y += ph + 3;
        }
      }

      doc.setDrawColor(215, 220, 226);
      doc.line(M, y + 1, PW - M, y + 1);
      y += 6;
    }
  }

  // ---------- Pie de página ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${APP_NAME}${projectName ? ' — ' + projectName : ''}`, M, PH - 8);
    doc.text(`Página ${i} de ${total}`, PW - M, PH - 8, { align: 'right' });
  }

  return doc.output('blob');
}

