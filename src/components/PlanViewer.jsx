import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const TAP_MOVE_LIMIT = 8;
const TAP_TIME_LIMIT = 600;

/**
 * Visor de plano con zoom (pellizco / rueda / botones), desplazamiento y marcadores.
 * Las coordenadas de los marcadores son relativas (0 a 1) respecto al tamaño del plano,
 * por lo que se mantienen correctas sin importar la pantalla o el zoom.
 */
const PlanViewer = forwardRef(function PlanViewer(
  { plan, pins, draft, placing, onPlace, onPinTap },
  ref
) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const fitScale = useRef(1);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const props = useRef({});
  props.current = { placing, onPlace, onPinTap };

  const clamp = useCallback(
    (v) => {
      const { w, h } = sizeRef.current;
      const sw = plan.width * v.s;
      const sh = plan.height * v.s;
      const keep = 80;
      return {
        s: v.s,
        x: Math.min(w - keep, Math.max(keep - sw, v.x)),
        y: Math.min(h - keep, Math.max(keep - sh, v.y)),
      };
    },
    [plan.width, plan.height]
  );

  const fit = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const s = Math.min(w / plan.width, h / plan.height) * 0.98;
    fitScale.current = s;
    setView({ s, x: (w - plan.width * s) / 2, y: (h - plan.height * s) / 2 });
  }, [plan.width, plan.height]);

  // Tamaño del contenedor
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    sizeRef.current = size;
    fit();
  }, [size, fit]);

  const zoomAt = useCallback(
    (cx, cy, factor) => {
      const v = viewRef.current;
      const min = fitScale.current * 0.8;
      const max = fitScale.current * 14;
      const s = Math.min(max, Math.max(min, v.s * factor));
      const r = s / v.s;
      setView(clamp({ s, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }));
    },
    [clamp]
  );

  useImperativeHandle(
    ref,
    () => ({
      fit,
      centerOn(nx, ny) {
        const { w, h } = sizeRef.current;
        const s = Math.max(viewRef.current.s, fitScale.current * 2.5);
        setView(clamp({ s, x: w / 2 - nx * plan.width * s, y: h / 2 - ny * plan.height * s }));
      },
    }),
    [fit, clamp, plan.width, plan.height]
  );

  // Rueda del mouse (para uso en navegador / tableta con teclado)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const toPlanCoords = (clientX, clientY) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.s / plan.width,
      y: (clientY - rect.top - v.y) / v.s / plan.height,
    };
  };

  const onPointerDown = (e) => {
    const el = wrapRef.current;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const pinEl = e.target.closest && e.target.closest('[data-pin-id]');
      gesture.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startT: Date.now(),
        moved: false,
        pinId: pinEl ? pinEl.dataset.pinId : null,
        last: { x: e.clientX, y: e.clientY },
      };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        type: 'pinch',
        moved: true,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const rect = wrapRef.current.getBoundingClientRect();

    if (g.type === 'pan' && pointers.current.size === 1) {
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_MOVE_LIMIT) g.moved = true;
      if (g.moved) {
        const dx = e.clientX - g.last.x;
        const dy = e.clientY - g.last.y;
        const v = viewRef.current;
        setView(clamp({ s: v.s, x: v.x + dx, y: v.y + dy }));
      }
      g.last = { x: e.clientX, y: e.clientY };
    } else if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const v = viewRef.current;
      const min = fitScale.current * 0.8;
      const max = fitScale.current * 14;
      const s = Math.min(max, Math.max(min, v.s * (dist / g.dist)));
      const r = s / v.s;
      const cx = g.center.x - rect.left;
      const cy = g.center.y - rect.top;
      setView(
        clamp({
          s,
          x: cx - (cx - v.x) * r + (center.x - g.center.x),
          y: cy - (cy - v.y) * r + (center.y - g.center.y),
        })
      );
      g.dist = dist;
      g.center = center;
    }
  };

  const endPointer = (e, cancelled = false) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    pointers.current.delete(e.pointerId);

    if (g && g.type === 'pan' && !g.moved && !cancelled && Date.now() - g.startT < TAP_TIME_LIMIT) {
      const { placing: isPlacing, onPlace: place, onPinTap: pinTap } = props.current;
      if (isPlacing) {
        const p = toPlanCoords(e.clientX, e.clientY);
        if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) place(p.x, p.y);
      } else if (g.pinId) {
        pinTap(g.pinId);
      }
    }

    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current = {
        type: 'pan',
        moved: true,
        startX: p.x,
        startY: p.y,
        startT: 0,
        pinId: null,
        last: p,
      };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
    }
  };

  const zoomButton = (factor) => {
    const { w, h } = sizeRef.current;
    zoomAt(w / 2, h / 2, factor);
  };

  const renderPin = (p, isDraft = false) => (
    <div
      key={isDraft ? 'draft' : p.id}
      className={`pin${isDraft ? ' pin-draft' : ''}`}
      data-pin-id={isDraft ? undefined : p.id}
      style={{
        left: p.x * plan.width,
        top: p.y * plan.height,
        transform: `scale(${1 / view.s})`,
      }}
    >
      <div className="pin-body" style={{ background: p.color }}>
        <span>{isDraft ? '+' : p.number}</span>
      </div>
    </div>
  );

  return (
    <div className={`plan-area${placing ? ' is-placing' : ''}`}>
      <div
        className="plan-wrap"
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e)}
        onPointerCancel={(e) => endPointer(e, true)}
      >
        <div
          className="plan-layer"
          style={{
            width: plan.width,
            height: plan.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
          }}
        >
          <img src={plan.dataUrl} width={plan.width} height={plan.height} alt="Plano" draggable={false} />
          {pins.map((p) => renderPin(p))}
          {draft && renderPin(draft, true)}
        </div>
      </div>
      <div className="zoom-controls">
        <button onClick={() => zoomButton(1.5)} aria-label="Acercar">
          +
        </button>
        <button onClick={() => zoomButton(1 / 1.5)} aria-label="Alejar">
          −
        </button>
        <button onClick={fit} aria-label="Ajustar al tamaño de la pantalla" className="fit">
          ⤢
        </button>
      </div>
    </div>
  );
});

export default PlanViewer;
