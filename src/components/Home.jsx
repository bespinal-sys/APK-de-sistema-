import { useRef } from 'react';
import { activeFindings } from '../lib/merge.js';
import { APP_NAME } from '../lib/constants.js';

export default function Home({
  spaces,
  projectName,
  onProjectName,
  onOpen,
  onReport,
  onExport,
  onImport,
}) {
  const importRef = useRef(null);

  const renameProject = () => {
    const name = window.prompt('Nombre del proyecto (aparece en los informes)', projectName);
    if (name !== null) onProjectName(name.trim());
  };

  const totals = spaces.reduce(
    (acc, s) => {
      const a = activeFindings(s);
      acc.total += a.length;
      acc.pending += a.filter((f) => f.status !== 'cerrado').length;
      return acc;
    },
    { total: 0, pending: 0 }
  );

  return (
    <div className="screen home">
      <header className="home-head">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="30" height="30">
              <rect x="6" y="8" width="36" height="32" rx="4" fill="none" stroke="#fff" strokeWidth="3" />
              <path d="M6 20h36M20 8v32" stroke="#fff" strokeWidth="2.5" />
              <circle cx="31" cy="30" r="5" fill="#f28c00" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h1>{APP_NAME}</h1>
            <button className="project-btn" onClick={renameProject}>
              {projectName || 'Toca para nombrar el proyecto'} ✎
            </button>
          </div>
        </div>
        <div className="summary">
          <div>
            <strong>{spaces.length}</strong>
            <small>Espacios</small>
          </div>
          <div>
            <strong>{totals.total}</strong>
            <small>Hallazgos</small>
          </div>
          <div>
            <strong>{totals.pending}</strong>
            <small>Pendientes</small>
          </div>
        </div>
      </header>

      <main className="home-main">
        <h2 className="section-title">Espacios del proyecto</h2>
        <div className="space-grid">
          {spaces.map((s) => {
            const a = activeFindings(s);
            const pending = a.filter((f) => f.status !== 'cerrado').length;
            const thumb = s.plan && (s.plan.thumb || s.plan.dataUrl);
            return (
              <button key={s.id} className="space-card" onClick={() => onOpen(s.id)}>
                <div className="thumb-box">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" />
                  ) : (
                    <div className="no-plan">
                      <span>🗺</span>
                      <small>Sin plano</small>
                    </div>
                  )}
                </div>
                <div className="card-info">
                  <strong>{s.name}</strong>
                  <small>
                    {a.length} hallazgo(s)
                    {pending > 0 && <em> · {pending} pendiente(s)</em>}
                  </small>
                </div>
              </button>
            );
          })}
        </div>

        <h2 className="section-title">Informes y datos</h2>
        <div className="data-actions">
          <button className="data-btn" onClick={onReport}>
            <span>📄</span>
            <div>
              <strong>Informe PDF</strong>
              <small>Planos marcados, hallazgos y fotografías</small>
            </div>
          </button>
          <button className="data-btn" onClick={onExport}>
            <span>📤</span>
            <div>
              <strong>Exportar datos</strong>
              <small>Genera un archivo de respaldo para otro dispositivo</small>
            </div>
          </button>
          <button className="data-btn" onClick={() => importRef.current.click()}>
            <span>📥</span>
            <div>
              <strong>Importar datos</strong>
              <small>Une los datos de otro dispositivo con los de este</small>
            </div>
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              e.target.value = '';
              if (file) onImport(file);
            }}
          />
        </div>
        <p className="foot-note">
          Los datos se guardan únicamente en este dispositivo y la aplicación funciona sin conexión.
          Exporta un respaldo con frecuencia.
        </p>
      </main>
    </div>
  );
}
