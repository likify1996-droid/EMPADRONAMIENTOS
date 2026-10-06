// ── DEBUG: captura errores no manejados (ayuda a diagnosticar en campo) ──
window.addEventListener('error',function(ev){
  console.error('Error global:',ev.error||ev.message);
  if(typeof showToast==='function')showToast('⚠️ Error inesperado: '+(ev.message||'desconocido'),4000);
});
window.addEventListener('unhandledrejection',function(ev){
  console.error('Promesa rechazada sin manejar:',ev.reason);
});


// ── SUBCATEGORÍAS ──────────────────────────────────────
function updateSubcat(){
  const cat=document.getElementById('categoria').value;
  const sub=document.getElementById('subcategoria');
  sub.innerHTML='<option value="">-- Seleccionar --</option>';
  (SUBCATS[cat]||[]).forEach(s=>{const o=document.createElement('option');o.textContent=s;sub.appendChild(o);});
}

// ── AUTOCOMPLETE GENÉRICO ──────────────────────────────
function acFilter(inId,listId,data){
  const val=document.getElementById(inId).value.toLowerCase();
  const list=document.getElementById(listId);
  if(!val){list.classList.remove('show');return;}
  const hits=data.filter(d=>d.toLowerCase().includes(val)).slice(0,8);
  if(!hits.length){list.classList.remove('show');return;}
  list.innerHTML=hits.map(m=>`<div class="ac-item" onmousedown="acPick('${inId}','${listId}',this)">${m}</div>`).join('');
  list.classList.add('show');
}
function acPick(inId,listId,el){
  document.getElementById(inId).value=el.textContent;
  document.getElementById(listId).classList.remove('show');
  if(inId==='marca')updateSubmarcaList();
}
document.addEventListener('click',e=>{
  document.querySelectorAll('.autocomplete-list').forEach(l=>{
    const inp=l.previousElementSibling;
    if(inp&&!inp.contains(e.target))l.classList.remove('show');
  });
});

// ── SUBMARCA AUTOCOMPLETE ──────────────────────────────
function onMarcaInput(){
  acFilter('marca','ac_marca',MARCAS);
  updateSubmarcaList();
}
function updateSubmarcaList(){
  const marca=document.getElementById('marca').value.trim();
  const modelos=SUBMARCAS[marca]||[];
  const sub=document.getElementById('submarca');
  if(modelos.length&&sub.value==='')sub.placeholder=modelos[0]+'...';
}
function acSubmarca(){
  const marca=document.getElementById('marca').value.trim();
  const val=document.getElementById('submarca').value.toLowerCase();
  const list=document.getElementById('ac_submarca');
  const base=SUBMARCAS[marca]||[];
  // Si hay lista de la marca, filtrar de ella; si no, buscar en todos
  const pool=base.length?base:Object.values(SUBMARCAS).flat();
  const hits=pool.filter(d=>d.toLowerCase().includes(val)).slice(0,8);
  if(!hits.length||!val){list.classList.remove('show');return;}
  list.innerHTML=hits.map(m=>`<div class="ac-item" onmousedown="acPick('submarca','ac_submarca',this)">${m}</div>`).join('');
  list.classList.add('show');
}

// ── DIRECCIÓN ──────────────────────────────────────────
function buildAddr(){
  const c=v('addr_calle'),x=v('addr_cruce'),col=v('addr_colonia'),cp=v('addr_cp'),mun=v('addr_municipio');
  let p=[];
  if(c&&x)p.push(`${c} cruce con ${x}`);
  else if(c)p.push(c);
  if(col)p.push(col);
  if(cp&&mun)p.push(`${cp} ${mun}`);
  else if(mun)p.push(mun);
  p.push('N.L.');
  document.getElementById('addr-preview').textContent=p.length>1?p.join(', '):'La dirección aparecerá aquí...';
}
function onAddrTexto(){
  const val=document.getElementById('addr_texto').value.trim();
  if(val)document.getElementById('addr-preview').textContent='';
}
function getAddr(){
  // Primero revisar si se pegó directo
  const directo=document.getElementById('addr_texto').value.trim();
  if(directo)return directo;
  // Revisar preview
  const p=document.getElementById('addr-preview').textContent;
  if(p&&p!=='La dirección aparecerá aquí...')return p;
  // Si el preview no está actualizado, construir desde los campos directamente
  const calle=document.getElementById('addr_calle').value.trim();
  const cruce=document.getElementById('addr_cruce').value.trim();
  const colonia=document.getElementById('addr_colonia').value.trim();
  const cp=document.getElementById('addr_cp').value.trim();
  const municipio=document.getElementById('addr_municipio').value.trim();
  let parts=[];
  if(calle&&cruce)parts.push(`${calle} cruce con ${cruce}`);
  else if(calle)parts.push(calle);
  if(colonia)parts.push(colonia);
  if(cp&&municipio)parts.push(`${cp} ${municipio}`);
  else if(municipio)parts.push(municipio);
  parts.push('N.L.');
  return parts.length>1?parts.join(', '):'';
}

// ── GEOLOCALIZACIÓN MEJORADA ───────────────────────────
function geoLocate(){
  const st=document.getElementById('geo-status');
  st.style.display='block';
  st.innerHTML='📡 Activando GPS... permite el acceso a la ubicación';
  if(!navigator.geolocation){st.textContent='❌ Este navegador no soporta GPS.';return;}

  const MAX_READINGS=8, MAX_TIME=25000, TARGET_ACCURACY=20;
  let readings=[], bestReading=null, watchId=null, timer=null, gotAny=false;

  function signalBars(acc){
    if(acc<=10)return'<span style="color:var(--green)">▂▄▆█ Excelente</span>';
    if(acc<=20)return'<span style="color:var(--green)">▂▄▆░ Buena</span>';
    if(acc<=50)return'<span style="color:#f0a000">▂▄░░ Regular</span>';
    if(acc<=100)return'<span style="color:#f0a000">▂▄░░ Aceptable</span>';
    return'<span style="color:var(--danger)">▂░░░ Aproximada</span>';
  }

  function updateStatus(acc, count){
    st.innerHTML=`📡 Mejorando precisión... ${count}/${MAX_READINGS} &nbsp;|&nbsp; ${Math.round(acc)}m &nbsp;${signalBars(acc)}`;
  }

  function finish(lat, lon, acc){
    if(watchId!=null)navigator.geolocation.clearWatch(watchId);
    if(timer)clearTimeout(timer);
    st.innerHTML=`✅ Ubicación obtenida (${Math.round(acc)}m) ${signalBars(acc)} — buscando dirección...`;
    fetchAddress(lat, lon, acc);
  }

  function onPos(pos){
    gotAny=true;
    const{latitude:lat,longitude:lon,accuracy:acc}=pos.coords;
    readings.push({lat,lon,acc});
    if(!bestReading||acc<bestReading.acc)bestReading={lat,lon,acc};
    updateStatus(acc, readings.length);
    // Terminar si ya tenemos buena precisión o suficientes lecturas
    if(acc<=TARGET_ACCURACY||readings.length>=MAX_READINGS)finish(bestReading.lat,bestReading.lon,bestReading.acc);
  }

  function onErr(err){
    // Si ya tenemos alguna lectura, usar la mejor
    if(bestReading){finish(bestReading.lat,bestReading.lon,bestReading.acc);return;}
    // Errores específicos
    if(err.code===1){st.innerHTML='<span style="color:var(--danger)">❌ Permiso de ubicación denegado. Actívalo en ajustes del navegador.</span>';}
    else if(err.code===2){st.innerHTML='<span style="color:var(--danger)">❌ Posición no disponible. Sal a cielo abierto e intenta de nuevo.</span>';}
    else if(err.code===3){st.innerHTML='<span style="color:#f0a000">⏱ GPS lento. Intentando con menor precisión...</span>';fallbackLowAccuracy();}
    else st.innerHTML='<span style="color:var(--danger)">❌ Error de GPS. Intenta de nuevo.</span>';
  }

  // Intento principal: alta precisión
  try{
    watchId=navigator.geolocation.watchPosition(onPos,onErr,{enableHighAccuracy:true,timeout:MAX_TIME,maximumAge:2000});
  }catch(e){
    fallbackLowAccuracy();
  }

  // Fallback: baja precisión (usa wifi/red, más rápido)
  function fallbackLowAccuracy(){
    if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const{latitude:lat,longitude:lon,accuracy:acc}=pos.coords;
      finish(lat,lon,acc);
    },err=>{
      if(bestReading)finish(bestReading.lat,bestReading.lon,bestReading.acc);
      else st.innerHTML='<span style="color:var(--danger)">❌ No se pudo obtener ubicación. Verifica que el GPS esté activado.</span>';
    },{enableHighAccuracy:false,timeout:15000,maximumAge:30000});
  }

  // Timeout general
  timer=setTimeout(()=>{
    if(watchId!=null)navigator.geolocation.clearWatch(watchId);
    if(bestReading)finish(bestReading.lat,bestReading.lon,bestReading.acc);
    else if(!gotAny)fallbackLowAccuracy();
  },MAX_TIME);
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// Busca la calle que cruza (perpendicular) a la calle dada, alrededor de un punto.
// Devuelve true si encontró una. Respeta el límite de ~1 petición/seg de Nominatim.
async function detectarCruceEn(lat,lon,calle,statusElId){
  let found=false;
  try{
    const probeRoad=async(dlat,dlon)=>{
      try{
        const r2=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat+dlat}&lon=${lon+dlon}&format=json&accept-language=es`);
        if(!r2.ok)return '';
        const d2=await r2.json();
        return d2.address?.road||d2.address?.pedestrian||d2.address?.footway||'';
      }catch(e){return '';}
    };
    const D=0.00035;
    // Sondeo al norte: si sigue siendo la misma calle, corre Norte-Sur (el cruce
    // está al Este/Oeste); si cambia, corre Este-Oeste (el cruce está al Norte/Sur)
    const rNorte=await probeRoad(D,0);
    await sleep(1100);
    const corrVertical=rNorte&&rNorte===calle;
    const offsets=corrVertical
      ? [[0,D],[0,-D],[D,D],[D,-D],[-D,D],[-D,-D]]
      : [[D,0],[-D,0],[D,D],[D,-D],[-D,D],[-D,-D]];
    const calles=new Set();
    for(const[dlat,dlon] of offsets){
      const c2=await probeRoad(dlat,dlon);
      if(c2&&c2!==calle)calles.add(c2);
      if(calles.size>0)break;
      await sleep(1100);
    }
    const cruceEl=document.getElementById('addr_cruce');
    if(calles.size>0){
      cruceEl.value=[...calles][0];
      cruceEl.style.borderColor='';
      cruceEl.placeholder='C. Puerto Marqués';
      found=true;
      buildAddr();
    } else {
      cruceEl.value='';
      cruceEl.style.borderColor='var(--danger)';
      cruceEl.placeholder='⚠️ No detectado — escribe manualmente';
      setTimeout(()=>cruceEl.focus(),800);
      const geoSt=document.getElementById(statusElId);
      if(geoSt)geoSt.innerHTML+='<br><span style="color:var(--danger);font-size:.72rem;">⚠️ Cruce no detectado — escríbelo manualmente</span>';
    }
  }catch(e){}
  return found;
}

async function fetchAddress(lat, lon, acc, statusElId){
  statusElId=statusElId||'geo-status';
  const st=document.getElementById(statusElId);
  try{
    // Nominatim — calle, CP, municipio
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`);
    if(!r.ok)throw new Error(`Nominatim respondió ${r.status} — probablemente límite de peticiones alcanzado, espera unos segundos e intenta de nuevo`);
    const d=await r.json();
    if(d.error){throw new Error('No se encontró información para este punto ('+d.error+')');}
    const a=d.address||{};
    const calle=a.road||a.pedestrian||a.footway||a.street||a.path||'';
    const cp=a.postcode||'';
    const mun=a.city||a.town||a.municipality||a.county||'Monterrey';
    let colonia=a.suburb||a.neighbourhood||a.quarter||a.residential||a.city_district||a.hamlet||a.village||'';

    if(calle)document.getElementById('addr_calle').value=calle;
    if(cp)document.getElementById('addr_cp').value=cp;
    if(mun)document.getElementById('addr_municipio').value=mun;
    if(!calle&&!cp&&!mun){
      st.innerHTML='<span style="color:#f0a000">⚠️ No se encontraron datos de dirección para este punto exacto. Ajusta el pin o escribe manualmente.</span>';
    }

    // Cruce — calle perpendicular a la actual
    await detectarCruceEn(lat,lon,calle,statusElId);

    // SEPOMEX — colonia por CP (más preciso en México)
    if(cp&&!colonia){
      try{
        const rs=await fetch(`https://sepomex.icalialabs.com/api/v1/zip_codes?zip_code=${cp}`);
        const ds=await rs.json();
        const colonias=ds.zip_codes||[];
        if(colonias.length>0)colonia=colonias[0].d_asenta||'';
      }catch(e){}
    }

    // Si aún no hay colonia, intentar display_name
    if(!colonia&&d.display_name){
      const parts=d.display_name.split(',').map(p=>p.trim());
      if(parts.length>2)colonia=parts[1]||'';
    }

    if(colonia)document.getElementById('addr_colonia').value=colonia;
    buildAddr();
    if(calle||cp||mun){
      st.innerHTML=acc!=null?`✅ Precisión: ${Math.round(acc)}m — edita si es necesario`:'✅ Dirección cargada — edita si es necesario';
    }
    if(statusElId==='geo-status')setTimeout(()=>st.style.display='none',5000);
  }catch(e){
    console.error('fetchAddress error:',e);
    st.innerHTML=`❌ ${e.message||'Sin internet para convertir coordenadas.'}`;
  }
}


function escHtml(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

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

// ── MAPA: MARCAR PIN MANUAL ────────────────────────────
let mapPinInstance=null,mapPinMarker=null,mapPinCoords=null;

async function abrirMapaPin(){
  document.getElementById('map-modal').style.display='block';
  document.body.style.overflow='hidden';
  document.getElementById('map-pin-status').textContent='Cargando mapa...';
  try{await ensureLeaflet();}
  catch(e){
    document.getElementById('map-pin-status').textContent='❌ '+e.message+'. Puedes escribir la dirección manualmente.';
    return;
  }
  document.getElementById('map-pin-status').textContent='Obteniendo tu ubicación para centrar el mapa...';

  setTimeout(()=>{
    // Coordenadas iniciales: Monterrey centro si no hay GPS
    let initLat=25.6866,initLon=-100.3161;

    function buildMap(lat,lon){
      if(mapPinInstance){mapPinInstance.remove();mapPinInstance=null;}
      mapPinInstance=L.map('map-pin-el',{zoomControl:true}).setView([lat,lon],17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'© OpenStreetMap'
      }).addTo(mapPinInstance);

      mapPinMarker=L.marker([lat,lon],{draggable:true}).addTo(mapPinInstance);
      mapPinCoords={lat:lat,lon:lon};

      mapPinMarker.on('dragend',e=>{
        const pos=e.target.getLatLng();
        mapPinCoords={lat:pos.lat,lon:pos.lng};
        document.getElementById('map-pin-status').textContent=`📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
      });

      mapPinInstance.on('click',e=>{
        mapPinMarker.setLatLng(e.latlng);
        mapPinCoords={lat:e.latlng.lat,lon:e.latlng.lng};
        document.getElementById('map-pin-status').textContent=`📍 ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
      });

      document.getElementById('map-pin-status').textContent='Arrastra el pin o toca el mapa para ajustar la ubicación';
      setTimeout(()=>mapPinInstance.invalidateSize(),200);
    }

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        buildMap(pos.coords.latitude,pos.coords.longitude);
      },()=>{
        buildMap(initLat,initLon);
      },{enableHighAccuracy:true,timeout:8000,maximumAge:30000});
    } else {
      buildMap(initLat,initLon);
    }
  },150);
}

function centrarEnMiUbicacion(){
  const st=document.getElementById('map-pin-status');
  st.textContent='📡 Obteniendo tu ubicación...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const{latitude:lat,longitude:lon}=pos.coords;
    mapPinInstance.setView([lat,lon],17);
    mapPinMarker.setLatLng([lat,lon]);
    mapPinCoords={lat,lon};
    st.textContent='📍 Ubicación actualizada — ajusta el pin si es necesario';
  },()=>{
    st.textContent='❌ No se pudo obtener tu ubicación';
  },{enableHighAccuracy:true,timeout:10000});
}

function cerrarMapaPin(){
  document.getElementById('map-modal').style.display='none';
  document.body.style.overflow='';
  if(mapPinInstance){mapPinInstance.remove();mapPinInstance=null;}
}

async function confirmarPinMapa(){
  if(!mapPinCoords){
    document.getElementById('map-pin-status').textContent='⚠️ Marca un punto en el mapa primero';
    return;
  }
  const st=document.getElementById('map-pin-status');
  st.textContent='🌐 Buscando dirección de este punto...';
  await fetchAddress(mapPinCoords.lat,mapPinCoords.lon,5,'map-pin-status');
  cerrarMapaPin();
  showToast('✅ Ubicación marcada en el mapa');
  vibrate(50);
}

// ── OCR CON CÁMARA ─────────────────────────────────────
let ocrStream=null;

async function startOCR(){
  const status=document.getElementById('scan-status');
  const cont=document.getElementById('ocr-container');
  try{
    ocrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
    document.getElementById('ocr-video').srcObject=ocrStream;
    document.getElementById('ocr-video').play();
    ocrZoom=1;
    ocrTrack=ocrStream.getVideoTracks()[0]||null;
    document.getElementById('ocr-video').style.transform='scale(1)';
    cont.style.display='block';
    status.textContent='📸 Enfoca el documento — usa + / − para zoom';
  }catch(e){
    status.textContent='❌ Sin acceso a la cámara. Verifica permisos.';
  }
}

function stopOCR(){
  if(ocrStream){ocrStream.getTracks().forEach(t=>t.stop());ocrStream=null;}
  document.getElementById('ocr-container').style.display='none';
  document.getElementById('scan-status').textContent='';
}


// ── CURP: extracción algorítmica de datos ──────────────
// Estructura: 1-4 letras nombre/apellidos | 5-10 AAMMDD nacimiento |
// 11 sexo (H/M) | 12-13 entidad | 14-16 consonantes internas | 17-18 diferenciador+homoclave
// Dígito verificador oficial (posición 18): detecta errores de lectura del OCR
function curpDigitoOk(curp){
  const dic='0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  let sum=0;
  for(let i=0;i<17;i++){const v=dic.indexOf(curp.charAt(i));if(v<0)return false;sum+=v*(18-i);}
  return ((10-(sum%10))%10)===parseInt(curp.charAt(17),10);
}

function parseCurp(curpRaw){
  const curp=(curpRaw||'').toUpperCase().trim();
  if(curp.length!==18)return{valid:false,error:`Debe tener 18 caracteres (tiene ${curp.length})`};
  if(!/^[A-ZÑ]{4}\d{6}[HM][A-Z]{2}[A-Z]{3}[A-Z0-9]\d$/.test(curp)){
    return{valid:false,error:'Formato no reconocido como CURP válido'};
  }
  const yy=curp.substr(4,2),mm=curp.substr(6,2),dd=curp.substr(8,2);
  const monthNum=parseInt(mm,10),dayNum=parseInt(dd,10);
  if(monthNum<1||monthNum>12||dayNum<1||dayNum>31){
    return{valid:false,error:'Fecha de nacimiento contenida en el CURP no es válida'};
  }
  // Determinar siglo: la letra en posición 17 siempre indica nacido en 2000+;
  // si es dígito, se infiere comparando contra el año actual (nadie tiene +100 años)
  const diffChar=curp.charAt(16);
  let century;
  if(/[A-Z]/.test(diffChar)){
    century=2000;
  }else{
    const currentYY=new Date().getFullYear()%100;
    century=parseInt(yy,10)<=currentYY?2000:1900;
  }
  const anioCompleto=century+parseInt(yy,10);
  const fechaReal=new Date(anioCompleto,monthNum-1,dayNum);
  if(fechaReal.getMonth()!==monthNum-1||fechaReal.getDate()!==dayNum){
    return{valid:false,error:`La fecha ${dd}/${mm}/${anioCompleto} no existe en el calendario — revisa el CURP`};
  }
  const fecha_nac=`${dd}/${mm}/${anioCompleto}`;
  const sexoChar=curp.charAt(10);
  const sexo=sexoChar==='H'?'Masculino':(sexoChar==='M'?'Femenino':'');
  const codEstado=curp.substr(11,2);
  const estadoNombre=CURP_ESTADOS[codEstado]||'';
  return{valid:true,fecha_nac,sexo,codEstado,estadoNombre,digitoOk:curpDigitoOk(curp)};
}

function onCurpInput(el){
  const pos=el.selectionStart;
  el.value=el.value.toUpperCase().replace(/[^A-ZÑ0-9]/g,'');
  el.setSelectionRange&&el.setSelectionRange(pos,pos);
  const st=document.getElementById('curp-status');
  if(el.value.length<18){if(st)st.textContent='';return;}
  const res=parseCurp(el.value);
  if(!res.valid){
    if(st){st.textContent='⚠️ '+res.error;st.style.color='var(--danger)';}
    return;
  }
  let extraidos=[];
  if(res.fecha_nac){document.getElementById('nacimiento').value=res.fecha_nac;calcEdad();extraidos.push('nacimiento');}
  if(res.sexo){document.getElementById('sexo').value=res.sexo;extraidos.push('sexo');}
  if(res.estadoNombre){document.getElementById('estado_origen').value=res.estadoNombre;extraidos.push('estado');}
  if(st){
    st.style.color='var(--green)';
    st.textContent=extraidos.length?`✅ Extraído del CURP: ${extraidos.join(', ')}`:'✅ CURP válido';
    if(!res.digitoOk){
      st.style.color='#f0a000';
      st.textContent+=' — ⚠️ el dígito verificador no coincide, revisa que esté bien escrito';
    }
  }
}

function setProgress(pct){
  const bar=document.getElementById('ocr-progress-bar');
  const fill=document.getElementById('ocr-progress-fill');
  if(pct===0){bar.style.display='none';fill.style.width='0%';return;}
  bar.style.display='block';
  fill.style.width=pct+'%';
}

function savePhotoToDevice(canvas){
  try{
    const now=new Date();
    const ts=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const ne=document.getElementById('ne')?.value||'000';
    const link=document.createElement('a');
    link.download=`FC_Empadronamiento_${ne}_${ts}.jpg`;
    link.href=canvas.toDataURL('image/jpeg',0.95);
    link.click();
  }catch(e){console.log('Photo save:',e);}
}

function preprocessCanvas(srcCanvas){
  const dst=document.createElement('canvas');
  dst.width=srcCanvas.width;
  dst.height=srcCanvas.height;
  const ctx=dst.getContext('2d');
  ctx.drawImage(srcCanvas,0,0);
  const imgData=ctx.getImageData(0,0,dst.width,dst.height);
  const d=imgData.data;
  // Grayscale + contrast boost
  for(let i=0;i<d.length;i+=4){
    const gray=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    const contrasted=Math.min(255,Math.max(0,((gray-128)*1.4)+128));
    d[i]=d[i+1]=d[i+2]=contrasted;
  }
  ctx.putImageData(imgData,0,0);
  return dst;
}

function checkImageQuality(canvas){
  const ctx=canvas.getContext('2d');
  const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
  const d=imgData.data;
  let brightness=0,variance=0;
  const samples=Math.min(d.length/4,10000);
  const step=Math.floor(d.length/4/samples)*4;
  const vals=[];
  for(let i=0;i<d.length;i+=step){
    const v=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    brightness+=v;vals.push(v);
  }
  brightness/=vals.length;
  variance=vals.reduce((s,v)=>s+Math.pow(v-brightness,2),0)/vals.length;
  const qi=document.getElementById('img-quality');
  qi.style.display='block';
  if(brightness<50){qi.innerHTML='⚠️ <span style="color:#f0a000">Imagen muy oscura — mejora la iluminación</span>';return false;}
  if(brightness>220){qi.innerHTML='⚠️ <span style="color:#f0a000">Imagen sobreexpuesta — reduce la luz</span>';return false;}
  if(variance<200){qi.innerHTML='⚠️ <span style="color:#f0a000">Imagen borrosa — enfoca el documento</span>';return false;}
  qi.innerHTML='✅ <span style="color:var(--green)">Calidad de imagen buena</span>';
  return true;
}

function showPreview(canvas){
  const prev=document.getElementById('ocr-preview');
  const img=document.getElementById('ocr-preview-img');
  img.src=canvas.toDataURL('image/jpeg',0.8);
  prev.style.display='block';
}

// ── OCR CON GROQ (vía proxy en Cloudflare Workers) ─────
// La key de Groq vive como secreto en el Worker, nunca en el teléfono.
const OCR_PROXY_URL='https://fc-ocr.therts649.workers.dev';
const OCR_TOKEN_KEY='fc_ocr_token';
// La clave de acceso solo se pide si el Worker la exige (responde 401) y se
// recuerda en el teléfono. Si en Cloudflare no hay ACCESS_TOKEN, nunca se pide.
function getOcrToken(){
  try{return localStorage.getItem(OCR_TOKEN_KEY)||'';}catch(e){return'';}
}
function pedirOcrToken(incorrecta){
  const msg=incorrecta?'La clave de acceso para OCR no es correcta.\n\nEscríbela de nuevo (pídela a tu mando):':'Clave de acceso para OCR (pídela a tu mando):';
  const t=(prompt(msg)||'').trim();
  try{if(t)localStorage.setItem(OCR_TOKEN_KEY,t);else localStorage.removeItem(OCR_TOKEN_KEY);}catch(e){}
  return t;
}

async function captureOCR(){
  const status=document.getElementById('scan-status');
  const video=document.getElementById('ocr-video');
  const canvas=document.getElementById('ocr-canvas');
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  stopOCR();
  document.getElementById('ocr-summary').style.display='none';
  savePhotoToDevice(canvas);
  showPreview(canvas);
  checkImageQuality(canvas);
  if(!navigator.onLine){
    status.textContent='❌ Sin conexión a internet. El OCR requiere internet.';
    document.getElementById('btn-releer').style.display='inline-flex';
    return;
  }
  setProgress(10);
  status.textContent='🔍 Analizando documento con IA...';
  try{
    const processed=preprocessCanvas(canvas);
    const base64=processed.toDataURL('image/jpeg',0.9).split(',')[1];
    const obj=await callGroqWithRetry(base64);
    setProgress(90);
    fillOCRFields(obj);
  }catch(e){
    status.textContent='❌ '+e.message;
    setProgress(0);
    console.error('captureOCR error:',e);
  }
  document.getElementById('btn-releer').style.display='inline-flex';
}

// ── REINTENTO AUTOMÁTICO ───────────────────────────────
async function callGroqWithRetry(base64,maxAttempts){
  // Modelos de visión de Groq, en orden de preferencia. qwen3.6 es "Preview"
  // y a veces Groq restringe el acceso; los otros dos son modelos de
  // producción estables que sirven como respaldo automático.
  const modelos=['qwen/qwen3.6-27b','meta-llama/llama-4-maverick-17b-128e-instruct','qwen/qwen3.8-27b'];
  let lastErr,clavePedida=false;
  for(let i=0;i<modelos.length;i++){
    const modelo=modelos[i];
    try{
      if(i>0){
        const status=document.getElementById('scan-status');
        status.textContent=`🔄 Probando modelo alternativo (${i+1}/${modelos.length})...`;
        await new Promise(r=>setTimeout(r,800));
      }
      return await callGroq(base64,modelo);
    }catch(e){
      lastErr=e;
      console.log(`Modelo ${modelo} falló:`,e.message);
      // Clave de acceso: se pide una sola vez por escaneo y no se prueban
      // otros modelos (el problema es la clave, no el modelo)
      if(e.authError){
        if(clavePedida||!pedirOcrToken(e.teniaClave)){
          throw new Error('Falta la clave de acceso para OCR o no es correcta — pídela a tu mando');
        }
        clavePedida=true;
        i--;
        continue;
      }
      // La API key de Groq mal configurada falla igual con cualquier modelo
      if(e.configError)throw e;
      // Si es error de conexión (no de modelo), reintentar el mismo modelo una vez más antes de cambiar
      if(e.message.includes('Sin conexión')||e.message.includes('Tiempo agotado')){
        try{
          await new Promise(r=>setTimeout(r,1000));
          return await callGroq(base64,modelo);
        }catch(e2){lastErr=e2;}
      }
    }
  }
  throw lastErr;
}

async function callGroq(base64,modelName){
  modelName=modelName||'qwen/qwen3.6-27b';
  const status=document.getElementById('scan-status');
  const prompt=`Eres un sistema OCR especializado en documentos de identidad mexicanos. Analiza la imagen y extrae los datos visibles.
Responde SOLO con el siguiente JSON, sin texto adicional, sin markdown, sin comentarios:
{"tipo":"ine o circulacion","nombre":"","curp":"","fecha_nac":"DD/MM/AAAA","sexo":"","domicilio":"","cod_estado":"","num_estado":"","menor":false,"tipo_vehiculo":"","marca":"","submarca":"","anio":"","placas":"","estado_placas":"","serie":"","motor":""}
- tipo: "ine" si es INE/credencial/licencia, "circulacion" si es tarjeta de circulación
- nombre: formato "Apellido1 Apellido2 Nombre" en título
- curp: los 18 caracteres del CURP tal como aparecen impresos, sin espacios (vacío si no es legible)
- fecha_nac: formato DD/MM/AAAA
- sexo: "Masculino" o "Femenino"
- cod_estado: 2 letras del estado en la CURP (ej: NL, JC, DF)
- menor: true si tiene menos de 18 años
- Si un dato no es visible: cadena vacía ""`;

  status.textContent='📡 Analizando documento...';
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),30000);

  const bodyPayload={
    model:modelName,
    max_completion_tokens:600,
    temperature:0,
    response_format:{type:'json_object'},
    messages:[{
      role:'user',
      content:[
        {type:'text',text:prompt},
        {type:'image_url',image_url:{url:'data:image/jpeg;base64,'+base64}}
      ]
    }]
  };
  if(modelName.includes('qwen3.'))bodyPayload.reasoning_effort='none';

  let resp;
  try{
    resp=await fetch(OCR_PROXY_URL,{
      method:'POST',
      headers:Object.assign({'Content-Type':'application/json'},getOcrToken()?{'X-FC-Token':getOcrToken()}:{}),
      signal:controller.signal,
      body:JSON.stringify(bodyPayload)
    });
  }catch(netErr){
    clearTimeout(timeoutId);
    if(netErr.name==='AbortError')throw new Error('Tiempo agotado (30s) — conexión muy lenta o sin internet');
    throw new Error('Sin conexión a internet: '+netErr.message);
  }
  clearTimeout(timeoutId);

  status.textContent='📥 Recibiendo respuesta...';

  if(!resp.ok){
    let errMsg=`Error HTTP ${resp.status}`;
    try{
      const err=await resp.json();
      errMsg=err.error?.message||errMsg;
    }catch(e){}
    // 401 del propio Worker = falta la clave de acceso. Cualquier otro 401
    // viene de Groq: la API key guardada en Cloudflare no sirve.
    if(resp.status===401&&/clave de acceso/i.test(errMsg)){
      const err=new Error(errMsg);
      err.authError=true;err.teniaClave=!!getOcrToken();
      throw err;
    }
    if(resp.status===401||/invalid api key/i.test(errMsg)){
      const err=new Error('La API key de Groq guardada en Cloudflare no es válida o falta (secreto GROQ_API_KEY del Worker)');
      err.configError=true;
      throw err;
    }
    throw new Error(errMsg);
  }

  const data=await resp.json();
  const txt=data.choices?.[0]?.message?.content||'{}';
  status.textContent='🧩 Interpretando datos...';

  // Limpieza robusta: quitar markdown y extraer solo el bloque {...}
  let clean=txt.replace(/```json|```/g,'').trim();
  const firstBrace=clean.indexOf('{');
  const lastBrace=clean.lastIndexOf('}');
  if(firstBrace!==-1&&lastBrace!==-1&&lastBrace>firstBrace){
    clean=clean.slice(firstBrace,lastBrace+1);
  }

  try{
    return JSON.parse(clean);
  }catch(parseErr){
    console.error('JSON parse failed, raw text:',txt);
    console.error('Attempted clean:',clean);
    const preview=txt.slice(0,200).replace(/\n/g,' ');
    throw new Error('Formato inesperado. Respuesta IA: '+preview);
  }
}

// ── GALERÍA ────────────────────────────────────────────
async function processGalleryImages(input){
  const files=Array.from(input.files||[]);
  if(!files.length)return;
  const status=document.getElementById('scan-status');
  document.getElementById('ocr-summary').style.display='none';
  if(!navigator.onLine){
    status.textContent='❌ Sin conexión a internet. El OCR requiere internet.';
    input.value='';
    return;
  }
  let okCount=0,failCount=0,errorDetails=[];
  for(let i=0;i<files.length;i++){
    const file=files[i];
    const label=file&&file.name?file.name:`imagen ${i+1}`;
    status.textContent=isHeicFile(file)?`🔄 Convirtiendo ${label} (HEIC→JPG)...`:`🔍 Procesando ${label} (${i+1}/${files.length})...`;
    setProgress(Math.round((i/files.length)*80));
    try{
      await processSingleImage(file);
      okCount++;
    }catch(e){
      failCount++;
      const msg=e&&e.message?e.message:String(e);
      errorDetails.push(`${label}: ${msg}`);
      console.error(`Error procesando "${label}":`,e);
    }
  }
  setProgress(100);
  setTimeout(()=>setProgress(0),1000);
  if(failCount>0&&okCount===0){
    status.innerHTML=`❌ No se pudo procesar ninguna imagen:<br>`+errorDetails.map(d=>'• '+escHtml(d)).join('<br>');
  }else if(failCount>0){
    status.innerHTML=`⚠️ ${okCount} imagen(es) OK, ${failCount} con error:<br>`+errorDetails.map(d=>'• '+escHtml(d)).join('<br>');
  }
  input.value='';
}

function isHeicFile(file){
  const name=(file.name||'').toLowerCase();
  const type=(file.type||'').toLowerCase();
  return name.endsWith('.heic')||name.endsWith('.heif')||type.includes('heic')||type.includes('heif');
}

async function convertHeicIfNeeded(file){
  if(!isHeicFile(file))return file;
  try{await ensureHeic();}catch(e){}
  if(typeof heic2any!=='function'){
    throw new Error('Foto en formato HEIC pero el conversor no cargó (revisa tu conexión) — toma la foto con la cámara de la app en su lugar, o cambia el formato de tu galería a JPG.');
  }
  try{
    const converted=await heic2any({blob:file,toType:'image/jpeg',quality:0.9});
    const blob=Array.isArray(converted)?converted[0]:converted;
    return new File([blob],(file.name||'foto').replace(/\.(heic|heif)$/i,'.jpg'),{type:'image/jpeg'});
  }catch(err){
    console.error('Fallo al convertir HEIC:',err);
    throw new Error('No se pudo convertir la foto HEIC a JPG. En tu galería, cambia el ajuste de formato de fotos a "Más compatible (JPG)" o toma la foto con la cámara de esta app.');
  }
}

// Carga la imagen usando createImageBitmap (más robusto en Android, soporta
// mejor HEIC/orientación EXIF) y si falla, cae a FileReader + Image().
function loadImageSource(file){
  return new Promise((resolve,reject)=>{
    if(!file){reject(new Error('Archivo inválido o vacío'));return;}
    if(file.size===0){reject(new Error('El archivo está vacío (0 bytes)'));return;}
    convertHeicIfNeeded(file).then(readyFile=>{
      if(window.createImageBitmap){
        createImageBitmap(readyFile).then(bitmap=>resolve({bitmap})).catch(err=>{
          console.warn('createImageBitmap falló, probando con FileReader:',err);
          loadViaFileReader(readyFile,resolve,reject);
        });
      }else{
        loadViaFileReader(readyFile,resolve,reject);
      }
    }).catch(reject);
  });
}

function loadViaFileReader(file,resolve,reject){
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('No se pudo leer el archivo con FileReader (puede estar dañado)'));
  reader.onload=(e)=>{
    const img=new Image();
    img.onerror=()=>reject(new Error('Formato de imagen no soportado. Usa JPG o PNG (evita HEIC).'));
    img.onload=()=>resolve({img});
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

async function processSingleImage(file){
  let source;
  try{
    source=await loadImageSource(file);
  }catch(err){
    throw new Error(err&&err.message?err.message:'No se pudo leer la imagen seleccionada');
  }
  const srcEl=source.bitmap||source.img;
  const srcW=srcEl.width,srcH=srcEl.height;
  if(!srcW||!srcH){throw new Error('La imagen no tiene dimensiones válidas (archivo posiblemente corrupto)');}
  const MAX=1600;
  let w=srcW,h=srcH;
  if(w>MAX||h>MAX){const s=MAX/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
  const canvas=document.getElementById('ocr-canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');
  try{
    ctx.drawImage(srcEl,0,0,w,h);
  }catch(err){
    throw new Error('No se pudo dibujar la imagen en el canvas: '+(err&&err.message?err.message:err));
  }
  if(source.bitmap&&source.bitmap.close)source.bitmap.close();
  showPreview(canvas);
  checkImageQuality(canvas);
  const processed=preprocessCanvas(canvas);
  const base64=processed.toDataURL('image/jpeg',0.9).split(',')[1];
  if(!base64){throw new Error('No se pudo convertir la imagen a base64 (canvas vacío)');}
  const obj=await callGroqWithRetry(base64);
  fillOCRFields(obj);
}

function fillOCRFields(obj){
  const status=document.getElementById('scan-status');
  if(!obj||obj.error==='imagen_borrosa'){status.textContent='⚠️ Imagen borrosa';return;}
  const filled=[];

    if(obj.tipo==='ine'){
      if(obj.nombre){fillTitle('nombre',obj.nombre);filled.push('Nombre');}
      let curpParsed=null;
      if(obj.curp&&obj.curp.replace(/\s/g,'').length===18){
        const curpClean=obj.curp.replace(/\s/g,'').toUpperCase();
        curpParsed=parseCurp(curpClean);
        if(curpParsed.valid){
          fill('curp',curpClean);
          filled.push('CURP');
          const cst=document.getElementById('curp-status');
          if(cst){
            if(curpParsed.digitoOk){cst.style.color='var(--green)';cst.textContent='✅ CURP leído del documento';}
            else{cst.style.color='#f0a000';cst.textContent='⚠️ CURP leído, pero el dígito verificador no coincide — verifícalo contra el documento';}
          }
        }else{
          console.warn('CURP leído pero no válido:',curpClean,curpParsed.error);
        }
      }
      // Datos derivados del CURP (algorítmicos) tienen prioridad por ser más confiables
      if(curpParsed&&curpParsed.valid){
        fill('nacimiento',curpParsed.fecha_nac);calcEdad();filled.push('Fecha de nacimiento (CURP)');
        if(curpParsed.sexo){document.getElementById('sexo').value=curpParsed.sexo;filled.push('Sexo (CURP)');}
      }else if(obj.fecha_nac&&/\d{2}\/\d{2}\/\d{4}/.test(obj.fecha_nac)){
        fill('nacimiento',obj.fecha_nac);calcEdad();filled.push('Fecha de nacimiento');
        if(obj.sexo){document.getElementById('sexo').value=obj.sexo;filled.push('Sexo');}
      }
      if(obj.domicilio){fillTitle('domicilio',obj.domicilio);filled.push('Domicilio');}
      let edoNombre='';
      if(curpParsed&&curpParsed.valid&&curpParsed.estadoNombre)edoNombre=curpParsed.estadoNombre;
      else if(obj.cod_estado&&CURP_ESTADOS[obj.cod_estado.toUpperCase()])edoNombre=CURP_ESTADOS[obj.cod_estado.toUpperCase()];
      else if(obj.num_estado&&NUM_ESTADOS[obj.num_estado.padStart(2,'0')])edoNombre=NUM_ESTADOS[obj.num_estado.padStart(2,'0')];
      if(edoNombre){fill('estado_origen',edoNombre);filled.push('Estado de origen');}
      // Menor de edad
      if(obj.menor===true){document.getElementById('vulnerable').value='Sí';filled.push('Sector vulnerable (menor)');}
    } else if(obj.tipo==='circulacion'){
      if(obj.tipo_vehiculo){
        const tv=obj.tipo_vehiculo.toLowerCase();
        const tvWord=tv.split(' ')[0];
        const items=document.querySelectorAll('#tipo_vehiculo_dropdown .sv-item');
        for(const item of items){
          if(item.textContent.toLowerCase().includes(tvWord)){
            pickSelect('tipo_vehiculo','tipo_vehiculo_search',item.textContent.trim());
            filled.push('Tipo de vehículo');
            break;
          }
        }
      }
      if(obj.marca){fillTitle('marca',obj.marca);updateSubmarcaList();filled.push('Marca');}
      if(obj.submarca){fillTitle('submarca',obj.submarca);filled.push('Submarca');}
      if(obj.anio&&/^\d{4}$/.test(obj.anio)){fill('anio',obj.anio);filled.push('Año');}
      if(obj.placas&&obj.placas.length>=5){fill('placas',obj.placas.toUpperCase());filled.push('Placas');}
      if(obj.estado_placas){const em=ESTADOS.find(e=>e.toLowerCase().includes(obj.estado_placas.toLowerCase()));if(em){fill('estado_placas',em);filled.push('Estado de placas');}}
      if(obj.serie&&obj.serie.length===17){fill('serie',obj.serie.toUpperCase());filled.push('Serie/NIV');}
      if(obj.motor){fill('motor',obj.motor.toUpperCase());filled.push('Número de motor');}
    }

  setProgress(100);
  setTimeout(()=>setProgress(0),1000);
  const summary=document.getElementById('ocr-summary');
  if(filled.length>0){
    summary.style.display='block';
    summary.textContent='✅ '+filled.length+' campos llenados: '+filled.join(', ');
    const firstField=obj.tipo==='ine'?'nombre':'marca';
    const el=document.getElementById(firstField);
    if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),300);
  }
  document.getElementById('btn-releer').style.display='inline-flex';
  status.textContent='✅ Listo — revisa los campos verdes';
  // Multi-captura: ofrecer escanear otro documento
  preguntarOtraCaptura();
}

// ── NUEVO EMPADRONAMIENTO ──────────────────────────────
function nuevoEmpadronamiento(){
  // Con datos en pantalla: abrir una pestaña nueva en blanco (no se pierde nada)
  if(tabsReady&&tabFormStatus(backupForm())!=='empty'&&tabs.length<MAX_TABS){
    addTab({blank:true});
    return;
  }
  // Primero confirmar que quiere iniciar nuevo
  if(!confirm('¿Iniciar nuevo empadronamiento?'))return;

  // Preguntar si conserva datos del policía
  const conservar=confirm('¿Conservar datos del policía?\n\n✅ Aceptar — conserva nombre, N.E., zona y CRP\n❌ Cancelar — limpia todo');

  const keep=conservar?{
    zona:v('zona'),ne:v('ne'),nombre_pol:v('nombre_pol'),crp:v('crp'),num_emp:v('num_emp')
  }:null;

  // Limpiar todo
  document.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.classList.remove('filled');});
  document.querySelectorAll('select').forEach(el=>el.selectedIndex=0);
  document.getElementById('output-box').style.display='none';
  document.getElementById('addr-preview').textContent='La dirección aparecerá aquí...';
  document.getElementById('addr_estado').value='N.L.';
  document.getElementById('tatuajes_cant').value='0';
  document.getElementById('fotos_perfil').value='';
  document.getElementById('fotos_si').style.opacity='1';
  document.getElementById('fotos_no').style.opacity='1';
  document.getElementById('escolaridad_extra').style.display='none';
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';
  document.querySelectorAll('.neg-active').forEach(b=>b.classList.remove('neg-active'));

  // Restaurar datos del policía si eligió conservar
  if(keep){
    document.getElementById('zona').value=keep.zona;
    document.getElementById('ne').value=keep.ne;
    document.getElementById('nombre_pol').value=keep.nombre_pol;
    document.getElementById('crp').value=keep.crp;
    document.getElementById('num_emp').value=keep.num_emp;
  }

  // Actualizar fecha y hora
  initDT();
  clearDraft();
  if(editingLoteId!==null){editingLoteId=null;updateBtnAgregarLoteLabel();}

  // Scroll arriba
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── FECHA NACIMIENTO MANUAL ────────────────────────────
function fmtNacInput(el){
  let val=el.value.replace(/\D/g,'');
  if(val.length>2)val=val.slice(0,2)+'/'+val.slice(2);
  if(val.length>5)val=val.slice(0,5)+'/'+val.slice(5);
  el.value=val.slice(0,10);
}

// ── HORA 24H FORZADA ────────────────────────────────────
function fmtHoraInput(el){
  let val=el.value.replace(/\D/g,'');
  if(val.length>=2){
    let hh=parseInt(val.slice(0,2),10);
    if(hh>23)hh=23;
    val=String(hh).padStart(2,'0')+val.slice(2);
  }
  if(val.length>2)val=val.slice(0,2)+':'+val.slice(2);
  if(val.length>=5){
    let mm=parseInt(val.slice(3,5),10);
    if(mm>59)mm=59;
    val=val.slice(0,3)+String(mm).padStart(2,'0');
  }
  el.value=val.slice(0,5);
}

// ── EDAD ───────────────────────────────────────────────
function calcEdad(){
  const raw=v('nacimiento');
  if(!raw||raw.length<10)return;
  const parts=raw.split('/');
  if(parts.length!==3)return;
  const[d,m,y]=parts;
  if(!d||!m||!y||y.length!==4)return;
  const nac=new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
  if(isNaN(nac))return;
  const hoy=new Date();
  let e=hoy.getFullYear()-nac.getFullYear();
  if(hoy.getMonth()-nac.getMonth()<0||(hoy.getMonth()===nac.getMonth()&&hoy.getDate()<nac.getDate()))e--;
  document.getElementById('edad').value=e;
  // Auto sector vulnerable si menor de edad
  if(e<18){
    document.getElementById('vulnerable').value='Sí';
    vibrate(50);
  }
}

// ── LIMPIAR POR SECCIÓN ────────────────────────────────
function limpiarSeccion(sec){
  const maps={
    servicio:['zona','ne','nombre_pol','addr_calle','addr_cruce','addr_colonia','addr_cp','addr_municipio','addr_texto','folio','crp','bodycam','motivo'],
    persona:['nombre','nacimiento','edad','estatura','telefono','alias','redes','domicilio','estado_origen','oficio','padre','madre','antecedentes','grupo','rol','adicionales','escolaridad_detalle'],
    tatuajes:['tatuajes_cant','tatuajes_area','tatuajes_desc','tatuajes_bloque'],
    vehiculo:['marca','submarca','modelo','anio','color','placas','estado_placas','serie','motor','niv','observaciones']
  };
  const selects={
    servicio:['categoria','subcategoria'],
    persona:['vulnerable','sexo','estado_civil','escolaridad'],
    tatuajes:[],
    vehiculo:['tipo_vehiculo','documentacion']
  };
  (maps[sec]||[]).forEach(id=>{const el=document.getElementById(id);if(el){el.value=id==='tatuajes_cant'?'0':'';el.classList.remove('filled');}});
  (selects[sec]||[]).forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  if(sec==='persona'){
    document.getElementById('fotos_perfil').value='';
    document.getElementById('fotos_si').style.opacity='1';
    document.getElementById('fotos_no').style.opacity='1';
    document.getElementById('escolaridad_extra').style.display='none';
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';
  document.querySelectorAll('.neg-active').forEach(b=>b.classList.remove('neg-active'));
  }
  if(sec==='servicio'){
    document.getElementById('addr-preview').textContent='La dirección aparecerá aquí...';
    document.getElementById('addr_estado').value='N.L.';
    initDT();
  }
}

// ── PARSEAR BLOQUE TATUAJES ───────────────────────────
function parseTatuajesBloque(){
  const raw=document.getElementById('tatuajes_bloque').value;
  if(!raw.trim())return;
  const cantM=raw.match(/cantidad\s+de\s+tatuajes\s*:\s*(\d+)/i);
  if(cantM)document.getElementById('tatuajes_cant').value=cantM[1];
  const areaM=raw.match(/[aá]rea\s+del?\s+cuerpo\s*:\s*(.+)/i);
  if(areaM)document.getElementById('tatuajes_area').value=areaM[1].trim();
  const descM=raw.match(/descripci[oó]n\s+de\s+los\s+tatuajes\s*:\s*([\s\S]*)/i);
  if(descM)document.getElementById('tatuajes_desc').value=descM[1].trim();
}

// ── FILL HELPER ───────────────────────────────────────
function toTitleCase(str){
  if(!str)return str;
  const lowers=['de','del','la','las','los','y','e','en','a','al'];
  return str.toLowerCase().replace(/\b\w+/g,(word,idx)=>{
    if(idx>0&&lowers.includes(word))return word;
    return word.charAt(0).toUpperCase()+word.slice(1);
  });
}
function fill(id,val){
  if(!val)return;
  const el=document.getElementById(id);
  if(el){el.value=val;el.classList.add('filled');el.classList.remove('just-filled');void el.offsetWidth;el.classList.add('just-filled');}
}
function fillTitle(id,val){
  if(!val)return;
  fill(id,toTitleCase(val));
}

function stopScan(){}

// ── SUBCATEGORÍA OTRO ─────────────────────────────────
function checkOtroSubcat(){
  const val=document.getElementById('subcategoria').value;
  document.getElementById('otro_subcat_field').style.display=val==='Otro'?'block':'none';
}

// ── ESCOLARIDAD EXTRA ──────────────────────────────────
function checkEscolaridad(){
  const val=document.getElementById('escolaridad').value;
  const extra=document.getElementById('escolaridad_extra');
  const lbl=document.getElementById('escolaridad_extra_label');
  if(val==='Universidad'||val==='Posgrado'){
    extra.style.display='block';
    lbl.textContent='¿En qué carrera?';
  } else if(val==='Técnico'){
    extra.style.display='block';
    lbl.textContent='¿En qué área técnica?';
  } else {
    extra.style.display='none';
    document.getElementById('escolaridad_detalle').value='';
  }
}

// ── FOTOS DE PERFIL ────────────────────────────────────
function setFotos(val){
  document.getElementById('fotos_perfil').value=val;
  document.getElementById('fotos_si').style.opacity=val==='si'?'1':'0.4';
  document.getElementById('fotos_no').style.opacity=val==='no'?'1':'0.4';
}

// ── VALIDACIÓN CAMPOS OBLIGATORIOS ────────────────────
function validar(){
  const reqs=[
    {id:'nombre_pol',label:'Nombre del Policía'},
    {id:'zona',label:'Zona de Responsabilidad'},
    {id:'ne',label:'N.E (Número de Empleado)'},
    {id:'nombre',label:'Nombre completo de la persona'},
    {id:'categoria',label:'Categoría'},
    {id:'nacimiento',label:'Fecha de Nacimiento'},
    {id:'edad',label:'Edad'},
    {id:'domicilio',label:'Domicilio de la persona'},
    {id:'oficio',label:'Oficio / Profesión'},
    {id:'motivo',label:'Motivo del empadronamiento'},
  ];
  // Validar lugar de los hechos (campos o texto directo)
  const addrPreview=document.getElementById('addr-preview').textContent;
  const addrTexto=document.getElementById('addr_texto').value.trim();
  const addrCalle=document.getElementById('addr_calle').value.trim();
  const addrCruce=document.getElementById('addr_cruce').value.trim();
  if(!addrTexto&&(!addrCalle||!addrCruce)){
    alert('⚠️ Falta dato obligatorio:\n\n• Lugar de los Hechos (calle y cruce)');
    document.getElementById('addr_calle').focus();
    document.getElementById('addr_calle').style.borderColor='var(--danger)';
    setTimeout(()=>document.getElementById('addr_calle').style.borderColor='',3000);
    return false;
  }
  // Escolaridad es select, siempre tiene valor
  const faltantes=reqs.filter(r=>!document.getElementById(r.id).value.trim());
  if(faltantes.length){
    alert('⚠️ Faltan datos obligatorios:\n\n'+faltantes.map(r=>'• '+r.label).join('\n'));
    const el=document.getElementById(faltantes[0].id);
    el.focus();
    el.style.borderColor='var(--danger)';
    setTimeout(()=>el.style.borderColor='',3000);
    return false;
  }
  return true;
}

// ── AUTO OBSERVACIONES ────────────────────────────────
function buildObservaciones(){
  const noProp=[];
  if(!v('telefono'))noProp.push('número de teléfono');
  if(!v('alias'))noProp.push('alias');
  if(!v('redes'))noProp.push('redes sociales');
  if(!v('estado_origen'))noProp.push('estado de origen');
  if(!v('padre'))noProp.push('datos del padre');
  if(!v('madre'))noProp.push('datos de la madre');
  if(!v('estatura'))noProp.push('estatura');

  let obs=v('adicionales');
  if(noProp.length){
    const txt='No proporciona: '+noProp.join(', ')+'.';
    obs=obs?obs+'\n'+txt:txt;
  }
  const fotos=document.getElementById('fotos_perfil').value;
  if(fotos==='no'){
    const txt='Se niega a tomarse fotografías de perfil.';
    obs=obs?obs+'\n'+txt:txt;
  }
  return obs;
}

// ── ESCOLARIDAD FORMATEADA ────────────────────────────
function getEscolaridad(){
  const esc=v('escolaridad');
  const det=v('escolaridad_detalle');
  if(det&&(esc==='Universidad'||esc==='Posgrado'||esc==='Técnico'))return`${esc} (${det})`;
  return esc;
}

// ── SUBCATEGORÍA FORMATEADA ───────────────────────────
function getSubcat(){
  const sub=v('subcategoria');
  if(sub==='Otro'){const otro=v('otro_subcat');return otro?`Otro (${otro})`:'Otro';}
  return sub;
}

// ── BÚSQUEDA DE DIRECCIONES (Google Places o, sin llave, OpenStreetMap) ──
// La llave de Google se pega una sola vez dentro de la app (botón 🔑) y se
// guarda solo en este teléfono: no va escrita en el código público.
const GKEY_STORAGE='fc_gplaces_key';
let _placesToken=null,_domSeq=0,_lugarSeq=0,domicilioTimer=null,lugarTimer=null;

function getGoogleKey(){try{return(localStorage.getItem(GKEY_STORAGE)||'').trim();}catch(e){return'';}}
function updateGoogleKeyUI(){
  const on=!!getGoogleKey();
  document.querySelectorAll('.gkey-btn').forEach(b=>{
    b.textContent=on?'🔍 Google ✓':'🔑 Google';
    b.style.borderColor=on?'var(--green)':'var(--accent2)';
    b.style.color=on?'var(--green)':'var(--accent)';
    b.title=on?'Búsqueda tipo Google Maps activa (toca para cambiar la llave)':'Activar búsqueda tipo Google Maps';
  });
}
function configurarGoogleKey(){
  const actual=getGoogleKey();
  const val=prompt('Búsqueda de direcciones tipo Google Maps\n\nPega tu API key de Google Cloud (con "Places API (New)" habilitada).\n\nDeja vacío y acepta para desactivarla.',actual);
  if(val===null)return;
  const k=val.trim();
  if(k&&!/^AIza[0-9A-Za-z_\-]{30,}$/.test(k)){showToast('⚠️ Esa llave no parece válida (empieza con AIza…)',4000);return;}
  try{if(k)localStorage.setItem(GKEY_STORAGE,k);else localStorage.removeItem(GKEY_STORAGE);}catch(e){}
  updateGoogleKeyUI();
  showToast(k?'✅ Búsqueda tipo Google Maps activada':'Búsqueda Google desactivada',2600);
}
function newPlacesToken(){return(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);}

async function placesAutocomplete(query){
  if(!_placesToken)_placesToken=newPlacesToken();
  const r=await fetch('https://places.googleapis.com/v1/places:autocomplete',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-Goog-Api-Key':getGoogleKey()},
    body:JSON.stringify({
      input:query,languageCode:'es',regionCode:'mx',includedRegionCodes:['mx'],sessionToken:_placesToken,
      locationBias:{circle:{center:{latitude:25.6866,longitude:-100.3161},radius:50000}}
    })
  });
  if(!r.ok){
    let m='';try{const j=await r.json();m=(j.error&&j.error.message)||'';}catch(e){}
    throw new Error(`Google respondió ${r.status}${m?': '+m:''}`);
  }
  const j=await r.json();
  return(j.suggestions||[]).filter(s=>s.placePrediction).map(s=>{
    const p=s.placePrediction,sf=p.structuredFormat||{};
    return{placeId:p.placeId,google:true,
      main:(sf.mainText&&sf.mainText.text)||(p.text&&p.text.text)||'',
      secondary:(sf.secondaryText&&sf.secondaryText.text)||''};
  });
}
async function placeDetails(placeId){
  const r=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&sessionToken=${encodeURIComponent(_placesToken||'')}`,{
    headers:{'X-Goog-Api-Key':getGoogleKey(),'X-Goog-FieldMask':'id,formattedAddress,addressComponents,location'}
  });
  _placesToken=null; // la sesión de cobro termina al elegir un lugar
  if(!r.ok){
    let m='';try{const j=await r.json();m=(j.error&&j.error.message)||'';}catch(e){}
    throw new Error(`Google respondió ${r.status}${m?': '+m:''}`);
  }
  return parsePlace(await r.json());
}
function parsePlace(place){
  const comp={};
  (place.addressComponents||[]).forEach(c=>(c.types||[]).forEach(t=>{if(!comp[t])comp[t]=c.longText||c.shortText||'';}));
  return{
    calle:comp.route||'',
    colonia:comp.sublocality_level_1||comp.sublocality||comp.neighborhood||'',
    cp:comp.postal_code||'',
    municipio:comp.locality||comp.administrative_area_level_2||'',
    lat:place.location?place.location.latitude:null,
    lon:place.location?place.location.longitude:null,
    formatted:(place.formattedAddress||'').replace(/,\s*M[eé]xico$/i,'').trim()
  };
}
async function nominatimSearch(query){
  const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query+', Nuevo León, México')}&format=json&limit=6&accept-language=es&countrycodes=mx&viewbox=-100.65,25.95,-99.95,25.40&bounded=0`;
  const r=await fetch(url);
  if(!r.ok)throw new Error('Nominatim '+r.status);
  const res=await r.json();
  return res.map(x=>{
    const parts=x.display_name.replace(/, M[eé]xico$/,'').replace(/, Nuevo León/,'').split(',').map(s=>s.trim());
    return{google:false,main:parts[0],secondary:parts.slice(1).join(', '),full:x.display_name,lat:parseFloat(x.lat),lon:parseFloat(x.lon)};
  });
}

function pintarSugerencias(sugg,items,onPick,errorMsg){
  sugg.innerHTML='';
  if(errorMsg){
    const e=document.createElement('div');
    e.style.cssText='font-size:.7rem;padding:7px 12px;color:#f0a000;border-bottom:1px solid var(--border);';
    e.textContent='⚠️ '+errorMsg+' — mostrando resultados básicos';
    sugg.appendChild(e);
  }
  items.forEach(it=>{
    const d=document.createElement('div');
    d.className='sv-item';
    d.style.cssText='font-size:.82rem;padding:9px 12px;display:block;';
    const m=document.createElement('div');
    m.style.fontWeight='600';m.textContent='📍 '+it.main;
    d.appendChild(m);
    if(it.secondary){
      const s=document.createElement('div');
      s.style.cssText='font-size:.7rem;color:var(--muted);margin-top:2px;';
      s.textContent=it.secondary;
      d.appendChild(s);
    }
    d.addEventListener('mousedown',ev=>{ev.preventDefault();onPick(it);});
    sugg.appendChild(d);
  });
  sugg.style.display=(items.length||errorMsg)?'block':'none';
}

// ── DOMICILIO DE LA PERSONA ─────────────────────────────
function buscarDomicilio(query){
  const sugg=document.getElementById('domicilio-suggestions');
  clearTimeout(domicilioTimer);
  if(!query||query.length<4){sugg.style.display='none';return;}
  const seq=++_domSeq;
  domicilioTimer=setTimeout(async()=>{
    let items=null,gerr='';
    if(getGoogleKey()){try{items=await placesAutocomplete(query);}catch(e){gerr=e.message;}}
    if(!items){try{items=await nominatimSearch(query);}catch(e){items=[];}}
    if(seq!==_domSeq)return;
    pintarSugerencias(sugg,items,pickDomicilio,gerr);
  },350);
}
async function pickDomicilio(it){
  const ta=document.getElementById('domicilio');
  const sugg=document.getElementById('domicilio-suggestions');
  sugg.style.display='none';
  if(it.google){
    try{
      const p=await placeDetails(it.placeId);
      ta.value=p.formatted||(it.main+', '+it.secondary);
    }catch(e){
      ta.value=it.main+(it.secondary?', '+it.secondary:'');
      showToast('⚠️ '+e.message,3500);
    }
  }else{
    seleccionarDomicilio(it.full,it.main);
    return;
  }
  ta.classList.add('filled');
  ta.dispatchEvent(new Event('input',{bubbles:true}));
}
function seleccionarDomicilio(fullAddr,displayAddr){
  const ta=document.getElementById('domicilio');
  let clean=String(fullAddr).replace(/, México$/,'').replace(/^[\d]+, /,'').trim();
  ta.value=toTitleCase(clean);
  ta.classList.add('filled');
  document.getElementById('domicilio-suggestions').style.display='none';
}

// ── LUGAR DE LOS HECHOS ─────────────────────────────────
function buscarLugar(query){
  const sugg=document.getElementById('lugar-suggestions');
  clearTimeout(lugarTimer);
  if(!query||query.length<3){sugg.style.display='none';return;}
  const seq=++_lugarSeq;
  lugarTimer=setTimeout(async()=>{
    let items=null,gerr='';
    if(getGoogleKey()){try{items=await placesAutocomplete(query);}catch(e){gerr=e.message;}}
    if(!items){try{items=await nominatimSearch(query);}catch(e){items=[];}}
    if(seq!==_lugarSeq)return;
    pintarSugerencias(sugg,items,pickLugar,gerr);
  },350);
}
async function pickLugar(it){
  document.getElementById('lugar-suggestions').style.display='none';
  const st=document.getElementById('geo-status');
  st.style.display='block';
  const box=document.getElementById('lugar_busq');
  if(!it.google){
    // Sin Google: se usa el punto encontrado para llenar calle, colonia, CP y cruce
    box.value=it.main;
    st.textContent='📍 Cargando dirección...';
    await fetchAddress(it.lat,it.lon,null,'geo-status');
    return;
  }
  st.textContent='📍 Cargando lugar...';
  try{
    const p=await placeDetails(it.placeId);
    box.value=it.main;
    document.getElementById('addr_texto').value='';
    if(p.calle)document.getElementById('addr_calle').value=p.calle;
    if(p.colonia)document.getElementById('addr_colonia').value=p.colonia;
    if(p.cp)document.getElementById('addr_cp').value=p.cp;
    if(p.municipio)document.getElementById('addr_municipio').value=p.municipio;
    document.getElementById('addr_cruce').value='';
    buildAddr();
    if(p.lat!=null&&p.calle){
      st.textContent='✅ Lugar cargado — buscando calle de cruce...';
      const ok=await detectarCruceEn(p.lat,p.lon,p.calle,'geo-status');
      if(ok)st.textContent='✅ Lugar y cruce cargados — edita si es necesario';
    }else{
      st.textContent='✅ Lugar cargado — escribe el cruce';
    }
    document.dispatchEvent(new Event('change'));
  }catch(e){
    st.innerHTML='❌ '+escHtml(e.message);
  }
}

document.addEventListener('click',e=>{
  if(!e.target.closest('#lugar-suggestions')&&e.target.id!=='lugar_busq'){
    const s=document.getElementById('lugar-suggestions');if(s)s.style.display='none';
  }
});

// Cerrar sugerencias al tocar fuera
document.addEventListener('click',e=>{
  if(!e.target.closest('#domicilio-suggestions')&&e.target.id!=='domicilio'){
    const s=document.getElementById('domicilio-suggestions');
    if(s)s.style.display='none';
  }
});

// ── COPIAR LUGAR A DOMICILIO ────────────────────────────
function copiarLugarADomicilio(){
  const addr=document.getElementById('addr_texto').value.trim()||document.getElementById('addr-preview').textContent;
  if(!addr||addr==='La dirección aparecerá aquí...')return;
  document.getElementById('domicilio').value=addr;
  document.getElementById('domicilio').classList.add('filled');
}

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
function filterSelect(hiddenId, searchId){
  const val = document.getElementById(searchId).value.toLowerCase();
  const dropdown = document.getElementById(hiddenId + '_dropdown');
  dropdown.style.display = 'block';
  dropdown.querySelectorAll('.sv-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(val) ? 'block' : 'none';
  });
}
function pickSelect(hiddenId, searchId, value){
  document.getElementById(hiddenId).value = value;
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

// ── OCR ZOOM ───────────────────────────────────────────
let ocrZoom = 1;
let ocrTrack = null;
function zoomOCR(dir){
  ocrZoom = Math.min(Math.max(ocrZoom + dir * 0.5, 1), 5);
  if(ocrTrack){
    try{
      ocrTrack.applyConstraints({advanced:[{zoom: ocrZoom}]});
    }catch(e){
      // Zoom not supported, use CSS transform
      document.getElementById('ocr-video').style.transform = `scale(${ocrZoom})`;
      document.getElementById('ocr-video').style.transformOrigin = 'center center';
    }
  }
}

// ── FRASES RÁPIDAS ────────────────────────────────────
// ── OBSERVACIONES INTELIGENTES ────────────────────────
// Estado de negativas activas (persona) y características (vehículo)
let negativasActivas=[];
let caracActivas=[];
let obsManualPersona='';
let obsManualVeh='';

function addFrase(targetId,txt){
  const ta=document.getElementById(targetId);
  ta.value=ta.value?(ta.value.trim()+' '+txt):txt;
  if(targetId==='adicionales')obsManualPersona=ta.value;
  ta.focus();
}

// Combinar negativas en frase fluida
function buildNegativasFrase(){
  if(negativasActivas.length===0)return'';
  if(negativasActivas.length===1)return`Se niega a ${negativasActivas[0]}.`;
  const last=negativasActivas[negativasActivas.length-1];
  const rest=negativasActivas.slice(0,-1);
  return`Se niega a ${rest.join(', ')} y a ${last}.`;
}

function toggleNegativa(btn,texto){
  const idx=negativasActivas.indexOf(texto);
  if(idx>=0){negativasActivas.splice(idx,1);btn.classList.remove('neg-active');}
  else{negativasActivas.push(texto);btn.classList.add('neg-active');}
  refreshAdicionales();
  vibrate(30);
}

function refreshAdicionales(){
  const ta=document.getElementById('adicionales');
  const frase=buildNegativasFrase();
  // Capturar lo escrito manualmente (sin la frase de negativas previa)
  let manual=obsManualPersona.trim();
  // Combinar: manual primero, luego negativas
  let parts=[];
  if(manual)parts.push(manual);
  if(frase)parts.push(frase);
  ta.value=parts.join(' ');
}

function onObsManual(id){
  // Guardar lo que el usuario escribe, separado de las frases automáticas
  const ta=document.getElementById(id);
  const frase=buildNegativasFrase();
  let val=ta.value;
  // Quitar la frase de negativas del final si está
  if(frase&&val.endsWith(frase))val=val.slice(0,-frase.length).trim();
  obsManualPersona=val;
}

// Vehículo — características
function buildCaracFrase(){
  if(caracActivas.length===0)return'';
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  if(caracActivas.length===1)return`El vehículo presenta ${caracActivas[0]}.`;
  const last=caracActivas[caracActivas.length-1];
  const rest=caracActivas.slice(0,-1);
  return`El vehículo presenta ${rest.join(', ')} y ${last}.`;
}

function toggleCarac(btn,texto){
  const idx=caracActivas.indexOf(texto);
  if(idx>=0){caracActivas.splice(idx,1);btn.classList.remove('neg-active');}
  else{caracActivas.push(texto);btn.classList.add('neg-active');}
  refreshObservaciones();
  vibrate(30);
}

function refreshObservaciones(){
  const ta=document.getElementById('observaciones');
  const frase=buildCaracFrase();
  let manual=obsManualVeh.trim();
  let parts=[];
  if(manual)parts.push(manual);
  if(frase)parts.push(frase);
  ta.value=parts.join(' ');
}

function onObsManualVeh(){
  const ta=document.getElementById('observaciones');
  const frase=buildCaracFrase();
  let val=ta.value;
  if(frase&&val.endsWith(frase))val=val.slice(0,-frase.length).trim();
  obsManualVeh=val;
}

// ── SECCIONES COLAPSABLES ──────────────────────────────
function toggleSection(id){
  const body=document.getElementById(id);
  if(!body)return;
  const arrow=document.getElementById(id.replace('-body','-arrow'));
  const isCollapsed=body.style.maxHeight==='0px'||body.style.maxHeight==='';
  if(isCollapsed){
    body.style.maxHeight=body.scrollHeight+'px';
    body.style.opacity='1';
    if(arrow)arrow.style.transform='rotate(0deg)';
  } else {
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

// ── GENERAR ────────────────────────────────────────────
function buildReportText(){
  const obs=buildObservaciones();
  const txt=
`*#${v('num_emp')||'___'} FUERZA CIVIL*
*EMPADRONAMIENTO*

*Zona de responsabilidad:* ${v('zona')}

*CATEGORIA:* ${v('categoria')}
*SUBCATEGORIA:* ${getSubcat()}

*Nombre:* ${v('nombre_pol')}
*N.E:* ${v('ne')}

*Lugar de los Hechos:*
${getAddr()}

*Fecha:* ${fmtF(v('fecha'))}
*Hora:* ${v('hora').replace(/^(\d):/, '0$1:')} horas

*Folio C5:* ${v('folio')}
*CRP:* ${v('crp')}
*Número de BODYCAM:* ${v('bodycam')}
*Motivo del empadronamiento:* ${v('motivo')}

*PERSONA*

*Pertenece a sector vulnerable:* ${v('vulnerable')}
*Nombre completo:* ${np('nombre')}
*Fecha de Nacimiento:* ${np('nacimiento')}
*Edad:* ${np('edad')}
*Estatura:* ${v('estatura')?v('estatura')+' metros':'No proporciona'}
*Sexo:* ${v('sexo')}
*Teléfono:* ${np('telefono')}
*Alias:* ${np('alias')}
*Redes Sociales:* ${np('redes')}
*Domicilio:* ${np('domicilio')}
*Estado de origen:* ${np('estado_origen')}
*Estado civil:* ${v('estado_civil')}
*Escolaridad:* ${getEscolaridad()}
*Oficio/Profesión:* ${np('oficio')}
*Datos del Padre:* ${np('padre')}
*Datos de la Madre:* ${np('madre')}
*Antecedentes Criminales:* ${na('antecedentes')}
*Grupo criminal:* ${na('grupo')}
*Rol criminal:* ${na('rol')}

*Datos adicionales:*
${obs}

*TATUAJES*

*Cantidad de tatuajes:* ${v('tatuajes_cant')}
*En qué área del cuerpo:* ${v('tatuajes_area')}
*Descripción de los tatuajes:* ${v('tatuajes_desc')}

*VEHÍCULO*

*Tipo de vehículo:* ${v('tipo_vehiculo')}
*Marca:* ${v('marca')}
*Sub marca:* ${v('submarca')}
*Modelo:* ${v('modelo')}
*Año:* ${v('anio')}
*Color:* ${v('color')}
*Placas:* ${v('placas')}
*Estado de Placas:* ${v('estado_placas')}
*Vehículo con documentación completa:* ${v('documentacion')}
*Número de Serie:* ${v('serie')}
*Número de motor:* ${v('motor')}
*NIV:* ${v('niv')}

*Detallado/Observaciones:*
${v('observaciones')}`;

  // Limpiar espacios múltiples (máximo 1) sin tocar saltos de línea
  return txt.split('\n').map(line=>line.replace(/ {2,}/g,' ').trimEnd()).join('\n');
}

function generar(){
  if(!validar())return;
  // Actualizar hora al momento exacto de generar
  const now=new Date();
  const hh=String(now.getHours()).padStart(2,'0');
  const mm=String(now.getMinutes()).padStart(2,'0');
  document.getElementById('hora').value=`${hh}:${mm}`;

  const txtLimpio=buildReportText();

  const ta=document.getElementById('output-text');
  ta.value=txtLimpio;
  const box=document.getElementById('output-box');
  box.style.display='block';
  box.classList.remove('animate');void box.offsetWidth;box.classList.add('animate');
  ta.style.height='auto';
  ta.style.height=ta.scrollHeight+'px';
  box.scrollIntoView({behavior:'smooth'});
  vibrate(80);
  showToast('⚡ Reporte generado');
}

// ── SISTEMA DE LOTE (MÚLTIPLES EMPADRONAMIENTOS) ───────
let loteEmpadronamientos=[];
let editingLoteId=null;
const LOTE_KEY='fc_lote_v1';

function saveLote(){
  try{localStorage.setItem(LOTE_KEY,JSON.stringify({data:loteEmpadronamientos,savedAt:Date.now()}));}catch(e){}
}
function restoreLoteIfAny(){
  try{
    const raw=localStorage.getItem(LOTE_KEY);
    if(!raw)return 0;
    const parsed=JSON.parse(raw);
    // Compat con formato viejo (array plano sin envoltura/expiración)
    const arr=Array.isArray(parsed)?parsed:parsed.data;
    const savedAt=Array.isArray(parsed)?Date.now():parsed.savedAt;
    const MAX_AGE_MS=12*60*60*1000; // 12 horas
    if(!savedAt||(Date.now()-savedAt)>MAX_AGE_MS){
      localStorage.removeItem(LOTE_KEY);
      return 0;
    }
    if(Array.isArray(arr)&&arr.length){
      loteEmpadronamientos=arr;
      actualizarBarraLote();
      return arr.length;
    }
  }catch(e){console.error('Error restaurando lote:',e);}
  return 0;
}

function updateBtnAgregarLoteLabel(){
  const btn=document.getElementById('btn-agregar-lote');
  if(!btn)return;
  btn.textContent=editingLoteId!==null?'💾 GUARDAR CAMBIOS DEL LOTE':'➕ AGREGAR A LOTE Y CONTINUAR CON OTRO';
}

function agregarAlLote(){
  if(!validar())return;
  const now=new Date();
  const hh=String(now.getHours()).padStart(2,'0');
  const mm=String(now.getMinutes()).padStart(2,'0');
  document.getElementById('hora').value=`${hh}:${mm}`;

  const texto=buildReportText();
  const resumen=v('nombre')||'(sin nombre)';
  const numEmp=v('num_emp')||'___';
  const datos=backupForm();
  const extra={neg:negativasActivas.slice(),carac:caracActivas.slice(),obsP:obsManualPersona,obsV:obsManualVeh};
  const wasEditing=editingLoteId!==null;
  const curTab=tabs.find(t=>t.id===activeTabId);

  let idxEdit=wasEditing?loteEmpadronamientos.findIndex(i=>i.id===editingLoteId):-1;
  if(idxEdit!==-1){
    loteEmpadronamientos[idxEdit]={...loteEmpadronamientos[idxEdit],numEmp,nombre:resumen,texto,datos,extra};
    showToast('✅ Cambios guardados en el lote');
  }else{
    // Si el item que se editaba ya no existe, se guarda como uno nuevo (nunca se pierde)
    loteEmpadronamientos.push({id:Date.now(),numEmp,nombre:resumen,texto,datos,extra,tabId:curTab?curTab.id:undefined});
    showToast(`✅ Agregado al lote (${loteEmpadronamientos.length} en total)`);
  }
  if(wasEditing){editingLoteId=null;updateBtnAgregarLoteLabel();}
  actualizarBarraLote();
  saveLote();
  vibrate(60);

  // Limpiar formulario para el siguiente, conservando datos del policía
  const conservarBackup={
    zona:v('zona'),ne:v('ne'),nombre_pol:v('nombre_pol'),crp:v('crp')
  };
  document.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.classList.remove('filled');});
  document.querySelectorAll('select').forEach(el=>el.selectedIndex=0);
  document.getElementById('output-box').style.display='none';
  document.getElementById('addr-preview').textContent='La dirección aparecerá aquí...';
  document.getElementById('addr_estado').value='N.L.';
  document.getElementById('tatuajes_cant').value='0';
  document.getElementById('fotos_perfil').value='';
  document.getElementById('fotos_si').style.opacity='1';
  document.getElementById('fotos_no').style.opacity='1';
  document.getElementById('escolaridad_extra').style.display='none';
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';
  document.querySelectorAll('.neg-active').forEach(b=>b.classList.remove('neg-active'));

  document.getElementById('zona').value=conservarBackup.zona;
  document.getElementById('ne').value=conservarBackup.ne;
  document.getElementById('nombre_pol').value=conservarBackup.nombre_pol;
  document.getElementById('crp').value=conservarBackup.crp;
  // Siguiente número: el más alto entre lote y demás pestañas (nunca se repite)
  const numField=document.getElementById('num_emp');
  const sig=nextNumEmp();
  if(sig)setNumEmp(sig);

  initDT();
  scheduleDraftSave();
  window.scrollTo({top:0,behavior:'smooth'});
}

function actualizarBarraLote(){
  const bar=document.getElementById('lote-bar');
  const count=document.getElementById('lote-count');
  count.textContent=loteEmpadronamientos.length;
  bar.style.display=loteEmpadronamientos.length>0?'flex':'none';
}

function abrirPanelLote(){
  const lista=document.getElementById('lote-lista');
  if(loteEmpadronamientos.length===0){
    lista.innerHTML='<p style="text-align:center;color:var(--muted);padding:20px;">No hay empadronamientos en el lote todavía.</p>';
  } else {
    lista.innerHTML=loteEmpadronamientos.map((item,idx)=>`
      <div style="background:var(--surface2);border:1px solid ${item.id===editingLoteId?'#9b59b6':'var(--border2)'};${item.id===editingLoteId?'box-shadow:0 0 0 1px #9b59b6;':''}border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div>
          <div style="font-weight:600;color:var(--text);font-size:.88rem;">#${escHtml(item.numEmp)} — ${escHtml(item.nombre)}${item.id===editingLoteId?' <span style="color:#9b59b6;font-size:.7rem;">(editando)</span>':''}</div>
          <div style="font-size:.7rem;color:var(--muted);">Empadronamiento ${idx+1} de ${loteEmpadronamientos.length}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button onclick="verUnoLote(${item.id})" style="background:var(--accent2);color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:.75rem;cursor:pointer;">👁</button>
          <button onclick="editarLote(${item.id})" style="background:#9b59b6;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:.75rem;cursor:pointer;">✏️</button>
          <button onclick="eliminarDelLote(${item.id})" style="background:transparent;border:1px solid var(--danger);color:var(--danger);border-radius:6px;padding:6px 10px;font-size:.75rem;cursor:pointer;">🗑</button>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('lote-modal').style.display='block';
  document.body.style.overflow='hidden';
}

function cerrarPanelLote(){
  document.getElementById('lote-modal').style.display='none';
  document.body.style.overflow='';
}

function verUnoLote(id){
  const item=loteEmpadronamientos.find(i=>i.id===id);
  if(!item)return;
  document.getElementById('output-text').value=item.texto;
  document.getElementById('output-box').style.display='block';
  cerrarPanelLote();
  document.getElementById('output-box').scrollIntoView({behavior:'smooth'});
}

function editarLote(id){
  const item=loteEmpadronamientos.find(i=>i.id===id);
  if(!item)return;
  // Si ya hay una pestaña editando este item, simplemente ir a ella
  const already=tabs.find(t=>(t.id===activeTabId?editingLoteId:t.editLoteId)===id);
  if(already){cerrarPanelLote();switchTab(already.id);return;}
  // Con datos en la pestaña actual, se abre en una pestaña nueva (no se pierde nada)
  if(tabFormStatus(backupForm())!=='empty'){
    if(tabs.length<MAX_TABS){
      addTab({blank:true,silent:true});
    }else if(!confirm('Hay datos sin guardar en esta pestaña y ya tienes el máximo de pestañas.\n\n¿Descartarlos y cargar este empadronamiento del lote para editarlo?')){
      return;
    }
  }
  const ex=item.extra||{};
  applyTabState({form:item.datos||{},neg:ex.neg||[],carac:ex.carac||[],obsP:ex.obsP||'',obsV:ex.obsV||''});
  editingLoteId=id;
  updateBtnAgregarLoteLabel();
  document.getElementById('output-box').style.display='none';
  cerrarPanelLote();
  saveTabs();renderTabs(true);
  window.scrollTo({top:0,behavior:'smooth'});
  showToast('✏️ Editando — modifica y presiona "GUARDAR CAMBIOS DEL LOTE"',3200);
}

function eliminarDelLote(id){
  if(id===editingLoteId){editingLoteId=null;updateBtnAgregarLoteLabel();}
  loteEmpadronamientos=loteEmpadronamientos.filter(i=>i.id!==id);
  actualizarBarraLote();
  saveLote();
  abrirPanelLote();
  showToast('🗑 Eliminado del lote');
}

function copiarTodoLote(){
  if(loteEmpadronamientos.length===0){
    showToast('⚠️ El lote está vacío');
    return;
  }
  const separador='\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
  const textoCompleto=loteEmpadronamientos.map(i=>i.texto).join(separador);
  navigator.clipboard.writeText(textoCompleto).then(()=>{
    showToast(`✅ ${loteEmpadronamientos.length} reportes copiados — pégalos en WhatsApp`);
    vibrate(80);
  }).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=textoCompleto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Copiado');
  });
}

function vaciarLote(){
  if(!confirm(`¿Vaciar el lote completo? Se perderán los ${loteEmpadronamientos.length} empadronamientos guardados (no generados aún en pantalla).`))return;
  loteEmpadronamientos=[];
  if(editingLoteId!==null){editingLoteId=null;updateBtnAgregarLoteLabel();}
  actualizarBarraLote();
  saveLote();
  cerrarPanelLote();
  showToast('🗑 Lote vaciado');
}

// ── COPIAR ─────────────────────────────────────────────
function copiar(){
  const ta=document.getElementById('output-text');
  const btn=document.getElementById('btn-copy');
  const ok=()=>{btn.textContent='✅ Copiado';btn.classList.add('copied');showToast('✅ Reporte copiado — pégalo en WhatsApp');vibrate(50);setTimeout(()=>{btn.textContent='📋 Copiar';btn.classList.remove('copied');},2500);};
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(ta.value).then(ok).catch(fallback);
  }else{fallback();}
  function fallback(){
    ta.removeAttribute('readonly');ta.select();ta.setSelectionRange(0,99999);
    const ok2=document.execCommand('copy');
    ta.setAttribute('readonly','');window.getSelection()?.removeAllRanges();
    if(ok2)ok();else alert('Selecciona el texto manualmente y copia con Ctrl+C / mantén presionado.');
  }
}

// ── LIMPIAR TODO ───────────────────────────────────────
function limpiar(){
  if(!confirm('¿Limpiar todos los campos?'))return;
  undoBackup=backupForm();
  document.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.classList.remove('filled');});
  document.querySelectorAll('select').forEach(el=>el.selectedIndex=0);
  document.getElementById('output-box').style.display='none';
  document.getElementById('addr-preview').textContent='La dirección aparecerá aquí...';
  document.getElementById('addr_estado').value='N.L.';
  document.getElementById('tatuajes_cant').value='0';
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';
  document.querySelectorAll('.neg-active').forEach(b=>b.classList.remove('neg-active'));
  stopScan();
  initDT();
  clearDraft();
  if(editingLoteId!==null){editingLoteId=null;updateBtnAgregarLoteLabel();}
  ofrecerDeshacer();
}
// ── GUARDAR / CARGAR DATOS POLICÍA ────────────────────
const POLICIA_KEYS=['num_emp','nombre_pol','ne','zona','crp'];
function savePolicia(){
  const data={};
  POLICIA_KEYS.forEach(k=>{data[k]=document.getElementById(k)?.value||'';});
  localStorage.setItem('fc_policia',JSON.stringify(data));
  const ind=document.getElementById('save-indicator');
  ind.style.display='inline';
  clearTimeout(window._saveTimer);
  window._saveTimer=setTimeout(()=>ind.style.display='none',2000);
}
function loadPolicia(){
  try{
    const data=JSON.parse(localStorage.getItem('fc_policia')||'{}');
    POLICIA_KEYS.forEach(k=>{const el=document.getElementById(k);if(el&&data[k]&&!el.value.trim())el.value=data[k];});
  }catch(e){}
}
function borrarDatosPolicía(){
  if(!confirm('¿Borrar los datos guardados del policía?'))return;
  localStorage.removeItem('fc_policia');
  POLICIA_KEYS.forEach(k=>{const el=document.getElementById(k);if(el)el.value='';});
}

// ── EXPORTAR / IMPORTAR DATOS DEL POLICÍA ──────────────
function exportarDatosPolicia(){
  const data=JSON.parse(localStorage.getItem('fc_policia')||'{}');
  if(!Object.keys(data).length||!data.nombre_pol){
    showToast('⚠️ No hay datos del policía para exportar');
    return;
  }
  const json=JSON.stringify({app:'FC-Empadronamiento',version:1,policia:data},null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`FC_Config_${(data.ne||'policia')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Configuración exportada');
}

function importarDatosPolicia(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      const data=parsed.policia||parsed;
      if(!data.nombre_pol&&!data.ne){
        showToast('❌ Archivo no válido');
        return;
      }
      localStorage.setItem('fc_policia',JSON.stringify(data));
      loadPolicia();
      showToast('✅ Configuración importada correctamente');
    }catch(e){
      showToast('❌ No se pudo leer el archivo');
    }
  };
  reader.readAsText(file);
  input.value='';
}

function initDT(){
  const n=new Date();
  // OJO: no usar toISOString() aquí — convierte a UTC, y como Nuevo León
  // está detrás de UTC, de noche calculaba el día siguiente.
  const yyyy=n.getFullYear();
  const mm=String(n.getMonth()+1).padStart(2,'0');
  const dd=String(n.getDate()).padStart(2,'0');
  document.getElementById('fecha').value=`${yyyy}-${mm}-${dd}`;
  document.getElementById('hora').value=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
  document.getElementById('addr_estado').value='N.L.';
  loadPolicia();
  syncMotivoUI();
}
function updateClock(){
  const now=new Date();
  const t=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  const d=String(now.getDate()).padStart(2,'0')+'/'+(String(now.getMonth()+1).padStart(2,'0'))+'/'+now.getFullYear();
  const cl=document.getElementById('header-clock');
  if(cl)cl.textContent=t+' | '+d;
}
setInterval(updateClock,1000);

function validateField(id){
  const el=document.getElementById(id);
  if(!el)return;
  const field=el.closest('.field');
  if(!field)return;
  if(el.value.trim()){
    field.classList.add('field-valid');
    field.classList.remove('field-invalid');
  } else {
    field.classList.remove('field-valid');
  }
}

function checkGenerateReady(){
  const reqs=['nombre_pol','zona','ne','nombre','categoria','nacimiento','edad','domicilio','oficio','motivo'];
  reqs.forEach(validateField);
  const allFilled=reqs.every(id=>{const el=document.getElementById(id);return el&&el.value.trim();});
  const addrOk=document.getElementById('addr_texto').value.trim()||(document.getElementById('addr_calle').value.trim()&&document.getElementById('addr_cruce').value.trim());
  const btn=document.querySelector('.btn-generate:not([style*="verde"])');
  if(btn&&btn.textContent.includes('GENERAR')){
    if(allFilled&&addrOk){btn.classList.add('ready');btn.classList.remove('incomplete');}
    else{btn.classList.remove('ready');btn.classList.add('incomplete');}
  }
}
// Validación en tiempo real al escribir
document.addEventListener('input',e=>{
  if(e.target.matches('input,textarea,select')){
    const field=e.target.closest('.field');
    if(field&&e.target.value.trim())field.classList.add('field-valid');
    else if(field)field.classList.remove('field-valid');
  }
});
function updateProgress(){
  const allFields=['nombre_pol','zona','ne','num_emp','categoria','subcategoria','motivo','nombre','nacimiento','edad','estatura','telefono','domicilio','estado_origen','oficio','tipo_vehiculo','marca','submarca','placas'];
  let filled=0;
  allFields.forEach(id=>{const el=document.getElementById(id);if(el&&el.value.trim())filled++;});
  const addrOk=document.getElementById('addr_calle').value.trim()||document.getElementById('addr_texto').value.trim();
  if(addrOk)filled++;
  const pct=Math.round((filled/(allFields.length+1))*100);
  const fill=document.getElementById('progress-fill');
  const pctEl=document.getElementById('progress-pct');
  if(fill)fill.style.width=pct+'%';
  if(pctEl)pctEl.textContent=pct+'%';
}
setInterval(()=>{checkGenerateReady();updateProgress();},1500);

// FAB: mostrar al hacer scroll, ocultar cuando el botón principal es visible
function handleFAB(){
  const mainBtn=document.querySelector('.btn-generate[onclick="generar()"]');
  const fab=document.getElementById('fab-generate');
  if(!mainBtn||!fab)return;
  const rect=mainBtn.getBoundingClientRect();
  const mainVisible=rect.top<window.innerHeight&&rect.bottom>0;
  // Mostrar FAB solo si el botón principal NO está visible y hay algo de scroll
  if(!mainVisible&&window.scrollY>200){
    fab.classList.add('show');
    // Reflejar estado ready
    if(mainBtn.classList.contains('ready'))fab.classList.add('ready');
    else fab.classList.remove('ready');
  } else {
    fab.classList.remove('show');
  }
}
window.addEventListener('scroll',handleFAB,{passive:true});
window.addEventListener('touchmove',handleFAB,{passive:true});
setInterval(handleFAB,1000);

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

// ── LINTERNA ────────────────────────────────────────────
let torchOn=false;
async function toggleTorch(){
  if(!ocrTrack)return;
  try{
    torchOn=!torchOn;
    await ocrTrack.applyConstraints({advanced:[{torch:torchOn}]});
    document.getElementById('torch-btn').style.background=torchOn?'rgba(201,168,76,.4)':'var(--surface2)';
  }catch(e){
    showToast('⚠️ Linterna no disponible en este dispositivo');
    torchOn=false;
  }
}

// ── MULTI-CAPTURA ───────────────────────────────────────
let multiCaptura=false;
function preguntarOtraCaptura(){
  setTimeout(()=>{
    if(confirm('¿Escanear otro documento?\n\nEj: ya escaneaste el INE, ahora la tarjeta de circulación.')){
      startOCR();
    }
  },800);
}

// ── DESHACER LIMPIAR ────────────────────────────────────
let undoBackup=null;
function backupForm(){
  const data={};
  document.querySelectorAll('input,textarea').forEach(el=>{if(el.id&&el.id!=='lugar_busq')data[el.id]=el.value;});
  document.querySelectorAll('select').forEach(el=>{if(el.id)data['sel_'+el.id]=el.selectedIndex;});
  return data;
}
function restoreForm(data){
  if(!data)return;
  const keys=Object.keys(data);
  keys.forEach(k=>{
    if(k.startsWith('sel_'))return;
    const el=document.getElementById(k);
    if(el)el.value=data[k];
  });
  // La categoría va primero: hay que reconstruir las subcategorías antes de elegir una
  if('sel_categoria' in data){
    const c=document.getElementById('categoria');
    if(c)c.selectedIndex=data['sel_categoria'];
    updateSubcat();
  }
  keys.forEach(k=>{
    if(!k.startsWith('sel_')||k==='sel_categoria')return;
    const el=document.getElementById(k.slice(4));
    if(el)el.selectedIndex=data[k];
  });
  if(typeof checkOtroSubcat==='function')checkOtroSubcat();
  if(typeof checkEscolaridad==='function')checkEscolaridad();
  const fp=document.getElementById('fotos_perfil');
  if(fp){
    document.getElementById('fotos_si').style.opacity=fp.value==='no'?'0.4':'1';
    document.getElementById('fotos_no').style.opacity=fp.value==='si'?'0.4':'1';
  }
  syncMotivoUI();
  buildAddr();
}
function ofrecerDeshacer(){
  const t=document.getElementById('toast');
  t.innerHTML='🗑 Formulario limpiado &nbsp;<button onclick="deshacerLimpiar()" style="background:#fff;color:#007840;border:none;border-radius:14px;padding:4px 14px;font-weight:700;font-size:.8rem;cursor:pointer;">↩ DESHACER</button>';
  t.style.display='block';
  clearTimeout(window._toastTimer);
  window._toastTimer=setTimeout(()=>{t.style.display='none';undoBackup=null;},10000);
}
function deshacerLimpiar(){
  if(undoBackup){
    restoreForm(undoBackup);
    undoBackup=null;
    document.getElementById('toast').style.display='none';
    showToast('↩️ Formulario restaurado');
    saveDraft();
  }
}

// ── PESTAÑAS + AUTOGUARDADO ─────────────────────────────
// Hasta 5 empadronamientos en paralelo. Todo se guarda en localStorage
// (sobrevive a que Android mate la pestaña o cierres la app) y se borra
// solo a las 12 horas para no dejar datos de personas acumulados.
const DRAFT_KEY='fc_draft_v1';          // formato anterior (solo para migrar)
const TABS_KEY='fc_tabs_v1';
const DRAFT_MAX_AGE_MS=12*60*60*1000;   // 12 horas
const MAX_TABS=5;
const TAB_REQ=['nombre_pol','zona','ne','nombre','categoria','nacimiento','edad','domicilio','oficio','motivo'];
const TAB_PERSON=['nombre','nacimiento','edad','domicilio','oficio','curp','placas','marca'];
const TAB_POLICE=['zona','ne','nombre_pol','crp','bodycam'];
const TAB_SERVICE=['folio','addr_calle','addr_cruce','addr_colonia','addr_cp','addr_municipio','addr_texto','motivo','otro_subcat'];
const TAB_INHERIT_KEY='fc_tab_inherit';
let tabs=[],activeTabId=null,tabsReady=false,_tabSeq=0,draftSaveTimer=null,_lastSig='',_renderT=null;

function newTabId(){return 't'+Date.now().toString(36)+(++_tabSeq);}
function inheritPref(){try{return localStorage.getItem(TAB_INHERIT_KEY)!=='0';}catch(e){return true;}}
function saveInheritPref(cb){try{localStorage.setItem(TAB_INHERIT_KEY,cb.checked?'1':'0');}catch(e){}}

// Lectura de un valor dentro de un snapshot de formulario
function tabGet(form,id){
  if(id==='categoria')return form['sel_categoria']>0?'x':'';
  const val=form[id];
  return val==null?'':String(val).trim();
}
// empty = sin datos de persona/vehículo · partial = en captura · complete = lista para generar
function tabFormStatus(form){
  if(!form)return'empty';
  const addrOk=tabGet(form,'addr_texto')||(tabGet(form,'addr_calle')&&tabGet(form,'addr_cruce'));
  if(TAB_REQ.every(id=>tabGet(form,id))&&addrOk)return'complete';
  if(TAB_PERSON.some(id=>tabGet(form,id)))return'partial';
  return'empty';
}
function tabLabel(form,i){
  const num=(form.num_emp||'').trim();
  const first=(form.nombre||'').trim().split(/\s+/)[0];
  return '#'+(num||(i+1))+' '+(first||'Nueva');
}

function captureTabState(){
  return{form:backupForm(),neg:negativasActivas.slice(),carac:caracActivas.slice(),obsP:obsManualPersona,obsV:obsManualVeh};
}
// Deja el formulario completamente en blanco (sin tocar pestañas ni almacenamiento)
function resetFormFields(){
  document.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.classList.remove('filled');});
  document.querySelectorAll('select').forEach(el=>el.selectedIndex=0);
  document.getElementById('output-box').style.display='none';
  document.getElementById('addr-preview').textContent='La dirección aparecerá aquí...';
  document.getElementById('addr_estado').value='N.L.';
  document.getElementById('tatuajes_cant').value='0';
  document.getElementById('fotos_perfil').value='';
  document.getElementById('fotos_si').style.opacity='1';
  document.getElementById('fotos_no').style.opacity='1';
  document.getElementById('escolaridad_extra').style.display='none';
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';
  document.querySelectorAll('.neg-active').forEach(b=>b.classList.remove('neg-active'));
  const cs=document.getElementById('curp-status');if(cs)cs.textContent='';
  ['domicilio-suggestions','lugar-suggestions'].forEach(id=>{const s=document.getElementById(id);if(s)s.style.display='none';});
  const os=document.getElementById('otro_subcat_field');if(os)os.style.display='none';
  updateSubcat();
  syncMotivoUI();
}
function applyTabState(st){
  resetFormFields();
  st=st||{};
  if(st.form)restoreForm(st.form);
  negativasActivas=(st.neg||[]).slice();caracActivas=(st.carac||[]).slice();
  obsManualPersona=st.obsP||'';obsManualVeh=st.obsV||'';
  document.querySelectorAll('[onclick^="toggleNegativa("],[onclick^="toggleCarac("]').forEach(btn=>{
    const oc=btn.getAttribute('onclick')||'';
    const m=oc.match(/'([^']*)'\)\s*$/);
    if(!m)return;
    const list=oc.startsWith('toggleNegativa(')?negativasActivas:caracActivas;
    btn.classList.toggle('neg-active',list.includes(m[1]));
  });
  if(typeof updateSubmarcaList==='function')updateSubmarcaList();
}

// Siguiente número de empadronamiento: el más alto entre lote, pestañas y formulario actual
function setNumEmp(n){
  if(!n)return;
  document.getElementById('num_emp').value=n;
  try{const d=JSON.parse(localStorage.getItem('fc_policia')||'{}');d.num_emp=n;localStorage.setItem('fc_policia',JSON.stringify(d));}catch(e){}
}
function nextNumEmp(){
  const nums=[];
  const push=s=>{s=String(s==null?'':s).trim();if(/^\d+$/.test(s))nums.push({n:parseInt(s,10),w:s.length});};
  loteEmpadronamientos.forEach(i=>push(i.numEmp));
  tabs.forEach(t=>{if(t.id!==activeTabId&&t.state&&t.state.form)push(t.state.form.num_emp);});
  push(document.getElementById('num_emp').value);
  if(!nums.length)return'';
  const m=nums.reduce((a,b)=>b.n>a.n?b:a);
  return String(m.n+1).padStart(Math.max(m.w,2),'0');
}

// Formulario nuevo: siempre conserva datos del policía; opcionalmente hereda lugar/motivo/categoría
function buildNewTabForm(srcForm,inherit){
  resetFormFields();
  const f=backupForm();
  TAB_POLICE.forEach(id=>{if(srcForm[id]!=null)f[id]=srcForm[id];});
  if(inherit){
    TAB_SERVICE.forEach(id=>{if(srcForm[id]!=null)f[id]=srcForm[id];});
    ['sel_categoria','sel_subcategoria'].forEach(k=>{if(srcForm[k]!=null)f[k]=srcForm[k];});
  }
  return f;
}

function syncActiveTab(){
  const cur=tabs.find(t=>t.id===activeTabId);
  if(cur){cur.state=captureTabState();cur.editLoteId=editingLoteId;}
  return cur;
}

function addTab(opts){
  opts=opts||{};
  if(tabs.length>=MAX_TABS){showToast(`⚠️ Máximo ${MAX_TABS} pestañas abiertas — cierra o genera alguna`,3200);return null;}
  const cur=syncActiveTab();
  const src=cur?cur.state.form:backupForm();
  const num=nextNumEmp();
  const inherit=!opts.blank&&inheritPref();
  const form=buildNewTabForm(src,inherit);
  if(num)form.num_emp=num;
  const t={id:newTabId(),state:{form:form,neg:[],carac:[],obsP:'',obsV:''},editLoteId:null,generated:false};
  tabs.push(t);activeTabId=t.id;
  applyTabState(t.state);
  editingLoteId=null;updateBtnAgregarLoteLabel();
  initDT();
  if(num)setNumEmp(num);
  t.state=captureTabState();
  saveTabs();renderTabs(true);
  if(!opts.silent){
    window.scrollTo({top:0,behavior:'smooth'});
    vibrate(20);
    showToast(`➕ Pestaña ${tabs.length} lista`+(inherit?' (heredó lugar, motivo y categoría)':''),2800);
  }
  return t;
}

function switchTab(id){
  if(id===activeTabId)return;
  const next=tabs.find(t=>t.id===id);if(!next)return;
  syncActiveTab();
  activeTabId=id;
  applyTabState(next.state);
  editingLoteId=next.editLoteId||null;
  updateBtnAgregarLoteLabel();
  saveTabs();renderTabs(true);
  window.scrollTo({top:0,behavior:'smooth'});
  vibrate(15);
}

function closeTab(id){
  const t=tabs.find(x=>x.id===id);if(!t)return;
  const isActive=id===activeTabId;
  const form=isActive?backupForm():t.state.form;
  if(tabFormStatus(form)!=='empty'&&!t.generated&&!confirm('Esta pestaña tiene datos sin generar.\n\n¿Cerrarla y descartarlos?'))return;
  if(tabs.length===1){
    const num=v('num_emp');
    const f=buildNewTabForm(backupForm(),false);
    f.num_emp=num;
    t.state={form:f,neg:[],carac:[],obsP:'',obsV:''};t.generated=false;t.editLoteId=null;
    applyTabState(t.state);editingLoteId=null;updateBtnAgregarLoteLabel();initDT();
    t.state=captureTabState();
    saveTabs();renderTabs(true);showToast('🧹 Pestaña limpiada');
    return;
  }
  const idx=tabs.indexOf(t);
  tabs.splice(idx,1);
  if(isActive){
    const next=tabs[Math.min(idx,tabs.length-1)];
    activeTabId=next.id;
    applyTabState(next.state);
    editingLoteId=next.editLoteId||null;
    updateBtnAgregarLoteLabel();
  }
  saveTabs();renderTabs(true);
}

// Fin de turno: cierra todas las pestañas (el lote se conserva)
function cerrarTodasLasPestanas(){
  syncActiveTab();
  const pend=tabs.filter(t=>tabFormStatus(t.state.form)!=='empty'&&!t.generated).length;
  const msg=pend?`Hay ${pend} pestaña(s) con datos sin generar.\n\n¿Cerrar TODAS las pestañas y descartarlas?\n(El lote no se borra)`:'¿Cerrar todas las pestañas?\n(El lote no se borra)';
  if(!confirm(msg))return;
  const f=buildNewTabForm(backupForm(),false);
  const t={id:newTabId(),state:{form:f,neg:[],carac:[],obsP:'',obsV:''},editLoteId:null,generated:false};
  tabs=[t];activeTabId=t.id;
  applyTabState(t.state);editingLoteId=null;updateBtnAgregarLoteLabel();initDT();
  t.state=captureTabState();
  saveTabs();renderTabs(true);
  showToast('🧹 Pestañas cerradas — turno limpio');
}

// Genera el reporte de todas las pestañas completas y los manda al lote
function generarTodosCompletos(){
  syncActiveTab();
  const targets=tabs.filter(t=>tabFormStatus(t.state.form)==='complete'&&!t.generated);
  if(!targets.length){showToast('⚠️ No hay pestañas completas pendientes');return;}
  const savedActive=activeTabId;
  const now=new Date();
  const hora=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  let nuevos=0,actualizados=0;
  targets.forEach(t=>{
    applyTabState(t.state);
    document.getElementById('hora').value=hora;
    const texto=buildReportText();
    const item={
      numEmp:v('num_emp')||'___',nombre:v('nombre')||'(sin nombre)',texto,
      datos:backupForm(),
      extra:{neg:negativasActivas.slice(),carac:caracActivas.slice(),obsP:obsManualPersona,obsV:obsManualVeh},
      tabId:t.id
    };
    let idx=-1;
    if(t.editLoteId)idx=loteEmpadronamientos.findIndex(i=>i.id===t.editLoteId);
    if(idx<0)idx=loteEmpadronamientos.findIndex(i=>i.tabId===t.id);
    if(idx>=0){loteEmpadronamientos[idx]={...loteEmpadronamientos[idx],...item};actualizados++;}
    else{loteEmpadronamientos.push({id:Date.now()+nuevos+actualizados,...item});nuevos++;}
    t.generated=true;t.editLoteId=null;
    t.state=captureTabState();
  });
  const back=tabs.find(t=>t.id===savedActive)||tabs[0];
  activeTabId=back.id;
  applyTabState(back.state);
  editingLoteId=back.editLoteId||null;
  updateBtnAgregarLoteLabel();
  actualizarBarraLote();saveLote();saveTabs();renderTabs();
  vibrate(80);
  showToast(`✅ ${nuevos+actualizados} reporte(s) en el lote — cópialos todos`,3200);
  abrirPanelLote();
}

function renderTabs(scrollActive){
  const cont=document.getElementById('tabs-container');
  if(!cont||!tabsReady)return;
  const addBtn=document.getElementById('tab-add-btn');
  cont.querySelectorAll('.tab-btn').forEach(b=>b.remove());
  const live=backupForm();
  let nComplete=0,activeBtn=null;
  tabs.forEach((t,i)=>{
    const isActive=t.id===activeTabId;
    const form=isActive?live:t.state.form;
    const status=tabFormStatus(form);
    const done=t.generated&&status==='complete';
    if(status==='complete'&&!t.generated)nComplete++;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='tab-btn'+(isActive?' active':'');
    btn.onclick=()=>switchTab(t.id);
    const dot=document.createElement('span');
    dot.className='tab-dot '+(done?'complete':(status==='complete'?'complete-pulse':status));
    const name=document.createElement('span');
    name.className='tab-name';
    const label=tabLabel(form,i);
    name.textContent=(done?'✓ ':'')+label;
    btn.title=label+(status==='complete'?' — completa':status==='partial'?' — en captura':' — vacía');
    const close=document.createElement('span');
    close.className='tab-close';close.textContent='✕';
    close.onclick=ev=>{ev.stopPropagation();closeTab(t.id);};
    btn.append(dot,name,close);
    cont.insertBefore(btn,addBtn);
    if(isActive)activeBtn=btn;
  });
  addBtn.disabled=tabs.length>=MAX_TABS;
  const gen=document.getElementById('tab-gen-all');
  if(gen){
    gen.style.display=(tabs.length>1&&nComplete>0)?'block':'none';
    gen.textContent=`⚡ GENERAR ${nComplete} COMPLETO${nComplete>1?'S':''} → LOTE`;
  }
  const cb=document.querySelector('.tab-inherit-cb');
  if(cb)cb.checked=inheritPref();
  if(scrollActive&&activeBtn)cont.scrollLeft=Math.max(0,activeBtn.offsetLeft-24);
}
function renderTabsSoon(){clearTimeout(_renderT);_renderT=setTimeout(renderTabs,200);}

function saveTabs(){
  if(!tabsReady)return;
  try{
    syncActiveTab();
    localStorage.setItem(TABS_KEY,JSON.stringify({tabs:tabs,activeId:activeTabId,savedAt:Date.now()}));
  }catch(e){}
}
function saveDraft(){saveTabs();renderTabs();}
function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(saveDraft,600);
}
function clearDraft(){scheduleDraftSave();}

// Formato anterior (un solo borrador): solo se usa para migrar la primera vez
function restoreDraftIfAny(){
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw)return false;
    const parsed=JSON.parse(raw);
    if(parsed.savedAt&&(Date.now()-parsed.savedAt)>DRAFT_MAX_AGE_MS){
      localStorage.removeItem(DRAFT_KEY);
      return false;
    }
    restoreForm(parsed.form||parsed);
    if(parsed.editingLoteId){editingLoteId=parsed.editingLoteId;}
    return true;
  }catch(e){console.error('Error restaurando borrador:',e);return false;}
}

function initTabs(){
  tabs=[];
  try{
    const raw=localStorage.getItem(TABS_KEY);
    if(raw){
      const p=JSON.parse(raw);
      if(p&&Array.isArray(p.tabs)&&p.savedAt&&(Date.now()-p.savedAt)<=DRAFT_MAX_AGE_MS){
        tabs=p.tabs.filter(t=>t&&t.id&&t.state&&t.state.form).slice(0,MAX_TABS);
        if(tabs.length){
          activeTabId=tabs.some(t=>t.id===p.activeId)?p.activeId:tabs[0].id;
          const act=tabs.find(t=>t.id===activeTabId);
          applyTabState(act.state);
          editingLoteId=act.editLoteId||null;
        }
      }else{localStorage.removeItem(TABS_KEY);}
    }
  }catch(e){console.error('Error restaurando pestañas:',e);tabs=[];}
  if(!tabs.length){
    const migrated=restoreDraftIfAny();
    tabs=[{id:newTabId(),state:captureTabState(),editLoteId:editingLoteId,generated:false}];
    activeTabId=tabs[0].id;
    if(migrated){try{localStorage.removeItem(DRAFT_KEY);}catch(e){}}
  }
  updateBtnAgregarLoteLabel();
  tabsReady=true;
  const live=backupForm();
  const conDatos=tabs.filter(t=>tabFormStatus(t.id===activeTabId?live:t.state.form)!=='empty').length;
  renderTabs();
  return conDatos;
}

// Cualquier cambio (escribir, GPS, OCR…) se guarda solo; la pestaña activa se actualiza en vivo
document.addEventListener('input',e=>{
  if(!tabsReady)return;
  const t=tabs.find(x=>x.id===activeTabId);
  if(t&&t.generated&&!(e.target.closest&&e.target.closest('.tabs-panel')))t.generated=false;
  scheduleDraftSave();renderTabsSoon();
});
document.addEventListener('change',()=>{if(tabsReady){scheduleDraftSave();renderTabsSoon();}});
setInterval(()=>{
  if(!tabsReady)return;
  const sig=JSON.stringify(backupForm())+'|'+activeTabId+'|'+tabs.length;
  if(sig!==_lastSig){_lastSig=sig;scheduleDraftSave();}
},2000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&tabsReady){clearTimeout(draftSaveTimer);saveTabs();}
});
window.addEventListener('pagehide',()=>{if(tabsReady)saveTabs();});

// ── MOTIVO: selector con opciones + "Otro" ─────────────
function syncMotivoUI(){
  const sel=document.getElementById('motivo_sel'),inp=document.getElementById('motivo');
  if(!sel||!inp)return;
  const val=inp.value.trim();
  if(!val){sel.value='';inp.style.display='none';return;}
  if(MOTIVOS.includes(val)){sel.value=val;inp.style.display='none';}
  else{sel.value='__otro';inp.style.display='block';}
}
function motivoSelChange(){
  const sel=document.getElementById('motivo_sel'),inp=document.getElementById('motivo');
  if(sel.value==='__otro'){inp.value='';inp.style.display='block';inp.focus();}
  else{inp.value=sel.value;inp.style.display='none';}
  inp.dispatchEvent(new Event('input',{bubbles:true}));
}

// ── VISTA PREVIA ────────────────────────────────────────
function verPreview(){
  const txt=document.getElementById('output-text').value;
  if(!txt)return;
  // Convertir *negritas* a <b> para simular WhatsApp
  const html=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*([^*\n]+)\*/g,'<b>$1</b>');
  document.getElementById('preview-bubble').innerHTML=html;
  document.getElementById('preview-modal').style.display='block';
  document.body.style.overflow='hidden';
}
function cerrarPreview(){
  document.getElementById('preview-modal').style.display='none';
  document.body.style.overflow='';
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

window.onload=()=>{
  initDT();loadTheme();loadCompact();updateClock();checkGenerateReady();hideSplash();updateConnIndicator();
  updateGoogleKeyUI();
  const loteCount=restoreLoteIfAny();
  const nTabs=initTabs();
  if(loteCount&&nTabs)showToast(`📦 Lote recuperado (${loteCount}) y ${nTabs} pestaña(s) en progreso`);
  else if(loteCount)showToast(`📦 Se recuperó tu lote (${loteCount} empadronamiento(s))`);
  else if(nTabs)showToast(`📋 Se recuperaron ${nTabs} pestaña(s) en progreso`);
};

// ── REGISTRAR SERVICE WORKER (PWA offline) ─────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js')
      .then(()=>console.log('Service Worker registrado — app funcionará offline'))
      .catch(err=>console.log('SW no disponible (normal si se abre como archivo local):',err.message));
  });
}

// ── INSTALAR PWA ────────────────────────────────────────
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  const banner=document.getElementById('install-banner');
  if(banner)banner.style.display='flex';
});
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('btn-install');
  if(btn)btn.addEventListener('click',async()=>{
    if(!deferredInstallPrompt)return;
    deferredInstallPrompt.prompt();
    const{outcome}=await deferredInstallPrompt.userChoice;
    if(outcome==='accepted'){
      document.getElementById('install-banner').style.display='none';
      showToast('✅ App instalada correctamente');
    }
    deferredInstallPrompt=null;
  });
});
window.addEventListener('appinstalled',()=>{
  const banner=document.getElementById('install-banner');
  if(banner)banner.style.display='none';
});

// ── INDICADOR DE CONEXIÓN ───────────────────────────────
function updateConnIndicator(){
  const ind=document.getElementById('conn-indicator');
  if(!ind)return;
  if(navigator.onLine){
    ind.style.background='var(--green)';
    ind.style.boxShadow='0 0 8px var(--green)';
    ind.title='En línea — OCR y GPS disponibles';
  } else {
    ind.style.background='var(--danger)';
    ind.style.boxShadow='0 0 8px var(--danger)';
    ind.title='Sin conexión — OCR y dirección por GPS no disponibles';
  }
}
window.addEventListener('online',()=>{updateConnIndicator();showToast('🌐 Conexión restaurada');});
window.addEventListener('offline',()=>{updateConnIndicator();showToast('⚠️ Sin conexión a internet');});
