import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { buildReport } from '../lib/pdfReport.js';
import { deliverFile, stamp } from '../lib/files.js';

export default function ReportDialog({ spaces, initialScope = 'all', projectName, onClose, setBusy, toast }) {
  const [scope, setScope] = useState(initialScope);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const generate = async () => {
    const chosen = scope === 'all' ? spaces : spaces.filter((s) => s.id === scope);
    setBusy('Generando informe PDF…');
    try {
      // Deja que la interfaz muestre el mensaje antes del trabajo pesado.
      await new Promise((r) => setTimeout(r, 60));
      const blob = await buildReport(chosen, { onlyOpen, projectName });
      const label = scope === 'all' ? 'general' : chosen[0].name.replace(/[^\w\-]+/g, '_');
      await deliverFile(`informe-inspeccion-${label}-${stamp()}.pdf`, blob, 'Informe de inspección');
      onClose();
    } catch (err) {
      if (err && /cancel/i.test(String(err.message))) return;
      toast(`No se pudo generar el informe: ${err.message || err}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      title="Informe PDF"
      onClose={onClose}
      footer={
        <button className="btn primary wide" onClick={generate}>
          Generar informe
        </button>
      }
    >
      <div className="field">
        <span>Contenido</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">Todos los espacios</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <label className="check">
        <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
        <span>Solo hallazgos pendientes (abiertos y en proceso)</span>
      </label>
      <p className="muted small">
        El informe incluye el plano con los hallazgos numerados, el detalle de cada uno y sus fotografías.
      </p>
    </Sheet>
  );
}
