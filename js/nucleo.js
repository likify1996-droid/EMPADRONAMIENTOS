// Base de la interfaz: errores, eventos (data-action...), utilidades, avisos, tema y secciones.
// Parte de la app; se carga en el orden de index.html.

// ── DEBUG: captura errores no manejados (ayuda a diagnosticar en campo) ──
window.addEventListener('error',function(ev){
  console.error('Error global:',ev.error||ev.message);
  if(typeof showToast==='function')showToast('⚠️ Error inesperado: '+(ev.message||'desconocido'),4000);
});
window.addEventListener('unhandledrejection',function(ev){
  console.error('Promesa rechazada sin manejar:',ev.reason);
});


// Versión de la app: súbela junto con CACHE en sw.js en cada cambio publicado.
// Se muestra al pie de la página para saber qué versión tiene cada teléfono.
const APP_VERSION='24';

// ── EVENTOS DE LA INTERFAZ ─────────────────────────────
// El HTML no lleva onclick/oninput: cada elemento declara la función que usa
// con data-action (clic), data-input, data-change, data-focus o data-blur, y
// sus argumentos en data-args (JSON). En los argumentos, "$el" es el propio
// elemento y "$value" su valor. data-self-only hace que el clic solo cuente
// sobre el elemento mismo (para cerrar ventanas al tocar el fondo).
function runUiHandler(el,attr){
  const name=el.dataset[attr];
  const fn=window[name];
  if(typeof fn!=='function'){console.error('Función de interfaz no encontrada:',name);return;}
  let args=[];
  if(el.dataset.args){
    try{args=JSON.parse(el.dataset.args);}catch(e){console.error('data-args inválido en',el);}
  }
  args=args.map(a=>a==='$el'?el:a==='$value'?el.value:a);
  return fn.apply(el,args);
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');
  if(!el||el.disabled)return;
  if('selfOnly' in el.dataset&&e.target!==el)return;
  runUiHandler(el,'action');
});
[['input','input'],['change','change'],['focusin','focus'],['focusout','blur']].forEach(([evento,attr])=>{
  document.addEventListener(evento,e=>{
    const el=e.target;
    if(el&&el.dataset&&el.dataset[attr])runUiHandler(el,attr);
  });
});

// Pequeñas acciones que antes iban escritas dentro del HTML
function abrirGaleria(){document.getElementById('gallery-input').click();}
function abrirImportPolicia(){document.getElementById('import-policia-input').click();}
function aMayusculas(el){el.value=el.value.toUpperCase();}
function copiarYCerrarPreview(){copiar();cerrarPreview();}

// ── AUTOCOMPLETE GENÉRICO ──────────────────────────────
const AC_LISTAS={ESTADOS};
function pintarAutocomplete(inId,listId,hits){
  const list=document.getElementById(listId);
  list.innerHTML='';
  if(!hits.length){list.classList.remove('show');return;}
  hits.forEach(m=>{
    const d=document.createElement('div');
    d.className='ac-item';
    d.textContent=m;
    d.addEventListener('mousedown',()=>acPick(inId,listId,d));
    list.appendChild(d);
  });
  list.classList.add('show');
}
function acFilter(inId,listId,data){
  if(typeof data==='string')data=AC_LISTAS[data]||[];
  // Sin acentos ni mayúsculas: "nuevo leon" encuentra "Nuevo León"
  const val=normVeh(document.getElementById(inId).value);
  if(!val){document.getElementById(listId).classList.remove('show');return;}
  pintarAutocomplete(inId,listId,data.filter(d=>normVeh(d).includes(val)).slice(0,8));
}
function acPick(inId,listId,el){
  document.getElementById(inId).value=el.textContent;
  document.getElementById(listId).classList.remove('show');
  if(inId==='marca'){updateSubmarcaList();aplicarDeteccionVehiculo();}
  if(inId==='submarca')aplicarDeteccionVehiculo();
}
document.addEventListener('click',e=>{
  document.querySelectorAll('.autocomplete-list').forEach(l=>{
    const inp=l.previousElementSibling;
    if(inp&&!inp.contains(e.target))l.classList.remove('show');
  });
});

// ── CARGA DIFERIDA DE LIBRERÍAS EXTERNAS ───────────────
// Leaflet y heic2any ya no bloquean el arranque: solo se descargan cuando
// se usan (abrir mapa / foto HEIC). Con señal mala la app abre igual.
const _libPromises={};
function loadScriptOnce(src,integrity){
  if(_libPromises[src])return _libPromises[src];
  _libPromises[src]=new Promise((resolve,reject)=>{
    const el=document.createElement('script');
    el.src=src;
    if(integrity){el.integrity=integrity;el.crossOrigin='';}
    el.onload=resolve;
    el.onerror=()=>{delete _libPromises[src];reject(new Error('No se pudo descargar '+src.split('/').pop()+' (revisa tu conexión)'));};
    document.head.appendChild(el);
  });
  return _libPromises[src];
}
function loadCssOnce(href,integrity){
  if(document.querySelector(`link[href="${href}"]`))return;
  const el=document.createElement('link');
  el.rel='stylesheet';el.href=href;
  if(integrity){el.integrity=integrity;el.crossOrigin='';}
  document.head.appendChild(el);
}
async function ensureLeaflet(){
  if(window.L)return;
  loadCssOnce('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=');
  await loadScriptOnce('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=');
}
async function ensureHeic(){
  if(typeof heic2any==='function')return;
  await loadScriptOnce('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js','sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL');
}

// ── FILL HELPER ───────────────────────────────────────
function toTitleCase(str){
  if(!str)return str;
  const lowers=['de','del','la','las','los','y','e','en','a','al'];
  // \p{L}: cualquier letra, con o sin acento (con \w, "SÁNCHEZ" quedaba "SáNchez")
  return str.toLowerCase().replace(/[\p{L}\p{M}]+/gu,(word,idx)=>{
    if(idx>0&&lowers.includes(word))return word;
    return word.charAt(0).toUpperCase()+word.slice(1);
  });
}
function fill(id,val){
  if(!val)return;
  const el=document.getElementById(id);
  if(el){el.value=val;el.classList.add('filled');el.classList.remove('just-filled');void el.offsetWidth;el.classList.add('just-filled');}
  programarRefresco();
}
function fillTitle(id,val){
  if(!val)return;
  fill(id,toTitleCase(val));
}

function stopScan(){}

// ── TEMA MANUAL ───────────────────────────────────────
let currentTheme = window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark';
function toggleTheme(){
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('theme-btn').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('fc_theme', currentTheme);
}
function loadTheme(){
  const saved = localStorage.getItem('fc_theme');
  if(saved){
    currentTheme = saved;
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('theme-btn').textContent = saved === 'dark' ? '🌙' : '☀️';
  }
}

// ── SEARCHABLE SELECT ──────────────────────────────────
function renderTiposVehiculo(){
  const dd=document.getElementById('tipo_vehiculo_dropdown');
  if(!dd)return;
  dd.innerHTML='';
  TIPOS_VEHICULO.forEach(t=>{
    const item=document.createElement('div');
    item.className='sv-item sv-vehicle';
    item.dataset.action='pickSelect';
    item.dataset.args=JSON.stringify(['tipo_vehiculo','tipo_vehiculo_search',t.nombre]);
    const ico=document.createElement('span');
    ico.className='sv-ico';
    ico.innerHTML=t.svg; // SVG fijo del catálogo, no viene del usuario
    const lbl=document.createElement('span');
    lbl.className='sv-label';
    lbl.textContent=t.nombre;
    item.append(ico,lbl);
    dd.appendChild(item);
  });
}
function mostrarTiposVehiculo(){document.getElementById('tipo_vehiculo_dropdown').style.display='block';}
function filterSelect(hiddenId, searchId){
  const val = document.getElementById(searchId).value.toLowerCase();
  const dropdown = document.getElementById(hiddenId + '_dropdown');
  dropdown.style.display = 'block';
  dropdown.querySelectorAll('.sv-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}
function pickSelect(hiddenId, searchId, value){
  if(hiddenId==='tipo_vehiculo'){
    tipoVehiculoAuto=false;
    const h=document.getElementById('tipo-detectado');if(h)h.style.display='none';
  }
  document.getElementById(hiddenId).value = value;
  programarRefresco();
  document.getElementById(searchId).value = value;
  document.getElementById(hiddenId + '_dropdown').style.display = 'none';
}
document.addEventListener('click', e => {
  const dropdowns = document.querySelectorAll('[id$="_dropdown"]');
  dropdowns.forEach(d => {
    const searchId = d.id.replace('_dropdown', '_search');
    const searchEl = document.getElementById(searchId);
    if(searchEl && !searchEl.contains(e.target) && !d.contains(e.target)){
      d.style.display = 'none';
    }
  });
});

// ── SECCIONES COLAPSABLES ──────────────────────────────
function toggleSection(id){
  const body=document.getElementById(id);
  if(!body)return;
  const arrow=document.getElementById(id.replace('-body','-arrow'));
  const isCollapsed=body.style.maxHeight==='0px';
  // La altura se fija solo durante la animación; al terminar queda libre
  // para que los campos que aparecen después (p. ej. carrera) no se corten.
  body.style.maxHeight=body.scrollHeight+'px';
  if(isCollapsed){
    body.style.opacity='1';
    if(arrow)arrow.style.transform='rotate(0deg)';
    body.addEventListener('transitionend',function fin(e){
      if(e.propertyName!=='max-height')return;
      body.removeEventListener('transitionend',fin);
      if(body.style.maxHeight!=='0px')body.style.maxHeight='none';
    });
  } else {
    void body.offsetHeight;
    body.style.maxHeight='0px';
    body.style.opacity='0';
    if(arrow)arrow.style.transform='rotate(-90deg)';
  }
}

// ── HELPERS ────────────────────────────────────────────
function v(id){return document.getElementById(id).value.trim();}
function np(id){return v(id)||'No proporciona';}
function na(id){return v(id)||'N/A';}
function fmtF(val){if(!val)return'';const[y,m,d]=val.split('-');return`${d}/${m}/${y}`;}

// ── VIBRACIÓN ───────────────────────────────────────────
// Vibration feedback
function vibrate(ms){if(navigator.vibrate)navigator.vibrate(ms);}

// ── SPLASH ──────────────────────────────────────────────
function hideSplash(){
  const sp=document.getElementById('splash');
  if(!sp)return;
  // Copiar el logo del header al splash
  const headerLogo=document.querySelector('.header-logo');
  const splashLogo=document.getElementById('splash-logo');
  if(headerLogo&&splashLogo)splashLogo.src=headerLogo.src;
  setTimeout(()=>{
    sp.style.opacity='0';
    setTimeout(()=>sp.remove(),500);
  },1100);
}

// ── TOAST ───────────────────────────────────────────────
function showToast(msg,ms=2200){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.display='block';
  clearTimeout(window._toastTimer);
  window._toastTimer=setTimeout(()=>t.style.display='none',ms);
}

// ── MODO COMPACTO ───────────────────────────────────────
function toggleCompact(){
  document.body.classList.toggle('compact');
  const on=document.body.classList.contains('compact');
  localStorage.setItem('fc_compact',on?'1':'0');
  showToast(on?'📏 Modo compacto activado':'📏 Modo normal');
}
function loadCompact(){
  if(localStorage.getItem('fc_compact')==='1')document.body.classList.add('compact');
}

// ── SECCIÓN ACTIVA ──────────────────────────────────────
document.addEventListener('focusin',e=>{
  document.querySelectorAll('.section.active-section').forEach(s=>s.classList.remove('active-section'));
  const sec=e.target.closest('.section');
  if(sec)sec.classList.add('active-section');
});
