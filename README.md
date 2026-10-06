# FC Empadronamiento

App web (PWA) para capturar empadronamientos en campo y generar el reporte listo para pegar en WhatsApp. Funciona en el navegador del teléfono, se puede instalar como app y sigue funcionando sin señal.

## Qué hace

- **Formulario por secciones:** servicio, persona, tatuajes y vehículo.
  - Hasta 5 pestañas abiertas a la vez.
  - Lote de reportes para copiar todos juntos.
  - Se autoguarda en el teléfono y se borra solo a las 12 horas.
- **OCR con IA** de INE y tarjeta de circulación (Groq, a través de un Worker de Cloudflare).
  - El CURP se valida y de él se sacan la fecha de nacimiento, el sexo y el estado.
  - Sin señal, la foto se guarda y se lee después con **▶ Leer ahora**.
- **Ubicación:** GPS, mapa con pin y búsqueda de direcciones. Usa OpenStreetMap (Nominatim) o, opcionalmente, Google Places con una llave propia.
- **Catálogo de vehículos:** al elegir o escanear la submarca se llena solo el tipo de vehículo, y también la marca si falta.
- **🔒 Terminar turno:** borra del teléfono todo lo capturado y conserva solo los datos del policía.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `index.html` | La estructura de la página. No lleva estilos ni `onclick`. |
| `css/styles.css` | Todos los estilos y los temas claro y oscuro. |
| `js/catalogos.js` | Datos: categorías, estados, motivos, tipos y catálogo de vehículos. |
| `js/app.js` | Toda la lógica de la app. |
| `sw.js` | Service worker: hace que la app funcione sin conexión. |
| `manifest.json`, `icon-*.png` | Datos e íconos para instalar la app. |
| `worker/fc-ocr.js` | Copia del Worker de Cloudflare que guarda la API key de Groq. |

### Cómo se conectan los botones

Los elementos del HTML declaran la función que usan con atributos `data-*`, y un solo manejador en `js/app.js` las llama ("EVENTOS DE LA INTERFAZ"):

```html
<button data-action="limpiarSeccion" data-args='["persona"]'>🗑 Limpiar</button>
<input data-input="fmtHoraInput" data-args='["$el"]'>
```

- Atributos disponibles: `data-action` (clic), `data-input`, `data-change`, `data-focus` y `data-blur`.
- Dentro de `data-args`, `"$el"` es el propio elemento y `"$value"` es su valor.

## Publicar un cambio

1. Edita los archivos **del repositorio** (no subas una copia vieja de `index.html` encima).
2. Sube la versión en **dos lugares**:
   - `APP_VERSION` al inicio de `js/app.js` (p. ej. `'20'`).
   - `CACHE` en `sw.js` (p. ej. `'fc-empadronamiento-v20'`).
3. Une el cambio a `main`. GitHub Pages lo publica en 1–2 minutos.
4. Los teléfonos con la app abierta ven el aviso **"Hay una versión nueva"**. La versión que tiene cada teléfono aparece al pie de la página.

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
- Si Groq retira un modelo, actualiza `OCR_MODELOS` en `js/app.js` y `MODELOS_PERMITIDOS` en el Worker.

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
