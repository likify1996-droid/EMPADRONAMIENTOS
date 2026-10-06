// Pestañas y autoguardado en el teléfono.
// Parte de la app; se carga en el orden de index.html.

// ── PESTAÑAS + AUTOGUARDADO ─────────────────────────────
// Hasta 5 empadronamientos en paralelo. Todo se guarda en localStorage
// (sobrevive a que Android mate la pestaña o cierres la app) y se borra
// solo a las 12 horas para no dejar datos de personas acumulados.
const DRAFT_KEY='fc_draft_v1';          // formato anterior (solo para migrar)
const TABS_KEY='fc_tabs_v1';
const DRAFT_MAX_AGE_MS=12*60*60*1000;   // 12 horas
const MAX_TABS=5;
const TAB_REQ=['nombre_pol','zona','ne','nombre','categoria','subcategoria','nacimiento','edad','domicilio','oficio','motivo'];
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
  if(id==='categoria'||id==='subcategoria')return form['sel_'+id]>0?'x':'';
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
  negativasActivas=[];caracActivas=[];obsManualPersona='';obsManualVeh='';ocultarTipoDetectado();
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
  document.querySelectorAll('[data-action="toggleNegativa"],[data-action="toggleCarac"]').forEach(btn=>{
    let texto='';
    try{texto=JSON.parse(btn.dataset.args)[1];}catch(e){return;}
    const list=btn.dataset.action==='toggleNegativa'?negativasActivas:caracActivas;
    btn.classList.toggle('neg-active',list.includes(texto));
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
  reiniciarPestanas();
  showToast('🧹 Pestañas cerradas — turno limpio');
}
// Deja una sola pestaña en blanco (conserva los datos del policía)
function reiniciarPestanas(){
  const f=buildNewTabForm(backupForm(),false);
  const t={id:newTabId(),state:{form:f,neg:[],carac:[],obsP:'',obsV:''},editLoteId:null,generated:false};
  tabs=[t];activeTabId=t.id;
  applyTabState(t.state);editingLoteId=null;updateBtnAgregarLoteLabel();initDT();
  t.state=captureTabState();
  saveTabs();renderTabs(true);
}

// Fin de turno completo: borra de este teléfono pestañas, lote, fotos
// pendientes y el último reporte. Solo quedan los datos del policía.
function terminarTurno(){
  syncActiveTab();
  const pend=tabs.filter(t=>tabFormStatus(t.state.form)!=='empty'&&!t.generated).length;
  const nLote=loteEmpadronamientos.length,nOcr=leerColaOcr().length;
  const partes=[];
  if(pend)partes.push(`${pend} pestaña(s) sin generar`);
  if(nLote)partes.push(`${nLote} empadronamiento(s) en el lote`);
  if(nOcr)partes.push(`${nOcr} foto(s) por leer`);
  const msg='¿Terminar turno?\n\nSe borrará de este teléfono todo lo capturado'+(partes.length?':\n• '+partes.join('\n• '):'.')+'\n\nSe conservan tus datos de policía (nombre, N.E., zona y CRP).';
  if(!confirm(msg))return;
  loteEmpadronamientos=[];saveLote();actualizarBarraLote();
  guardarColaOcr([]);actualizarAvisoOcr();
  undoBackup=null;
  try{localStorage.removeItem(DRAFT_KEY);}catch(e){}
  reiniciarPestanas();
  document.getElementById('output-text').value='';
  document.getElementById('output-box').style.display='none';
  document.getElementById('ocr-preview').style.display='none';
  document.getElementById('ocr-preview-img').removeAttribute('src');
  document.getElementById('ocr-summary').style.display='none';
  document.getElementById('img-quality').style.display='none';
  document.getElementById('scan-status').textContent='';
  window.scrollTo({top:0,behavior:'smooth'});
  showToast('🔒 Turno terminado — se borró lo capturado en este teléfono',3200);
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
// Red de seguridad para cambios que no disparan eventos (GPS, OCR, mapa):
// cada 4 s, y solo con la app en pantalla, compara el formulario completo.
setInterval(()=>{
  if(!tabsReady||document.hidden)return;
  const sig=JSON.stringify(backupForm())+'|'+activeTabId+'|'+tabs.length;
  if(sig!==_lastSig){_lastSig=sig;scheduleDraftSave();programarRefresco();}
},4000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&tabsReady){clearTimeout(draftSaveTimer);saveTabs();}
});
window.addEventListener('pagehide',()=>{if(tabsReady)saveTabs();});
