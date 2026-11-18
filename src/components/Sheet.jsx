import { useEffect, useState } from 'react';
import { useBackHandler } from '../lib/backstack.js';

export default function Sheet({ title, onClose, children, footer, tall = false }) {
  useBackHandler(true, onClose);

  // Evita el "clic fantasma": cuando la ventana se abre justo bajo el dedo, el toque que la abrió
  // podría activar un botón de la ventana. Durante un instante se ignoran los toques sobre ella.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 450);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="sheet-backdrop"
      style={{ pointerEvents: armed ? 'auto' : 'none' }}
      onClick={onClose}
    >
      <div
        className={`sheet${tall ? ' sheet-tall' : ''}`}
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
