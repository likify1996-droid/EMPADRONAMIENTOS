// Formulario: validación, campos calculados, limpiar, datos del policía, fecha y hora.
// Parte de la app; se carga en el orden de index.html.

// ── SUBCATEGORÍAS ──────────────────────────────────────
function updateSubcat(){
  const cat=document.getElementById('categoria').value;
  const sub=document.getElementById('subcategoria');
  sub.innerHTML='<option value="">-- Seleccionar --</option>';
  (SUBCATS[cat]||[]).forEach(s=>{const o=document.createElement('option');o.textContent=s;sub.appendChild(o);});
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
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';ocultarTipoDetectado();
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
    vehiculo:['tipo_vehiculo','tipo_vehiculo_search','marca','submarca','modelo','anio','color','placas','estado_placas','serie','motor','niv','observaciones']
  };
  const selects={
    servicio:['categoria','subcategoria'],
    persona:['vulnerable','sexo','estado_civil','escolaridad'],
    tatuajes:[],
    vehiculo:['documentacion']
  };
  (maps[sec]||[]).forEach(id=>{const el=document.getElementById(id);if(el){el.value=id==='tatuajes_cant'?'0':'';el.classList.remove('filled');}});
  (selects[sec]||[]).forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  if(sec==='persona'){
    document.getElementById('fotos_perfil').value='';
    document.getElementById('fotos_si').style.opacity='1';
    document.getElementById('fotos_no').style.opacity='1';
    document.getElementById('escolaridad_extra').style.display='none';
    // Solo lo de la persona: antes también borraba las características del vehículo
    negativasActivas=[];obsManualPersona='';
    document.querySelectorAll('.neg-btn.neg-active').forEach(b=>b.classList.remove('neg-active'));
  }
  if(sec==='vehiculo'){
    caracActivas=[];obsManualVeh='';
    document.querySelectorAll('.carac-btn.neg-active').forEach(b=>b.classList.remove('neg-active'));
    ocultarTipoDetectado();
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
    {id:'subcategoria',label:'Subcategoría'},
    {id:'nacimiento',label:'Fecha de Nacimiento'},
    {id:'edad',label:'Edad'},
    {id:'domicilio',label:'Domicilio de la persona'},
    {id:'oficio',label:'Oficio / Profesión'},
    {id:'motivo',label:'Motivo del empadronamiento'},
  ];
  if(v('subcategoria')==='Otro')reqs.push({id:'otro_subcat',label:'Especificar subcategoría'});
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
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';ocultarTipoDetectado();
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

// ── FECHA, HORA Y RELOJ ─────────────────────────────────
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
// El reloj solo corre con la app en pantalla: en segundo plano no gasta batería
let _relojId=null;
function iniciarReloj(){if(_relojId===null){updateClock();_relojId=setInterval(updateClock,1000);}}
function detenerReloj(){clearInterval(_relojId);_relojId=null;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)detenerReloj();else iniciarReloj();});
iniciarReloj();

// ── INDICADORES DEL FORMULARIO (listo, progreso, botón flotante) ──
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
  const reqs=['nombre_pol','zona','ne','nombre','categoria','subcategoria','nacimiento','edad','domicilio','oficio','motivo'];
  if(v('subcategoria')==='Otro')reqs.push('otro_subcat');
  reqs.forEach(validateField);
  const allFilled=reqs.every(id=>{const el=document.getElementById(id);return el&&el.value.trim();});
  const addrOk=document.getElementById('addr_texto').value.trim()||(document.getElementById('addr_calle').value.trim()&&document.getElementById('addr_cruce').value.trim());
  const btn=document.getElementById('btn-generar');
  if(btn){
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
// Los indicadores (botón listo, progreso, botón flotante) se recalculan al
// escribir o cuando la app llena campos sola, no cada segundo.
let _refrescoT=null;
function programarRefresco(){
  clearTimeout(_refrescoT);
  _refrescoT=setTimeout(()=>{checkGenerateReady();updateProgress();handleFAB();},150);
}
document.addEventListener('input',programarRefresco);
document.addEventListener('change',programarRefresco);

// FAB: mostrar al hacer scroll, ocultar cuando el botón principal es visible
function handleFAB(){
  const mainBtn=document.getElementById('btn-generar');
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
  programarRefresco();
}
function ofrecerDeshacer(){
  const t=document.getElementById('toast');
  t.textContent='🗑 Formulario limpiado';
  const b=document.createElement('button');
  b.className='toast-btn';
  b.dataset.action='deshacerLimpiar';
  b.textContent='↩ DESHACER';
  t.appendChild(b);
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

// ── MOTIVO: selector con opciones + "Otro" ─────────────
function syncMotivoUI(){
  const sel=document.getElementById('motivo_sel'),inp=document.getElementById('motivo');
  if(!sel||!inp)return;
  const val=inp.value.trim();
  if(!val){sel.value='';inp.style.display='none';return;}
  if(MOTIVOS.some(m=>m.texto===val)){sel.value=val;inp.style.display='none';}
  else{sel.value='__otro';inp.style.display='block';}
}
function motivoSelChange(){
  const sel=document.getElementById('motivo_sel'),inp=document.getElementById('motivo');
  if(sel.value==='__otro'){inp.value='';inp.style.display='block';inp.focus();}
  else{inp.value=sel.value;inp.style.display='none';}
  if(/^Sospecha razonable/.test(sel.value))showToast('📝 Anota en Datos adicionales qué hechos concretos observaste',4500);
  inp.dispatchEvent(new Event('input',{bubbles:true}));
}

// ── MOTIVO: opciones desde el catálogo ─────────────────
function renderMotivos(){
  const sel=document.getElementById('motivo_sel');
  sel.innerHTML='';
  const add=(value,text,title)=>{const o=document.createElement('option');o.value=value;o.textContent=text;if(title)o.title=title;sel.appendChild(o);};
  add('','-- Seleccionar --');
  MOTIVOS.forEach(m=>add(m.texto,m.texto,m.fundamento));
  add('__otro','Otro (especificar)…');
}
