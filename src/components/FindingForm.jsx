import { useRef, useState } from 'react';
import Sheet from './Sheet.jsx';
import { CATEGORIES, SEVERITIES, STATUSES } from '../lib/constants.js';
import { photoFromFile } from '../lib/images.js';
import { useBackHandler } from '../lib/backstack.js';

function PhotoViewer({ src, onClose }) {
  useBackHandler(true, onClose);
  return (
    <div className="photo-viewer" onClick={onClose}>
      <img src={src} alt="Fotografía del hallazgo" />
      <button className="icon-btn light" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}

export default function FindingForm({
  number,
  initial,
  isNew,
  onSave,
  onDelete,
  onRelocate,
  onClose,
  toast,
}) {
  const [f, setF] = useState(initial);
  const [viewer, setViewer] = useState(null);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const addFiles = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const file of files) added.push(await photoFromFile(file));
      setF((prev) => ({ ...prev, photos: [...(prev.photos || []), ...added] }));
    } catch (err) {
      toast(err.message || 'No se pudo procesar la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (i) => set({ photos: f.photos.filter((_, idx) => idx !== i) });

  const save = () => {
    if (!f.title.trim()) {
      toast('Escribe un título para el hallazgo.');
      return;
    }
    onSave({ ...f, title: f.title.trim() });
  };

  return (
    <>
      <Sheet
        tall
        title={isNew ? 'Nuevo hallazgo' : `Hallazgo #${number}`}
        onClose={onClose}
        footer={
          <div className="foot-row">
            {!isNew && (
              <button className="btn danger" onClick={onDelete}>
                Eliminar
              </button>
            )}
            <button className="btn primary grow" onClick={save} disabled={busy}>
              {busy ? 'Procesando fotos…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <label className="field">
          <span>Título *</span>
          <input
            value={f.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ej.: Luminaria sin funcionar"
            autoFocus={isNew}
          />
        </label>

        <label className="field">
          <span>Descripción / observación</span>
          <textarea
            rows={4}
            value={f.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Describe lo observado, la ubicación exacta y cualquier detalle útil"
          />
        </label>

        <div className="field">
          <span>Severidad</span>
          <div className="chips">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip${f.severity === s.id ? ' on' : ''}`}
                style={f.severity === s.id ? { background: s.color, borderColor: s.color } : { borderColor: s.color, color: s.color }}
                onClick={() => set({ severity: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Estado</span>
          <div className="chips">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip${f.status === s.id ? ' on' : ''}`}
                style={f.status === s.id ? { background: s.color, borderColor: s.color } : { borderColor: s.color, color: s.color }}
                onClick={() => set({ status: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Categoría</span>
          <select value={f.category} onChange={(e) => set({ category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Responsable (opcional)</span>
          <input
            value={f.responsible}
            onChange={(e) => set({ responsible: e.target.value })}
            placeholder="Persona o empresa a cargo de la corrección"
          />
        </label>

        <div className="field">
          <span>Fotografías ({(f.photos || []).length})</span>
          <div className="photo-actions">
            <button type="button" className="btn" onClick={() => cameraRef.current.click()}>
              📷 Tomar foto
            </button>
            <button type="button" className="btn" onClick={() => galleryRef.current.click()}>
              🖼 Galería
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {(f.photos || []).length > 0 && (
            <div className="thumbs">
              {f.photos.map((src, i) => (
                <div className="thumb" key={i}>
                  <img src={src} alt={`Foto ${i + 1}`} onClick={() => setViewer(src)} />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Quitar foto">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn wide" onClick={() => onRelocate(f)}>
          📍 {isNew ? 'Cambiar punto en el plano' : 'Mover hallazgo en el plano'}
        </button>
      </Sheet>
      {viewer && <PhotoViewer src={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}
