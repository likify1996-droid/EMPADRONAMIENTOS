# FC Empadronamiento

App web (PWA) para capturar empadronamientos en campo y generar el reporte listo para pegar en WhatsApp. Funciona en el navegador del teléfono, se puede instalar como app y sigue funcionando sin señal.

## Qué hace

- **Formulario por secciones:** servicio, persona, tatuajes y vehículo.
  - Hasta 5 pestañas abiertas a la vez.
  - Lote de reportes para copiar todos juntos.
  - Se autoguarda en el teléfono y se borra solo a las 12 horas.
- **OCR con IA** de INE y tarjeta de circulación (Groq, a través de un Worker de Cloudflare).
  - El CURP se valida y de él se sacan la fecha de nacimiento, el sexo y el estado.
  - Lee INE, licencias de conducir y pasaportes. El nombre siempre queda como "Apellidos Nombre(s)" (la licencia lo imprime al revés que la INE), comprobado con la CURP, y la licencia se anota en Datos adicionales con su tipo, folio y vigencia.
  - Sin señal, la foto se guarda y se lee después con **▶ Leer ahora**.
- **Ubicación:** GPS, mapa con pin y búsqueda de direcciones. Usa OpenStreetMap (Nominatim) o, opcionalmente, Google Places con una llave propia.
- **Catálogo de vehículos:** al elegir o escanear la submarca se llena solo el tipo de vehículo, y también la marca si falta.
- **🔒 Terminar turno:** borra del teléfono todo lo capturado y conserva solo los datos del policía.
- **Marco guía en la cámara:** a la IA se envía solo lo que está dentro del marco de la credencial. Con 🔲 se apaga para documentos grandes.
- **Lectura con fotos difíciles:**
  - Toma 5 fotos seguidas y usa (y guarda) solo la más nítida.
  - Con 🤖 la foto se toma sola cuando la credencial está quieta y enfocada.
  - Avisa si hay reflejo o si la foto está borrosa.
  - Se envía a color. Se puede cambiar a blanco y negro con "Lectura: a color" para comparar.
  - Si la CURP, el NIV o el código del reverso no cuadran, vuelve a leer la misma foto con otro modelo y se queda con la mejor lectura.
  - El reverso de la INE (renglones IDMEX) da fecha de nacimiento y sexo verificados con sus dígitos de control.
- **Revisión de datos:** NIV/serie (17 caracteres y dígito verificador), placas, teléfono de 10 dígitos y que la edad cuadre con la fecha de nacimiento. Lo dudoso se marca en naranja; avisa pero no impide generar.
- **📤 WhatsApp:** envía el reporte o el lote completo sin copiar y pegar.
- **🎤 Dictado por voz** en Datos adicionales, Tatuajes y Observaciones (necesita internet).
- **🖨 PDF del lote:** abre "Imprimir"; en el teléfono se elige "Guardar como PDF".

## Archivos

| Archivo | Qué contiene |
|---|---|
| `index.html` | La estructura de la página. No lleva estilos ni `onclick`. |
| `css/styles.css` | Todos los estilos y los temas claro y oscuro. |
| `js/catalogos.js` | Datos: categorías, estados, motivos, tipos y catálogo de vehículos. |
| `js/nucleo.js` | Base de la interfaz: eventos, avisos, tema y utilidades. Aquí va `APP_VERSION`. |
| `js/revisiones.js` | Reglas para revisar NIV, placas, teléfono y edad. |
| `js/formulario.js` | Validación, campos calculados, limpiar y datos del policía, avisos de revisión y dictado. |
| `js/vehiculo.js` | Autocompletado de marca y submarca, y tipo automático. |
| `js/ubicacion.js` | GPS, mapa y búsqueda de direcciones. |
| `js/imagen.js` | Nitidez, reflejo y movimiento de la foto (ráfaga, avisos y foto automática). |
| `js/documentos.js` | Orden del nombre según el documento (INE, licencia, pasaporte), comprobado con la CURP. |
| `js/ocr.js` | Cámara, galería, CURP, envío al Worker y fotos pendientes. |
| `js/reporte.js` | Texto del reporte, lote, copiar, WhatsApp, PDF y vista previa. |
| `js/pestanas.js` | Pestañas y autoguardado. |
| `js/app.js` | Arranque de la app, service worker e instalación. |
| `sw.js` | Service worker: hace que la app funcione sin conexión. |
| `manifest.json`, `icon-*.png` | Datos e íconos para instalar la app. |
| `fonts/` | Tipografías Rajdhani y Exo 2 (licencia OFL), para que se vean igual sin conexión. |
| `tests/` | Pruebas automáticas (ver abajo). |
| `worker/fc-ocr.js` | Copia del Worker de Cloudflare que guarda la API key de Groq. |

### Cómo se conectan los botones

Los elementos del HTML declaran la función que usan con atributos `data-*`, y un solo manejador en `js/nucleo.js` las llama ("EVENTOS DE LA INTERFAZ"):

```html
<button data-action="limpiarSeccion" data-args='["persona"]'>🗑 Limpiar</button>
<input data-input="fmtHoraInput" data-args='["$el"]'>
```

- Atributos disponibles: `data-action` (clic), `data-input`, `data-change`, `data-focus` y `data-blur`.
- Dentro de `data-args`, `"$el"` es el propio elemento y `"$value"` es su valor.

## Publicar un cambio

1. Edita los archivos **del repositorio** (no subas una copia vieja de `index.html` encima).
2. Sube la versión en **dos lugares**:
   - `APP_VERSION` al inicio de `js/nucleo.js` (p. ej. `'20'`).
   - `CACHE` en `sw.js` (p. ej. `'fc-empadronamiento-v20'`).
3. Une el cambio a `main`. GitHub Pages lo publica en 1–2 minutos.
4. Los teléfonos con la app abierta ven el aviso **"Hay una versión nueva"**. La versión que tiene cada teléfono aparece al pie de la página.

## Pruebas automáticas

La carpeta `tests/` tiene pruebas que abren la app en Chromium y la usan como un policía: llenan el formulario, generan el reporte, escanean con el OCR simulado, prueban el modo sin señal, el catálogo y el Worker. Todo lo de internet se simula, así que no gastan Groq.

- **En GitHub** corren solas en cada PR (pestaña *Checks*). Si algo se rompió, aparece una ❌ antes de unir el cambio.
- **En una computadora:**
  ```
  npm install
  npx playwright install chromium
  npm test              # todas
  npm test -- vehiculo  # solo las de un archivo
  ```

## Catálogo de vehículos

En `js/catalogos.js`, `VEHICULOS` está organizado por **marca → tipo → modelos**:

```js
'Nissan':{S:['Versa','Sentra'],P:['NP300'],SUV:['Kicks']},
```

- Para agregar un modelo, ponlo en la lista del tipo que le corresponde.
- Las claves de tipo están explicadas arriba de `TIPO_CLAVE`: `M` moto, `S` sedán, `P` pick up, `SUV`, `V` van, etc.
- Si a la marca le falta ese tipo, agrega la clave nueva.
- Otros nombres de una marca ("VW", "Mercedes") van en `MARCA_ALIAS`.

## Worker de OCR (Cloudflare)

La app manda la foto a `https://fc-ocr.therts649.workers.dev`. El Worker le agrega la API key de Groq y la reenvía; la key nunca llega al teléfono.

En el Worker, en **Configuración → Variables y secretos**:

| Secreto | |
|---|---|
| `GROQ_API_KEY` | **Obligatorio.** Key de console.groq.com (empieza con `gsk_`). |
| `ACCESS_TOKEN` | Opcional. Si existe, la app pide esta clave una vez por teléfono. |

- Para cambiar el código, edita `worker/fc-ocr.js`, pégalo en el editor del Worker y toca **Implementar**.
- Si cambias la dirección donde se publica la app, actualiza `ORIGENES_PERMITIDOS`.
- Si Groq retira un modelo, actualiza `OCR_MODELOS` en `js/ocr.js` y `MODELOS_PERMITIDOS` en el Worker.

### Mensajes de error del OCR

| Mensaje | Qué revisar |
|---|---|
| "La API key de Groq guardada en Cloudflare no es válida o falta" | El secreto `GROQ_API_KEY` del Worker. |
| "Falta la clave de acceso para OCR o no es correcta" | El secreto `ACCESS_TOKEN`. Si lo quieres quitar, bórralo y toca **Implementar**. |
| Error 403 | La app se está abriendo desde una dirección que no está en `ORIGENES_PERMITIDOS`. |

## Datos personales

- Todo lo capturado se guarda **solo en el teléfono** y se borra a las 12 horas o con **🔒 Terminar turno**.
- Las fotos de documentos se envían a Groq para leerlas.
- La app además descarga una copia de cada foto escaneada a la galería del teléfono.
