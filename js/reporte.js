// Reporte: texto para WhatsApp, lote, copiar y vista previa.
// Parte de la app; se carga en el orden de index.html.

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
  if(!validar()||!confirmarRevisiones())return;
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
  try{
    if(loteEmpadronamientos.length)localStorage.setItem(LOTE_KEY,JSON.stringify({data:loteEmpadronamientos,savedAt:Date.now()}));
    else localStorage.removeItem(LOTE_KEY);
  }catch(e){}
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
  if(!validar()||!confirmarRevisiones())return;
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
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';ocultarTipoDetectado();
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
  lista.innerHTML='';
  if(loteEmpadronamientos.length===0){
    const p=document.createElement('p');
    p.className='lote-vacio';
    p.textContent='No hay empadronamientos en el lote todavía.';
    lista.appendChild(p);
  }
  loteEmpadronamientos.forEach((item,idx)=>{
    const editando=item.id===editingLoteId;
    const row=document.createElement('div');
    row.className='lote-item'+(editando?' editando':'');
    const info=document.createElement('div');
    const nom=document.createElement('div');
    nom.className='lote-item-nombre';
    nom.textContent=`#${item.numEmp} — ${item.nombre}`;
    if(editando){
      const tag=document.createElement('span');
      tag.className='lote-item-editando';
      tag.textContent=' (editando)';
      nom.appendChild(tag);
    }
    const num=document.createElement('div');
    num.className='lote-item-num';
    num.textContent=`Empadronamiento ${idx+1} de ${loteEmpadronamientos.length}`;
    info.append(nom,num);
    const btns=document.createElement('div');
    btns.className='lote-item-btns';
    [['👁','ver','verUnoLote'],['✏️','editar','editarLote'],['🗑','borrar','eliminarDelLote']].forEach(([txt,cls,fn])=>{
      const b=document.createElement('button');
      b.className='lote-btn lote-btn--'+cls;
      b.textContent=txt;
      b.dataset.action=fn;
      b.dataset.args=JSON.stringify([item.id]);
      btns.appendChild(b);
    });
    row.append(info,btns);
    lista.appendChild(row);
  });
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

function textoLote(){
  return loteEmpadronamientos.map(i=>i.texto).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
}
function copiarTodoLote(){
  if(loteEmpadronamientos.length===0){
    showToast('⚠️ El lote está vacío');
    return;
  }
  const textoCompleto=textoLote();
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

// ── ENVIAR POR WHATSAPP ─────────────────────────────────
// En el teléfono abre el menú de compartir (WhatsApp, grupo, Telegram…);
// si el navegador no lo tiene, abre WhatsApp con el texto ya escrito.
async function compartirTexto(texto){
  if(!texto){showToast('⚠️ No hay reporte para enviar');return;}
  if(navigator.share){
    try{await navigator.share({text:texto});return;}
    catch(e){if(e.name==='AbortError')return;}
  }
  window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank');
}
function enviarReporte(){compartirTexto(document.getElementById('output-text').value);}
function enviarLote(){
  if(!loteEmpadronamientos.length){showToast('⚠️ El lote está vacío');return;}
  compartirTexto(textoLote());
}

// ── LOTE EN PDF ─────────────────────────────────────────
// Arma una hoja con todos los reportes y abre "Imprimir"; en el teléfono se
// elige "Guardar como PDF". La hoja se borra al terminar.
function imprimirLote(){
  if(!loteEmpadronamientos.length){showToast('⚠️ El lote está vacío');return;}
  const hoja=document.getElementById('impresion');
  hoja.innerHTML='';
  const h=document.createElement('h1');
  h.textContent='Fuerza Civil — Lote de empadronamientos';
  const sub=document.createElement('p');
  sub.className='imp-sub';
  const ahora=new Date();
  sub.textContent=`${v('nombre_pol')||''}${v('ne')?' · N.E. '+v('ne'):''} · ${ahora.toLocaleDateString('es-MX')} ${ahora.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})} · ${loteEmpadronamientos.length} empadronamiento(s)`;
  hoja.append(h,sub);
  loteEmpadronamientos.forEach(item=>{
    const div=document.createElement('div');
    div.className='imp-item';
    // *negritas* de WhatsApp → negritas en papel
    item.texto.split(/(\*[^*\n]+\*)/).forEach(parte=>{
      if(/^\*[^*\n]+\*$/.test(parte)){const b=document.createElement('b');b.textContent=parte.slice(1,-1);div.appendChild(b);}
      else div.appendChild(document.createTextNode(parte));
    });
    hoja.appendChild(div);
  });
  cerrarPanelLote();
  setTimeout(()=>window.print(),100);
}
window.addEventListener('afterprint',()=>{document.getElementById('impresion').innerHTML='';});
