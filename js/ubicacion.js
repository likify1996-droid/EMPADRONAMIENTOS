// Ubicación: GPS, mapa, búsqueda de direcciones (Google/Nominatim) y cruce de calles.
// Parte de la app; se carga en el orden de index.html.

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
    if(acc<=10)return'<span class="txt-ok">▂▄▆█ Excelente</span>';
    if(acc<=20)return'<span class="txt-ok">▂▄▆░ Buena</span>';
    if(acc<=50)return'<span class="txt-warn">▂▄░░ Regular</span>';
    if(acc<=100)return'<span class="txt-warn">▂▄░░ Aceptable</span>';
    return'<span class="txt-danger">▂░░░ Aproximada</span>';
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
    if(err.code===1){st.innerHTML='<span class="txt-danger">❌ Permiso de ubicación denegado. Actívalo en ajustes del navegador.</span>';}
    else if(err.code===2){st.innerHTML='<span class="txt-danger">❌ Posición no disponible. Sal a cielo abierto e intenta de nuevo.</span>';}
    else if(err.code===3){st.innerHTML='<span class="txt-warn">⏱ GPS lento. Intentando con menor precisión...</span>';fallbackLowAccuracy();}
    else st.innerHTML='<span class="txt-danger">❌ Error de GPS. Intenta de nuevo.</span>';
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
      else st.innerHTML='<span class="txt-danger">❌ No se pudo obtener ubicación. Verifica que el GPS esté activado.</span>';
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

// Nominatim permite máximo 1 petición por segundo y bloquea a quien se pasa.
// Todas las consultas pasan por aquí y se forman en fila con 1.1 s entre
// cada una. Si la consulta ya no sirve (el usuario siguió escribiendo),
// vigente() devuelve false y se salta sin gastar el turno.
let _nominatimCola=Promise.resolve(),_nominatimUltima=0;
function nominatimFetch(url,vigente){
  const turno=_nominatimCola.then(async()=>{
    if(vigente&&!vigente())throw new Error('consulta descartada');
    const espera=_nominatimUltima+1100-Date.now();
    if(espera>0)await sleep(espera);
    if(vigente&&!vigente())throw new Error('consulta descartada');
    _nominatimUltima=Date.now();
    return fetch(url);
  });
  _nominatimCola=turno.catch(()=>{});
  return turno;
}

// Busca la calle que cruza (perpendicular) a la calle dada, alrededor de un punto.
// Devuelve true si encontró una. Respeta el límite de ~1 petición/seg de Nominatim.
async function detectarCruceEn(lat,lon,calle,statusElId){
  let found=false;
  try{
    const probeRoad=async(dlat,dlon)=>{
      try{
        const r2=await nominatimFetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat+dlat}&lon=${lon+dlon}&format=json&accept-language=es`);
        if(!r2.ok)return '';
        const d2=await r2.json();
        return d2.address?.road||d2.address?.pedestrian||d2.address?.footway||'';
      }catch(e){return '';}
    };
    const D=0.00035;
    // Sondeo al norte: si sigue siendo la misma calle, corre Norte-Sur (el cruce
    // está al Este/Oeste); si cambia, corre Este-Oeste (el cruce está al Norte/Sur)
    const rNorte=await probeRoad(D,0);
    const corrVertical=rNorte&&rNorte===calle;
    const offsets=corrVertical
      ? [[0,D],[0,-D],[D,D],[D,-D],[-D,D],[-D,-D]]
      : [[D,0],[-D,0],[D,D],[D,-D],[-D,D],[-D,-D]];
    const calles=new Set();
    for(const[dlat,dlon] of offsets){
      const c2=await probeRoad(dlat,dlon);
      if(c2&&c2!==calle)calles.add(c2);
      if(calles.size>0)break;
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
      if(geoSt)geoSt.innerHTML+='<br><span class="txt-danger txt-sm">⚠️ Cruce no detectado — escríbelo manualmente</span>';
    }
  }catch(e){}
  return found;
}

async function fetchAddress(lat, lon, acc, statusElId){
  statusElId=statusElId||'geo-status';
  const st=document.getElementById(statusElId);
  try{
    // Nominatim — calle, CP, municipio
    const r=await nominatimFetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`);
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
      st.innerHTML='<span class="txt-warn">⚠️ No se encontraron datos de dirección para este punto exacto. Ajusta el pin o escribe manualmente.</span>';
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
async function nominatimSearch(query,vigente){
  const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query+', Nuevo León, México')}&format=json&limit=6&accept-language=es&countrycodes=mx&viewbox=-100.65,25.95,-99.95,25.40&bounded=0`;
  const r=await nominatimFetch(url,vigente);
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
    e.className='sug-error';
    e.textContent='⚠️ '+errorMsg+' — mostrando resultados básicos';
    sugg.appendChild(e);
  }
  items.forEach(it=>{
    const d=document.createElement('div');
    d.className='sv-item sug-item';
    const m=document.createElement('div');
    m.className='sug-main';m.textContent='📍 '+it.main;
    d.appendChild(m);
    if(it.secondary){
      const s=document.createElement('div');
      s.className='sug-sec';
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
    if(!items){try{items=await nominatimSearch(query,()=>seq===_domSeq);}catch(e){items=[];}}
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
    if(!items){try{items=await nominatimSearch(query,()=>seq===_lugarSeq);}catch(e){items=[];}}
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
