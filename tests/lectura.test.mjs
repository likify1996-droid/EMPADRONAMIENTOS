// Mejoras de lectura con fotos de mala calidad: foto a color, reflejo,
// segunda lectura, reverso de la INE (MRZ) y captura automática.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { nuevaPagina, respuestaOcr, RAIZ } from './lib.mjs';

function cargar(...archivos) {
  const ctx = { document: {} };
  vm.createContext(ctx);
  const nombres = ['nitidez', 'fraccionReflejo', 'diferenciaCuadros', 'leerMRZ', 'digitoMRZ', 'problemasLectura', 'mejorLectura'];
  vm.runInContext(archivos.map(a => fs.readFileSync(path.join(RAIZ, 'js', a), 'utf8')).join('\n') + ';this.X={' + nombres.map(f => `${f}:typeof ${f}==='function'?${f}:undefined`).join(',') + '};', ctx);
  return ctx.X;
}
// MRZ de una INE con dígitos de control correctos
function mrzIne(X, nac = '901228', sexo = 'M') {
  const l2 = nac + X.digitoMRZ(nac) + sexo + '291231' + X.digitoMRZ('291231') + 'MEX' + '<'.repeat(11) + '0';
  return 'IDMEX1234567893<<1234567890123\n' + l2 + '\nALVARADO<ACOSTA<<JORGE<ALBERTO<<<<<<<<<';
}
// Imagen PNG generada en el navegador (para "Galería")
async function imagen(page, dibujo) {
  const b64 = await page.evaluate(dibujo);
  return { name: 'prueba.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}
async function leerGaleria(page, archivo) {
  await page.evaluate(() => { document.getElementById('scan-status').textContent = ''; });
  await page.setInputFiles('#gallery-input', archivo);
  await page.waitForFunction(() => /Listo|No se pudo/.test(document.getElementById('scan-status').textContent));
}
const CREDENCIAL = () => { const c = document.createElement('canvas'); c.width = 856; c.height = 540; const x = c.getContext('2d'); x.fillStyle = '#d8e6f0'; x.fillRect(0, 0, 856, 540); x.fillStyle = '#123'; x.font = 'bold 30px sans-serif'; for (let i = 0; i < 9; i++) x.fillText('ALVARADO ACOSTA JORGE 1990 CURP', 30, 60 + i * 55); x.fillStyle = '#c00'; x.fillRect(700, 40, 120, 120); return c.toDataURL('image/png').split(',')[1]; };

export const pruebas = {
  async 'nitidez, reflejo y movimiento'() {
    const X = cargar('imagen.js');
    const w = 64, h = 64;
    const plano = { w, h, g: new Float32Array(w * h).fill(120) };
    const ajedrez = { w, h, g: Float32Array.from({ length: w * h }, (_, i) => ((i % w) + Math.floor(i / w)) % 2 ? 255 : 0) };
    assert.equal(X.nitidez(plano), 0);
    assert.ok(X.nitidez(ajedrez) > 1000);
    const brillo = { w, h, g: Float32Array.from({ length: w * h }, (_, i) => i < 400 ? 255 : 100) };
    assert.ok(X.fraccionReflejo(brillo) > 0.09);
    assert.equal(X.diferenciaCuadros(plano, plano), 0);
    assert.equal(X.diferenciaCuadros(plano, ajedrez) > 100, true);
  },
  async 'código del reverso de la INE'() {
    const X = cargar('revisiones.js', 'documentos.js');
    const r = X.leerMRZ(mrzIne(X), new Date(2026, 9, 6));
    assert.equal(r.valido, true);
    assert.equal(r.fecha_nac, '28/12/1990');
    assert.equal(r.sexo, 'Masculino');
    assert.equal(r.apellidos, 'ALVARADO ACOSTA');
    assert.equal(r.nombres, 'JORGE ALBERTO');
    // Un dígito mal leído se detecta
    const malo = mrzIne(X).replace('901228', '901223');
    assert.equal(X.leerMRZ(malo).valido, false);
    assert.equal(X.problemasLectura({ tipo: 'ine_reverso', mrz: malo }).length, 1);
    // Ejemplo oficial de la norma ICAO 9303
    const icao = X.leerMRZ('I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<', new Date(2026, 9, 6));
    assert.deepEqual([icao.fecha_nac, icao.sexo, icao.nombres, icao.controles.documento], ['12/08/1974', 'Femenino', 'ANNA MARIA', true]);
  },
  async 'segunda lectura cuando la CURP no cuadra'({ url, browser }) {
    const peticiones = [];
    const { ctx, page } = await nuevaPagina(browser, url, {
      ocr: req => {
        const b = JSON.parse(req.postData());
        peticiones.push({ modelo: b.model, texto: b.messages[0].content[0].text });
        const curp = peticiones.length === 1 ? 'AAAJ9O1228HNLLCR03' : 'AAAJ901228HNLLCR03';
        return respuestaOcr({ tipo: 'licencia', nombre_impreso: 'JORGE ALBERTO ALVARADO ACOSTA', curp });
      },
    });
    await leerGaleria(page, await imagen(page, CREDENCIAL));
    assert.equal(peticiones.length, 2);
    assert.notEqual(peticiones[1].modelo, peticiones[0].modelo, 'la segunda vez usa otro modelo');
    assert.match(peticiones[1].texto, /IMPORTANTE: otra lectura .* "AAAJ9O1228HNLLCR03" no es válida/);
    assert.equal(await page.locator('#curp').inputValue(), 'AAAJ901228HNLLCR03');
    assert.equal(await page.locator('#nombre').inputValue(), 'Alvarado Acosta Jorge Alberto');
    await ctx.close();
  },
  async 'lectura buena: una sola consulta'({ url, browser }) {
    let n = 0;
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => { n++; return respuestaOcr({ tipo: 'licencia', nombre_impreso: 'JORGE ALBERTO ALVARADO ACOSTA', curp: 'AAAJ901228HNLLCR03' }); } });
    await leerGaleria(page, await imagen(page, CREDENCIAL));
    assert.equal(n, 1);
    await ctx.close();
  },
  async 'reverso de la INE llena fecha y sexo'({ url, browser }) {
    const X = cargar('revisiones.js', 'documentos.js');
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr({ tipo: 'ine_reverso', mrz: mrzIne(X, '850703', 'F') }) });
    await page.locator('#nombre').fill('Núñez López María');
    await leerGaleria(page, await imagen(page, CREDENCIAL));
    assert.equal(await page.locator('#nacimiento').inputValue(), '03/07/1985');
    assert.equal(await page.locator('#sexo').inputValue(), 'Femenino');
    assert.equal(await page.locator('#nombre').inputValue(), 'Núñez López María', 'no reemplaza el nombre del frente (con acentos)');
    assert.match(await page.locator('#ocr-summary').innerText(), /Código del reverso ✔/);
    await ctx.close();
  },
  async 'foto a color, o en gris si se elige'({ url, browser }) {
    let enviada;
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: req => { enviada = JSON.parse(req.postData()).messages[0].content[1].image_url.url; return respuestaOcr({ tipo: 'ine' }); } });
    const saturacion = () => page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(760, 100, 1, 1).data; r(d[0] - d[2]); }; i.src = src; }), enviada);
    await leerGaleria(page, await imagen(page, CREDENCIAL));
    assert.ok(await saturacion() > 100, 'el cuadro rojo sigue rojo');
    await page.getByRole('button', { name: /Lectura: a color/ }).click();
    assert.match(await page.locator('#modo-ocr-btn').innerText(), /B\/N/);
    await leerGaleria(page, await imagen(page, CREDENCIAL));
    assert.ok(Math.abs(await saturacion()) < 5, 'en modo gris ya no hay color');
    await ctx.close();
  },
  async 'aviso de reflejo'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr({ tipo: 'ine' }) });
    const conReflejo = await imagen(page, () => { const c = document.createElement('canvas'); c.width = 856; c.height = 540; const x = c.getContext('2d'); x.fillStyle = '#9ab'; x.fillRect(0, 0, 856, 540); x.fillStyle = '#123'; x.font = '30px sans-serif'; for (let i = 0; i < 9; i++) x.fillText('TEXTO DE PRUEBA 123456', 30, 60 + i * 55); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(430, 270, 160, 90, 0, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1]; });
    await leerGaleria(page, conReflejo);
    assert.match(await page.locator('#img-quality').innerText(), /reflejo/);
    await ctx.close();
  },
  async 'foto automática con la credencial quieta y enfocada'({ url, browser }) {
    let n = 0;
    // Cámara simulada: muestra una credencial nítida y quieta
    const { ctx, page } = await nuevaPagina(browser, url, {
      ocr: () => { n++; return respuestaOcr({ tipo: 'ine', nombre_impreso: 'PEREZ LOPEZ ANA' }); },
      antes: () => {
        navigator.mediaDevices.getUserMedia = async () => {
          const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
          const x = c.getContext('2d');
          const pintar = () => { x.fillStyle = '#d8e6f0'; x.fillRect(0, 0, 1280, 720); x.fillStyle = '#123'; x.font = 'bold 34px sans-serif'; for (let i = 0; i < 11; i++) x.fillText('ALVARADO ACOSTA JORGE ALBERTO 1990', 160, 110 + i * 52); requestAnimationFrame(pintar); };
          pintar();
          return c.captureStream(15);
        };
      },
    });
    await page.evaluate(() => { savePhotoToDevice = () => {}; });
    await page.getByRole('button', { name: '📸 Cámara' }).click();
    await page.waitForFunction(() => /Listo/.test(document.getElementById('scan-status').textContent), null, { timeout: 8000 });
    assert.equal(n, 1, 'se tomó sola sin tocar Capturar');
    assert.equal(await page.locator('#nombre').inputValue(), 'Perez Lopez Ana');
    await ctx.close();
  },
  async 'sin foto automática si está borrosa'({ url, browser }) {
    let n = 0;
    const { ctx, page } = await nuevaPagina(browser, url, {
      ocr: () => { n++; return respuestaOcr({ tipo: 'ine' }); },
      antes: () => {
        navigator.mediaDevices.getUserMedia = async () => {
          const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
          const x = c.getContext('2d');
          x.filter = 'blur(10px)'; x.fillStyle = '#d8e6f0'; x.fillRect(0, 0, 1280, 720); x.fillStyle = '#123'; x.font = 'bold 34px sans-serif';
          for (let i = 0; i < 11; i++) x.fillText('ALVARADO ACOSTA JORGE ALBERTO 1990', 160, 110 + i * 52);
          setInterval(() => { x.filter = 'none'; x.fillStyle = 'rgba(0,0,0,0.001)'; x.fillRect(0, 0, 1, 1); }, 100); // mantiene el video vivo
          return c.captureStream(15);
        };
      },
    });
    await page.getByRole('button', { name: '📸 Cámara' }).click();
    await page.waitForTimeout(3500);
    assert.equal(n, 0);
    assert.equal(await page.locator('#ocr-container').isVisible(), true, 'la cámara sigue abierta');
    await ctx.close();
  },
};
