import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { nuevaPagina, respuestaOcr, IMAGEN, RAIZ } from './lib.mjs';

function docs() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/documentos.js'), 'utf8') + ';this.D={ordenarNombre,inicialesCurp,fechaVencida};', ctx);
  return ctx.D;
}

// Licencia de Nuevo León: el nombre va primero y los apellidos abajo
const LICENCIA = {
  tipo: 'licencia', nombre_impreso: 'JORGE ALBERTO ALVARADO ACOSTA',
  // La IA a veces confunde cuál es cuál; la CURP lo corrige
  nombres: 'ALVARADO ACOSTA', apellido_paterno: 'JORGE', apellido_materno: 'ALBERTO',
  curp: 'AAAJ901228HNLLCR03', fecha_nac: '', domicilio: 'ANT CAMINO A VILLA DE SANTIAGO 3914 SIERRA VENTANA MONTERREY CP 64780',
  licencia_tipo: 'M', licencia_estado: 'NUEVO LEÓN', licencia_folio: '5058332', licencia_vigencia: '04/03/2027',
};

async function leer(page, datos) {
  await page.evaluate(() => { document.getElementById('scan-status').textContent = ''; });
  await page.setInputFiles('#gallery-input', IMAGEN);
  await page.waitForFunction(() => /Listo|No se pudo/.test(document.getElementById('scan-status').textContent));
}

export const pruebas = {
  async 'orden del nombre con la CURP'() {
    const { ordenarNombre: o, inicialesCurp } = docs();
    assert.equal(o({ nombre_impreso: 'JORGE ALBERTO ALVARADO ACOSTA' }, 'AAAJ901228HNLLCR03').nombre, 'ALVARADO ACOSTA JORGE ALBERTO');
    assert.equal(o({ nombre_impreso: 'ALVARADO ACOSTA JORGE ALBERTO' }, 'AAAJ901228HNLLCR03').nombre, 'ALVARADO ACOSTA JORGE ALBERTO');
    assert.equal(o({ nombre_impreso: 'MARÍA JOSÉ NÚÑEZ DE LA O' }, 'NUOJ950101MNLXXS05').nombre, 'NÚÑEZ DE LA O MARÍA JOSÉ');
    assert.equal(o({ nombres: 'JORGE ALBERTO', apellido_paterno: 'ALVARADO', apellido_materno: 'ACOSTA' }, '').nombre, 'ALVARADO ACOSTA JORGE ALBERTO');
    assert.equal(inicialesCurp('Pérez', 'Ñúñez', 'Íñigo'), 'PEXI');
  },
  async 'licencia de conducir llena bien el formulario'({ url, browser }) {
    let datos;
    const { ctx, page, errores } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr(datos) });
    datos = LICENCIA;
    await leer(page, datos);
    const r = await page.evaluate(() => ({ nombre: v('nombre'), curp: v('curp'), nac: v('nacimiento'), sexo: v('sexo'), edo: v('estado_origen'), dom: v('domicilio'), adic: v('adicionales') }));
    assert.equal(r.nombre, 'Alvarado Acosta Jorge Alberto');
    assert.equal(r.curp, 'AAAJ901228HNLLCR03');
    assert.equal(r.nac, '28/12/1990', 'la fecha sale de la CURP');
    assert.equal(r.sexo, 'Masculino');
    assert.equal(r.edo, 'Nuevo León');
    assert.match(r.dom, /^Ant Camino a Villa de Santiago 3914/);
    assert.equal(r.adic, 'Presenta licencia de conducir tipo M, del estado de Nuevo León, folio 5058332, vigente hasta el 04/03/2027.');
    assert.deepEqual(errores, []);
    await ctx.close();
  },
  async 'licencia vencida y fecha de expedición confundida'({ url, browser }) {
    let datos;
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr(datos) });
    // CURP ilegible y la IA puso la fecha de expedición como nacimiento
    datos = { ...LICENCIA, curp: 'AAAJ9O1228HNLLCR03', fecha_nac: '05/03/2024', licencia_vigencia: '04/03/2025' };
    await leer(page, datos);
    assert.match(await page.locator('#curp-status').innerText(), /no es válido/);
    assert.match(await page.locator('#rev-nacimiento').innerText(), /fecha de expedición/);
    assert.match(await page.locator('#adicionales').inputValue(), /VENCIDA desde el 04\/03\/2025/);
    await ctx.close();
  },
  async 'la INE sigue igual'({ url, browser }) {
    let datos;
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr(datos) });
    datos = { tipo: 'ine', nombre_impreso: 'SÁNCHEZ FUENTES LUIS ANTONIO', nombres: 'LUIS ANTONIO', apellido_paterno: 'SÁNCHEZ', apellido_materno: 'FUENTES', curp: 'SAFL990703HDFNNS05' };
    await leer(page, datos);
    assert.equal(await page.locator('#nombre').inputValue(), 'Sánchez Fuentes Luis Antonio');
    assert.equal(await page.locator('#adicionales').inputValue(), '');
    await ctx.close();
  },
};
