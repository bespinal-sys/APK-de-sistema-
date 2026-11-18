import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = () => Capacitor.isNativePlatform();

function downloadInBrowser(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('No se pudo preparar el archivo.'));
    r.readAsDataURL(blob);
  });
}

/**
 * Entrega un archivo al usuario.
 * - En el celular abre el menú de compartir (guardar en Archivos, Drive, WhatsApp, correo, etc.).
 * - En el navegador lo descarga directamente.
 */
export async function deliverFile(filename, blob, dialogTitle = 'Compartir archivo') {
  if (!isNative()) {
    downloadInBrowser(filename, blob);
    return;
  }
  const data = await blobToBase64(blob);
  await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({ title: filename, dialogTitle, url: uri });
}

export const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsText(file);
  });

export { Encoding };
