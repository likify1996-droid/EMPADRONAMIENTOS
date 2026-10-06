import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { nuevaPagina, escribir, RAIZ } from './lib.mjs';

function reglas() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/revisiones.js'), 'utf8') + ';this.R={revisarNIV,revisarPlacas,revisarTelefono,revisarEdad,revisarNacimiento};', ctx);
  return ctx.R;
}
const HOY = new Date(2026, 9, 6);

export const pruebas = {
  async 'reglas de NIV, placas, teléfono y edad'() {
    const R = reglas();
    assert.equal(R.revisarNIV('MD2B97FX7SCK80149'), '');
    assert.equal(R.revisarNIV('1HGCM82633A004352'), '');
    assert.match(R.revisarNIV('1HGCM82633A00435'), /17 caracteres \(tiene 16\)/);
    assert.match(R.revisarNIV('1HGCM82O33A004352'), /I, O ni Q/);
    assert.match(R.revisarNIV('1HGCM82623A004352'), /dígito verificador/);
    assert.equal(R.revisarPlacas('RXH-123-A'), '');
    assert.match(R.revisarPlacas('ABCDE'), /al menos un número/);
    assert.equal(R.revisarTelefono('+52 81 1234 5678'), '');
    assert.equal(R.revisarTelefono('No proporciona'), '');
    assert.match(R.revisarTelefono('811234567'), /10 dígitos/);
    assert.equal(R.revisarEdad('36', '15/01/1990', HOY), '');
    assert.match(R.revisarEdad('30', '15/01/1990', HOY), /tendría 36/);
    assert.match(R.revisarNacimiento('31/02/1990', HOY), /no existe/);
    assert.match(R.revisarNacimiento('01/01/2030', HOY), /posterior/);
  },
  async 'el formulario marca y avisa, sin impedir generar'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url, {
      dialogos: (d, avisos) => { avisos.alertas.push(d.message()); d.type() === 'confirm' ? d.dismiss() : d.accept(); },
    });
    await escribir(page, 'telefono', '81123');
    await page.locator('#nombre').click();
    assert.match(await page.locator('#telefono').getAttribute('class'), /campo-revisar/);
    assert.match(await page.locator('#rev-telefono').innerText(), /10 dígitos \(tiene 5\)/);
    await escribir(page, 'telefono', '8112345678');
    assert.doesNotMatch(await page.locator('#telefono').getAttribute('class') || '', /campo-revisar/, 'se quita al corregir');
    await escribir(page, 'serie', '1HGCM82O33A004352');
    await page.locator('#nombre').click();
    await page.evaluate(() => { for (const [id, val] of [['nombre_pol', 'P'], ['zona', 'Z'], ['ne', '1'], ['nombre', 'N'], ['nacimiento', '01/01/1990'], ['edad', '36'], ['domicilio', 'D'], ['oficio', 'O'], ['motivo', 'Prevención del delito'], ['addr_texto', 'X']]) document.getElementById(id).value = val; });
    await page.selectOption('#categoria', 'Comercio');
    await page.selectOption('#subcategoria', 'Tianguis');
    const mensajes = [];
    page.removeAllListeners('dialog');
    page.on('dialog', d => { mensajes.push(d.message()); d.type() === 'confirm' ? d.dismiss() : d.accept(); });
    await page.locator('#btn-generar').click();
    assert.match(mensajes[0], /Número de serie: El NIV no lleva/);
    assert.equal(await page.locator('#output-box').isVisible(), false, 'con Cancelar no genera');
    page.removeAllListeners('dialog');
    page.on('dialog', d => d.accept());
    await page.locator('#btn-generar').click();
    assert.equal(await page.locator('#output-box').isVisible(), true, 'con Aceptar sí genera');
    await ctx.close();
  },
};
