import localforage from 'localforage';
import { DEFAULT_SPACES } from './constants.js';

// Todo se guarda en IndexedDB, dentro del propio dispositivo. No requiere conexión.
const store = localforage.createInstance({ name: 'inspeccion', storeName: 'datos' });

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const newSpace = ({ id, name }) => ({
  id,
  name,
  nameUpdatedAt: 0,
  plan: null, // { dataUrl, width, height, fileName }
  planUpdatedAt: 0,
  findings: [],
});

export async function getDeviceId() {
  let id = await store.getItem('deviceId');
  if (!id) {
    id = uid();
    await store.setItem('deviceId', id);
  }
  return id;
}

export async function loadSpaces() {
  const stored = await store.getItem('spaceIds');
  const ids = Array.isArray(stored) ? stored : [];
  const spaces = [];
  for (const id of ids) {
    const s = await store.getItem(`space:${id}`);
    if (s) spaces.push(s);
  }
  // Asegura que siempre existan los 6 espacios base.
  let changed = false;
  for (const def of DEFAULT_SPACES) {
    if (!spaces.find((s) => s.id === def.id)) {
      spaces.push(newSpace(def));
      changed = true;
    }
  }
  if (changed || spaces.length !== ids.length) {
    await saveAllSpaces(spaces);
  }
  return orderSpaces(spaces);
}

export function orderSpaces(spaces) {
  const order = DEFAULT_SPACES.map((d) => d.id);
  return [...spaces].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export async function saveSpace(space) {
  await store.setItem(`space:${space.id}`, space);
  const ids = (await store.getItem('spaceIds')) || [];
  if (!ids.includes(space.id)) {
    ids.push(space.id);
    await store.setItem('spaceIds', ids);
  }
}

export async function saveAllSpaces(spaces) {
  for (const s of spaces) await store.setItem(`space:${s.id}`, s);
  await store.setItem(
    'spaceIds',
    spaces.map((s) => s.id)
  );
}

export async function getSetting(key, fallback = null) {
  const v = await store.getItem(`setting:${key}`);
  return v === null || v === undefined ? fallback : v;
}

export async function setSetting(key, value) {
  await store.setItem(`setting:${key}`, value);
}
