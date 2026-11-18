import { useEffect } from 'react';

// Manejo del botón "Atrás" de Android: primero cierra ventanas abiertas, luego regresa de pantalla.
const stack = [];
let base = null;

export const setBaseBackHandler = (fn) => {
  base = fn;
};

export function handleBack() {
  if (stack.length) {
    stack[stack.length - 1]();
    return true;
  }
  return base ? base() : false;
}

/** Registra un cierre mientras `active` sea verdadero (ventanas, modos de colocación, etc.). */
export function useBackHandler(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const fn = () => onClose();
    stack.push(fn);
    return () => {
      const i = stack.lastIndexOf(fn);
      if (i !== -1) stack.splice(i, 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
