import { useMemo, useRef, useState } from 'react';
import PlanViewer from './PlanViewer.jsx';
import FindingForm from './FindingForm.jsx';
import FindingList from './FindingList.jsx';
import ReportDialog from './ReportDialog.jsx';
import Sheet from './Sheet.jsx';
import { activeFindings, numberFindings } from '../lib/merge.js';
import { CATEGORIES, severityOf } from '../lib/constants.js';
import { uid } from '../lib/db.js';
import {
  getPdfPageCount,
  isPdf,
  makeThumb,
  planFromImage,
  planFromPdf,
} from '../lib/images.js';
import { useBackHandler } from '../lib/backstack.js';

const blankFinding = () => ({
  title: '',
  description: '',
  category: CATEGORIES[0],
  severity: 'media',
  status: 'abierto',
  responsible: '',
  photos: [],
});

export default function SpaceView({ space, spaces, projectName, onBack, onChange, setBusy, toast }) {
  const viewerRef = useRef(null);
  const fileRef = useRef(null);
  const [placing, setPlacing] = useState(null); // { type: 'new' | 'move', data, isNew }
  const [form, setForm] = useState(null); // { mode: 'new' | 'edit', data }
  const [showList, setShowList] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pdfPick, setPdfPick] = useState(null);

  const numbers = useMemo(() => numberFindings(space), [space.findings]);
  const active = useMemo(() => activeFindings(space), [space.findings]);

  const pins = useMemo(
    () =>
      active.map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        number: numbers.get(f.id),
        color: severityOf(f.severity).color,
      })),
    [active, numbers]
  );

  // ---------- Plano ----------
  const loadPlan = async (file, page = 1) => {
    setBusy('Cargando plano…');
    try {
      await new Promise((r) => setTimeout(r, 40));
      const plan = isPdf(file) ? await planFromPdf(file, page) : await planFromImage(file);
      plan.thumb = await makeThumb(plan.dataUrl);
      onChange((s) => ({ ...s, plan, planUpdatedAt: Date.now() }));
      toast('Plano cargado');
    } catch (err) {
      toast(`No se pudo cargar el plano: ${err.message || err}`);
    } finally {
      setBusy(null);
    }
  };

  const onPickPlan = async (file) => {
    if (!file) return;
    if (!isPdf(file)) return loadPlan(file);
    setBusy('Leyendo PDF…');
    try {
      const pages = await getPdfPageCount(file);
      setBusy(null);
      if (pages > 1) setPdfPick({ file, pages, page: 1 });
      else loadPlan(file, 1);
    } catch {
      setBusy(null);
      toast('No se pudo leer el PDF.');
    }
  };

  const askPlan = () => {
    if (
      space.plan &&
      !window.confirm(
        'Este espacio ya tiene un plano. ¿Deseas reemplazarlo?\n\nLos hallazgos conservan su posición relativa; si el nuevo plano tiene otra escala, revisa su ubicación.'
      )
    )
      return;
    fileRef.current.click();
  };

  const rename = () => {
    const name = window.prompt('Nombre del espacio', space.name);
    if (name && name.trim() && name.trim() !== space.name) {
      onChange((s) => ({ ...s, name: name.trim(), nameUpdatedAt: Date.now() }));
    }
  };

  // ---------- Hallazgos ----------
  const cancelPlacing = () => {
    if (placing && placing.type === 'move') {
      setForm({ mode: placing.isNew ? 'new' : 'edit', data: placing.data });
    }
    setPlacing(null);
  };
  useBackHandler(!!placing, cancelPlacing);

  const handlePlace = (x, y) => {
    if (!placing) return;
    const data = { ...placing.data, x, y };
    setForm({ mode: placing.type === 'new' ? 'new' : placing.isNew ? 'new' : 'edit', data });
    setPlacing(null);
  };

  const handlePinTap = (id) => {
    const f = space.findings.find((x) => x.id === id);
    if (f && !f.deleted) setForm({ mode: 'edit', data: { ...f, photos: f.photos || [] } });
  };

  const saveFinding = (data) => {
    const now = Date.now();
    if (form.mode === 'new') {
      onChange((s) => ({
        ...s,
        findings: [...s.findings, { ...data, id: uid(), createdAt: now, updatedAt: now }],
      }));
      toast('Hallazgo guardado');
    } else {
      onChange((s) => ({
        ...s,
        findings: s.findings.map((f) => (f.id === data.id ? { ...data, updatedAt: now } : f)),
      }));
      toast('Cambios guardados');
    }
    setForm(null);
  };

  const deleteFinding = () => {
    if (!window.confirm('¿Eliminar este hallazgo? Esta acción no se puede deshacer.')) return;
    const id = form.data.id;
    onChange((s) => ({
      ...s,
      findings: s.findings.map((f) =>
        f.id === id ? { ...f, deleted: true, photos: [], updatedAt: Date.now() } : f
      ),
    }));
    setForm(null);
    toast('Hallazgo eliminado');
  };

  const draft =
    placing && placing.type === 'move' && placing.data.x != null
      ? { x: placing.data.x, y: placing.data.y, color: '#f28c00' }
      : form && form.mode === 'new'
      ? { x: form.data.x, y: form.data.y, color: severityOf(form.data.severity).color }
      : null;

  const pending = active.filter((f) => f.status !== 'cerrado').length;

  return (
    <div className="screen space-screen">
      <header className="topbar">
        <button className="icon-btn light" onClick={onBack} aria-label="Volver">
          ←
        </button>
        <button className="title-btn" onClick={rename} title="Cambiar nombre">
          <strong>{space.name}</strong>
          <small>
            {active.length} hallazgo(s) · {pending} pendiente(s)
          </small>
        </button>
        <button className="icon-btn light" onClick={rename} aria-label="Cambiar nombre">
          ✎
        </button>
      </header>

      <main className="space-main">
        {space.plan ? (
          <PlanViewer
            key={space.planUpdatedAt}
            ref={viewerRef}
            plan={space.plan}
            pins={pins}
            draft={draft}
            placing={!!placing}
            onPlace={handlePlace}
            onPinTap={handlePinTap}
          />
        ) : (
          <div className="empty-plan">
            <div className="empty-icon">🗺</div>
            <h2>Aún no hay plano</h2>
            <p>Carga el plano de este espacio (imagen JPG/PNG o PDF) para empezar a registrar hallazgos.</p>
            <button className="btn primary" onClick={askPlan}>
              Cargar plano
            </button>
          </div>
        )}

        {placing && (
          <div className="place-banner">
            <span>
              📍{' '}
              {placing.type === 'new'
                ? 'Toca el plano donde está el hallazgo'
                : 'Toca el plano para fijar la nueva ubicación'}
            </span>
            <button onClick={cancelPlacing}>Cancelar</button>
          </div>
        )}
      </main>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          e.target.value = '';
          onPickPlan(file);
        }}
      />

      <nav className="actionbar">
        <button onClick={askPlan}>
          <span>🗺</span>Plano
        </button>
        <button onClick={() => setShowList(true)} disabled={!active.length}>
          <span>☰</span>Lista
        </button>
        <button onClick={() => setShowReport(true)}>
          <span>📄</span>Informe
        </button>
        <button
          className="primary"
          disabled={!space.plan || !!placing}
          onClick={() => setPlacing({ type: 'new', data: blankFinding() })}
        >
          <span>＋</span>Hallazgo
        </button>
      </nav>

      {form && (
        <FindingForm
          key={form.data.id || 'nuevo'}
          isNew={form.mode === 'new'}
          number={form.data.id ? numbers.get(form.data.id) : null}
          initial={form.data}
          onSave={saveFinding}
          onDelete={deleteFinding}
          onRelocate={(data) => {
            setPlacing({ type: 'move', data, isNew: form.mode === 'new' });
            setForm(null);
          }}
          onClose={() => setForm(null)}
          toast={toast}
        />
      )}

      {showList && (
        <FindingList
          findings={active}
          numbers={numbers}
          onClose={() => setShowList(false)}
          onSelect={(id) => {
            setShowList(false);
            const f = active.find((x) => x.id === id);
            if (viewerRef.current && f) viewerRef.current.centerOn(f.x, f.y);
            handlePinTap(id);
          }}
        />
      )}

      {showReport && (
        <ReportDialog
          spaces={spaces}
          initialScope={space.id}
          projectName={projectName}
          onClose={() => setShowReport(false)}
          setBusy={setBusy}
          toast={toast}
        />
      )}

      {pdfPick && (
        <Sheet
          title="Elegir página del PDF"
          onClose={() => setPdfPick(null)}
          footer={
            <button
              className="btn primary wide"
              onClick={() => {
                const { file, page } = pdfPick;
                setPdfPick(null);
                loadPlan(file, page);
              }}
            >
              Usar esta página como plano
            </button>
          }
        >
          <p className="muted">El PDF tiene {pdfPick.pages} páginas. ¿Cuál es el plano?</p>
          <label className="field">
            <span>Número de página</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={pdfPick.pages}
              value={pdfPick.page}
              onChange={(e) =>
                setPdfPick({
                  ...pdfPick,
                  page: Math.min(pdfPick.pages, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
          </label>
        </Sheet>
      )}
    </div>
  );
}
