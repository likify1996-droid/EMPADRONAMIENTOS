// Proxy de OCR para FC Empadronamiento (Cloudflare Worker "fc-ocr").
// La API key de Groq vive como secreto en Cloudflare, nunca en el teléfono.
//
// Secretos del Worker (Configuración → Variables y secretos):
//   GROQ_API_KEY  (obligatorio) API key de console.groq.com, empieza con gsk_
//   ACCESS_TOKEN  (opcional)    si existe, la app pide esta clave una vez
//
// Este archivo es una copia de lo que está publicado en Cloudflare: si lo
// cambias aquí, pégalo en el editor del Worker y toca "Implementar".

const ORIGENES_PERMITIDOS = [
  'https://likify1996-droid.github.io', // GitHub Pages
];
// Debe coincidir con OCR_MODELOS en js/app.js
const MODELOS_PERMITIDOS = [
  'qwen/qwen3.6-27b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3.8-27b',
];
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB por foto

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-FC-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ORIGENES_PERMITIDOS.includes(origin)) {
      return new Response('Origen no permitido', { status: 403 });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: { message: 'Método no permitido' } }, 405, origin);
    }

    // Clave de acceso: solo se revisa si el secreto ACCESS_TOKEN existe
    if (env.ACCESS_TOKEN && request.headers.get('X-FC-Token') !== env.ACCESS_TOKEN) {
      return json({ error: { message: 'Clave de acceso inválida' } }, 401, origin);
    }
    if (!env.GROQ_API_KEY) {
      return json({ error: { message: 'Falta el secreto GROQ_API_KEY en el Worker' } }, 500, origin);
    }

    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > MAX_BYTES) {
      return json({ error: { message: 'Imagen demasiado grande' } }, 413, origin);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: { message: 'JSON inválido' } }, 400, origin); }

    if (!MODELOS_PERMITIDOS.includes(body.model)) {
      return json({ error: { message: 'Modelo no permitido' } }, 400, origin);
    }
    // Limitar el costo por petición
    body.max_completion_tokens = Math.min(Number(body.max_completion_tokens) || 600, 800);

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.GROQ_API_KEY,
      },
      body: JSON.stringify(body),
    });

    // Si Groq rechaza la API key no es culpa del teléfono: se responde 502
    // para que la app no lo confunda con la clave de acceso.
    if (resp.status === 401) {
      return json({ error: { message: 'Invalid API Key: revisa el secreto GROQ_API_KEY del Worker' } }, 502, origin);
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  },
};
