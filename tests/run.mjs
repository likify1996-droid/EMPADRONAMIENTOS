// Corre todas las pruebas: node tests/run.mjs  (o npm test)
// Filtrar por nombre: node tests/run.mjs vehiculo
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, iniciarServidor, abrirNavegador } from './lib.mjs';

const filtro = process.argv[2] || '';
const archivos = fs.readdirSync(path.join(RAIZ, 'tests')).filter(f => f.endsWith('.test.mjs') && f.includes(filtro)).sort();
const servidor = await iniciarServidor();
const browser = await abrirNavegador();
let fallas = 0, total = 0;
for (const archivo of archivos) {
  const mod = await import(path.join(RAIZ, 'tests', archivo));
  for (const [nombre, prueba] of Object.entries(mod.pruebas)) {
    total++;
    const t0 = Date.now();
    try {
      await prueba({ url: servidor.url, browser });
      console.log(`✅ ${archivo} › ${nombre} (${Date.now() - t0} ms)`);
    } catch (e) {
      fallas++;
      console.log(`❌ ${archivo} › ${nombre}\n   ${String(e && e.stack || e).split('\n').slice(0, 6).join('\n   ')}`);
    }
  }
}
await browser.close();
servidor.cerrar();
console.log(`\n${total - fallas} de ${total} pruebas pasaron`);
process.exit(fallas ? 1 : 0);
