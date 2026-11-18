import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import Home from './components/Home.jsx';
import SpaceView from './components/SpaceView.jsx';
import ReportDialog from './components/ReportDialog.jsx';
import {
  getDeviceId,
  getSetting,
  loadSpaces,
  orderSpaces,
  saveAllSpaces,
  saveSpace,
  setSetting,
} from './lib/db.js';
import { buildExport, mergeAll } from './lib/merge.js';
import { deliverFile, readFileText, stamp } from './lib/files.js';
import { handleBack, setBaseBackHandler } from './lib/backstack.js';

export default function App() {
  const [spaces, setSpaces] = useState(null);
  const [current, setCurrent] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [busy, setBusy] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const spacesRef = useRef([]);
  const deviceIdRef = useRef(null);
  const currentRef = useRef(null);
  const toastTimer = useRef(null);
  currentRef.current = current;

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Carga inicial desde el almacenamiento del dispositivo (sin conexión)
  useEffect(() => {
    (async () => {
      try {
        deviceIdRef.current = await getDeviceId();
        const list = await loadSpaces();
        spacesRef.current = list;
        setSpaces(list);
        setProjectName(await getSetting('projectName', ''));
      } catch (err) {
        toast(`No se pudo abrir la base de datos local: ${err.message || err}`);
        spacesRef.current = [];
        setSpaces([]);
      }
    })();
  }, [toast]);

  // Botón "Atrás" de Android
  useEffect(() => {
    setBaseBackHandler(() => {
      if (currentRef.current) {
        setCurrent(null);
        return true;
      }
      if (Capacitor.isNativePlatform()) CapApp.exitApp();
      return false;
    });
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = CapApp.addListener('backButton', () => {
      handleBack();
    });
    return () => {
      sub.then((h) => h.remove());
    };
  }, []);

  const updateSpace = useCallback(
    (id, updater) => {
      const old = spacesRef.current.find((s) => s.id === id);
      if (!old) return;
      const next = updater(old);
      spacesRef.current = spacesRef.current.map((s) => (s.id === id ? next : s));
      setSpaces(spacesRef.current);
      saveSpace(next).catch((err) =>
        toast(`No se pudo guardar en el dispositivo: ${err.message || err}`)
      );
    },
    [toast]
  );

  const changeProjectName = (name) => {
    setProjectName(name);
    setSetting('projectName', name);
  };

  const isCancel = (err) => err && /cancel/i.test(String(err.message || err));

  const doExport = async () => {
    setBusy('Preparando respaldo…');
    try {
      await new Promise((r) => setTimeout(r, 40));
      const data = buildExport(spacesRef.current, deviceIdRef.current);
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      await deliverFile(`inspeccion-datos-${stamp()}.json`, blob, 'Respaldo de Inspección');
      toast('Respaldo generado');
    } catch (err) {
      if (!isCancel(err)) toast(`No se pudo exportar: ${err.message || err}`);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file) => {
    if (
      !window.confirm(
        'Se unirá la información del archivo con la de este dispositivo.\n\nNo se borra nada: en cada hallazgo prevalece el cambio más reciente. ¿Continuar?'
      )
    )
      return;
    setBusy('Importando datos…');
    try {
      await new Promise((r) => setTimeout(r, 40));
      const text = await readFileText(file);
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('El archivo no tiene un formato válido.');
      }
      const { spaces: merged, stats } = mergeAll(spacesRef.current, data);
      const ordered = orderSpaces(merged);
      await saveAllSpaces(ordered);
      spacesRef.current = ordered;
      setSpaces(ordered);
      toast(`Importación lista: ${stats.added} nuevo(s), ${stats.updated} actualizado(s)`);
    } catch (err) {
      toast(err.message || 'No se pudo importar el archivo.');
    } finally {
      setBusy(null);
    }
  };

  if (!spaces) {
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    );
  }

  const space = current ? spaces.find((s) => s.id === current) : null;

  return (
    <>
      {space ? (
        <SpaceView
          key={space.id}
          space={space}
          spaces={spaces}
          projectName={projectName}
          onBack={() => setCurrent(null)}
          onChange={(updater) => updateSpace(space.id, updater)}
          setBusy={setBusy}
          toast={toast}
        />
      ) : (
        <Home
          spaces={spaces}
          projectName={projectName}
          onProjectName={changeProjectName}
          onOpen={setCurrent}
          onReport={() => setShowReport(true)}
          onExport={doExport}
          onImport={doImport}
        />
      )}

      {showReport && (
        <ReportDialog
          spaces={spaces}
          projectName={projectName}
          onClose={() => setShowReport(false)}
          setBusy={setBusy}
          toast={toast}
        />
      )}

      {busy && (
        <div className="busy">
          <div className="spinner" />
          <p>{busy}</p>
        </div>
      )}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
