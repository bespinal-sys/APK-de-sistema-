import { EXPORT_FORMAT, EXPORT_VERSION } from './constants.js';

/** Hallazgos vigentes (sin los eliminados) */
export const activeFindings = (space) => space.findings.filter((f) => !f.deleted);

/**
 * Numeración estable: se asigna por fecha de creación, contando también los eliminados,
 * de modo que el número de un hallazgo no cambia cuando se borra otro.
 */
export function numberFindings(space) {
  const sorted = [...space.findings].sort(
    (a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id))
  );
  const map = new Map();
  sorted.forEach((f, i) => map.set(f.id, i + 1));
  return map;
}

export function buildExport(spaces, deviceId) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    deviceId,
    spaces,
  };
}

export function validateExport(data) {
  if (!data || data.format !== EXPORT_FORMAT || !Array.isArray(data.spaces)) {
    throw new Error('El archivo no es un respaldo válido de Inspección.');
  }
  if (data.version > EXPORT_VERSION) {
    throw new Error('El archivo fue creado con una versión más reciente de la aplicación.');
  }
}

/**
 * Fusiona un espacio local con el recibido. Gana siempre el cambio más reciente
 * (por hallazgo, por plano y por nombre), por lo que no se pierde información
 * creada en distintos dispositivos.
 */
export function mergeSpace(local, incoming, stats) {
  const out = { ...local };

  if ((incoming.nameUpdatedAt || 0) > (local.nameUpdatedAt || 0)) {
    out.name = incoming.name;
    out.nameUpdatedAt = incoming.nameUpdatedAt;
    stats.updated++;
  }

  if ((incoming.planUpdatedAt || 0) > (local.planUpdatedAt || 0)) {
    out.plan = incoming.plan;
    out.planUpdatedAt = incoming.planUpdatedAt;
    stats.updated++;
  }

  const byId = new Map(local.findings.map((f) => [f.id, f]));
  for (const f of incoming.findings || []) {
    const mine = byId.get(f.id);
    if (!mine) {
      byId.set(f.id, f);
      if (!f.deleted) stats.added++;
    } else if ((f.updatedAt || 0) > (mine.updatedAt || 0)) {
      byId.set(f.id, f);
      stats.updated++;
    } else {
      stats.unchanged++;
    }
  }
  out.findings = [...byId.values()];
  return out;
}

export function mergeAll(localSpaces, data) {
  validateExport(data);
  const stats = { added: 0, updated: 0, unchanged: 0 };
  const byId = new Map(localSpaces.map((s) => [s.id, s]));
  for (const inc of data.spaces) {
    const mine = byId.get(inc.id);
    byId.set(inc.id, mine ? mergeSpace(mine, inc, stats) : { findings: [], ...inc });
    if (!mine) stats.added += (inc.findings || []).filter((f) => !f.deleted).length;
  }
  return { spaces: [...byId.values()], stats };
}
