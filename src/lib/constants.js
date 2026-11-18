export const APP_NAME = 'Inspección';
export const EXPORT_FORMAT = 'inspeccion-datos';
export const EXPORT_VERSION = 1;

// Identificadores fijos para que dos dispositivos reconozcan los mismos espacios al sincronizar.
export const DEFAULT_SPACES = [
  { id: 'esp-1', name: 'Espacio 1' },
  { id: 'esp-2', name: 'Espacio 2' },
  { id: 'esp-3', name: 'Espacio 3' },
  { id: 'esp-4', name: 'Espacio 4' },
  { id: 'esp-5', name: 'Espacio 5' },
  { id: 'esp-6', name: 'Espacio 6' },
];

export const CATEGORIES = [
  'Obra civil / Arquitectónico',
  'Eléctrico',
  'Telecomunicaciones',
  'Control de acceso / CCTV',
  'Detección y alarma de incendio',
  'Climatización / Mecánico',
  'Limpieza / Mantenimiento',
  'Otro',
];

export const SEVERITIES = [
  { id: 'critica', label: 'Crítica', color: '#c62828' },
  { id: 'alta', label: 'Alta', color: '#ef6c00' },
  { id: 'media', label: 'Media', color: '#f9a825' },
  { id: 'baja', label: 'Baja', color: '#2e7d32' },
];

export const STATUSES = [
  { id: 'abierto', label: 'Abierto', color: '#c62828' },
  { id: 'en_proceso', label: 'En proceso', color: '#1565c0' },
  { id: 'cerrado', label: 'Cerrado', color: '#2e7d32' },
];

export const severityOf = (id) => SEVERITIES.find((s) => s.id === id) || SEVERITIES[2];
export const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
