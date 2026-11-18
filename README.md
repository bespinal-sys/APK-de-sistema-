# Inspección

Aplicación móvil (Android) para inspeccionar espacios sobre planos. Funciona **sin conexión** y guarda todo en el propio dispositivo.

## Qué hace

- **Pantalla principal** con los 6 espacios del proyecto (cada uno con la miniatura de su plano y el conteo de hallazgos pendientes).
- **Planos**: se carga una imagen (JPG/PNG) o un PDF (si tiene varias páginas, se elige cuál). Se navega con pellizco para acercar, arrastre para desplazar y botones `+`, `−` y `⤢` (ajustar).
- **Hallazgos sobre el plano**: botón **＋ Hallazgo** → tocar el punto del plano → llenar título, descripción, severidad, estado, categoría y responsable. Cada hallazgo se marca con un número de color según su severidad. Se puede mover de lugar o eliminar.
- **Fotografías**: tomar foto con la cámara o elegir de la galería (varias por hallazgo).
- **Informe PDF**: por espacio o de todo el proyecto, con resumen general, el plano con los hallazgos numerados, el detalle de cada uno y sus fotos. Opción de incluir solo los pendientes.
- **Base de datos en el dispositivo** (IndexedDB). No usa servidores ni internet.
- **Actualizar otro dispositivo**: *Exportar datos* genera un archivo `.json` que se envía por WhatsApp, correo, Drive, etc. En el otro equipo, *Importar datos* **une** la información: no borra nada y, en cada hallazgo, prevalece el cambio más reciente. Se puede importar el mismo archivo varias veces sin duplicar.

> Los datos viven solo en el dispositivo. Si se desinstala la aplicación o se borran sus datos, se pierden. Conviene exportar un respaldo con frecuencia.

## Obtener el APK (sin instalar Android Studio)

1. Crea un repositorio en GitHub (puede ser privado) y sube **todo el contenido** de esta carpeta.
2. Entra a la pestaña **Actions** → flujo **Compilar APK**. Se ejecuta solo al subir los archivos; también se puede lanzar con **Run workflow**.
3. Al terminar (unos 5 a 8 minutos), abre la ejecución y descarga el archivo **Inspeccion-apk** (un `.zip` que contiene `app-debug.apk`).
4. Copia el `.apk` al celular e instálalo (hay que permitir *instalar apps de origen desconocido* para el navegador o el administrador de archivos que lo abra).

El APK queda firmado con la clave de depuración, suficiente para instalar en equipos propios. Para publicarlo en Google Play habría que generar uno firmado con clave propia.

## Compilar en tu computadora (alternativa)

Requisitos: Node.js 20+, JDK 17 y Android Studio.

```bash
npm install
npm run android:sync      # compila la web y la copia al proyecto Android
npx cap open android      # abre Android Studio
```

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
O por línea de comandos: `cd android && ./gradlew assembleDebug` (el APK queda en `android/app/build/outputs/apk/debug/`).

## Probar en el navegador

```bash
npm install
npm run dev
```

## Personalizar

| Qué | Dónde |
| --- | --- |
| Nombres de los 6 espacios | Se cambian dentro de la app (lápiz ✎ en cada espacio) o en `src/lib/constants.js` |
| Categorías, severidades y estados | `src/lib/constants.js` |
| Colores | `src/styles.css` (variables al inicio) |
| Nombre visible / identificador de la app | `capacitor.config.json` (`appName`, `appId`) y `android/app/src/main/res/values/strings.xml` |
| Ícono y pantalla de inicio | `android/app/src/main/res/` (carpetas `mipmap-*` y `drawable*`) |

## Notas técnicas

- React 18 + Vite, empaquetado con Capacitor 6. Almacenamiento con `localforage` (IndexedDB), informes con `jsPDF` y lectura de planos PDF con `pdf.js`.
- Los hallazgos guardan su posición como proporción (0 a 1) del plano, por lo que no se desplazan con el zoom ni con el tamaño de pantalla.
- La numeración de hallazgos se asigna por fecha de creación; al unir datos de dos dispositivos, los números se reordenan según esa fecha.
- Las fotografías se reducen a 1600 px y los planos a 3600 px para cuidar el espacio y la memoria.
