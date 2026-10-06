// Utilidades para las pruebas: servidor local de la app, navegador y
// páginas con las llamadas a internet simuladas (Worker de OCR, Nominatim).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

export function iniciarServidor() {
  const srv = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const archivo = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${srv.address().port}/index.html`, cerrar: () => srv.close() })));
}

export function abrirNavegador() {
  // En la nube de Claude Code el Chromium está en otra ruta; en GitHub usa el de Playwright
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  // Cámara simulada para probar el escaneo con cámara y el marco
  return chromium.launch({ executablePath, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
}

export const WORKER = 'https://fc-ocr.therts649.workers.dev';

// Página nueva con todo internet bloqueado salvo lo que se simule.
// ocr: función (petición) → {status, body} para el Worker.
export async function nuevaPagina(browser, url, { ocr, nominatim, sw = false, colorScheme, dialogos } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: sw ? 'allow' : 'block', colorScheme, permissions: ['camera'] });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::|ERR_|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  const avisos = { prompts: 0, alertas: [] };
  page.on('dialog', d => {
    if (dialogos) return dialogos(d, avisos);
    if (d.type() === 'alert') avisos.alertas.push(d.message());
    if (d.type() === 'confirm' && d.message().startsWith('¿Escanear otro')) return d.dismiss();
    d.accept();
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  if (ocr) await page.route(WORKER + '/**', async r => { const { status = 200, body } = await ocr(r.request()); r.fulfill({ status, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) }); });
  if (nominatim) await page.route(/nominatim\.openstreetmap\.org/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nominatim(r.request())) }));
  await page.goto(url);
  await page.waitForFunction(() => typeof tabsReady !== 'undefined' && tabsReady);
  return { ctx, page, errores, avisos };
}

// Respuesta del Worker con los datos que "leyó" la IA
export const respuestaOcr = datos => ({ body: { choices: [{ message: { content: JSON.stringify(datos) } }] } });

export const escribir = async (page, id, texto) => { await page.locator('#' + id).fill(''); await page.locator('#' + id).pressSequentially(texto); };
export const IMAGEN = path.join(RAIZ, 'icon-192.png');
