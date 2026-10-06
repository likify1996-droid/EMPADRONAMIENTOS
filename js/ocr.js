// OCR: cámara, galería, CURP, envío al Worker de Groq y fotos pendientes sin señal.
// Parte de la app; se carga en el orden de index.html.

// ── OCR CON CÁMARA ─────────────────────────────────────
let ocrStream=null;

async function startOCR(){
  const status=document.getElementById('scan-status');
  const cont=document.getElementById('ocr-container');
  try{
    // Más resolución que antes: con el recorte al marco, la credencial sigue
    // teniendo suficientes pixeles para leer el CURP
    ocrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}}});
    document.getElementById('ocr-video').srcObject=ocrStream;
    document.getElementById('ocr-video').play();
    ocrZoom=1;ocrZoomCss=1;
    ocrTrack=ocrStream.getVideoTracks()[0]||null;
    document.getElementById('ocr-video').style.transform='scale(1)';
    cont.style.display='block';
    actualizarMarcoUI();
    iniciarAutoCaptura();
    status.textContent=marcoActivo()?'📸 Coloca la credencial dentro del marco — usa + / − para zoom':'📸 Enfoca el documento — usa + / − para zoom';
  }catch(e){
    status.textContent='❌ Sin acceso a la cámara. Verifica permisos.';
  }
}

function stopOCR(){
  detenerAutoCaptura();
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
  if(brightness<50){qi.innerHTML='⚠️ <span class="txt-warn">Imagen muy oscura — mejora la iluminación</span>';return false;}
  if(brightness>220){qi.innerHTML='⚠️ <span class="txt-warn">Imagen sobreexpuesta — reduce la luz</span>';return false;}
  // Reflejo y nitidez sobre una copia chica (ver js/imagen.js)
  const gris=grisReducido(canvas);
  if(fraccionReflejo(gris)>REFLEJO_MAX){qi.innerHTML='⚠️ <span class="txt-warn">Hay reflejo: inclina un poco la credencial o apaga la linterna</span>';return false;}
  if(variance<200||nitidez(gris)<NITIDEZ_BORROSA){qi.innerHTML='⚠️ <span class="txt-warn">Imagen borrosa — enfoca el documento</span>';return false;}
  qi.innerHTML='✅ <span class="txt-ok">Calidad de imagen buena</span>';
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
// Modelos de visión de Groq, en orden de preferencia. Si Groq retira uno,
// la app pasa solo al siguiente; revisa console.groq.com/docs/models de vez
// en cuando y actualiza esta lista (y MODELOS_PERMITIDOS en el Worker).
const OCR_MODELOS=['qwen/qwen3.6-27b','meta-llama/llama-4-maverick-17b-128e-instruct','qwen/qwen3.8-27b'];
// Tamaño de la foto que se envía: suficiente para leer el CURP sin gastar
// datos de más con señal mala.
const OCR_MAX_LADO=1600,OCR_CALIDAD_JPEG=0.9;
// Los modelos de visión leen mejor la foto a color y sin contraste forzado
// (el contraste convertía los reflejos en manchas blancas). El modo gris se
// deja como opción para comparar en campo (botón en la sección de escaneo).
const OCR_MODO_KEY='fc_ocr_modo';
function ocrEnGris(){try{return localStorage.getItem(OCR_MODO_KEY)==='gris';}catch(e){return false;}}
function toggleModoOcr(){
  const gris=!ocrEnGris();
  try{localStorage.setItem(OCR_MODO_KEY,gris?'gris':'color');}catch(e){}
  actualizarModoOcrUI();
  showToast(gris?'⚫ Se enviará en blanco y negro con contraste':'🎨 Se enviará la foto a color',2600);
}
function actualizarModoOcrUI(){
  const b=document.getElementById('modo-ocr-btn');
  if(b)b.textContent=ocrEnGris()?'⚫ Lectura: B/N con contraste':'🎨 Lectura: a color';
}
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

// Reduce la foto, la pasa a gris con contraste y la convierte a JPEG base64
function canvasParaOCR(canvas){
  let src=canvas;
  const lado=Math.max(canvas.width,canvas.height);
  if(lado>OCR_MAX_LADO){
    const k=OCR_MAX_LADO/lado;
    src=document.createElement('canvas');
    src.width=Math.round(canvas.width*k);src.height=Math.round(canvas.height*k);
    src.getContext('2d').drawImage(canvas,0,0,src.width,src.height);
  }
  if(ocrEnGris())src=preprocessCanvas(src);
  return src.toDataURL('image/jpeg',OCR_CALIDAD_JPEG).split(',')[1];
}
function esErrorDeRed(e){return /^(Sin conexión|Tiempo agotado)/.test(e&&e.message||'');}

// ── DOCUMENTOS PENDIENTES (SIN SEÑAL) ──────────────────
// Si no hay internet, la foto ya procesada se guarda y se lee después con
// "Leer ahora". Se borra con "Terminar turno" o a las 12 horas.
const OCR_COLA_KEY='fc_ocr_pendientes_v1',OCR_COLA_MAX=4;
function leerColaOcr(){
  try{
    const c=JSON.parse(localStorage.getItem(OCR_COLA_KEY)||'[]');
    const vivos=c.filter(x=>x&&x.b64&&Date.now()-x.ts<=DRAFT_MAX_AGE_MS);
    if(vivos.length!==c.length)guardarColaOcr(vivos);
    return vivos;
  }catch(e){return[];}
}
function guardarColaOcr(c){
  try{
    if(c.length)localStorage.setItem(OCR_COLA_KEY,JSON.stringify(c));
    else localStorage.removeItem(OCR_COLA_KEY);
    return true;
  }catch(e){return false;}
}
function encolarOcr(b64){
  const c=leerColaOcr();
  if(c.length>=OCR_COLA_MAX){showToast(`⚠️ Ya hay ${OCR_COLA_MAX} documentos esperando señal — léelos o bórralos primero`,3500);return false;}
  c.push({b64,ts:Date.now(),tabId:activeTabId});
  if(!guardarColaOcr(c)){showToast('⚠️ No hay espacio en el teléfono para guardar la foto',3500);return false;}
  actualizarAvisoOcr();
  return true;
}
function actualizarAvisoOcr(){
  const n=leerColaOcr().length;
  const box=document.getElementById('ocr-pendientes');
  if(!box)return;
  box.style.display=n?'flex':'none';
  document.getElementById('ocr-pendientes-txt').textContent=`📥 ${n} documento(s) por leer cuando haya señal`;
}
async function procesarOcrPendientes(){
  if(!navigator.onLine){showToast('⚠️ Todavía no hay conexión');return;}
  const cola=leerColaOcr();
  if(!cola.length){actualizarAvisoOcr();return;}
  const status=document.getElementById('scan-status');
  let ok=0;
  for(const item of cola){
    // Cada foto se llena en la pestaña donde se tomó, si sigue abierta
    if(item.tabId&&item.tabId!==activeTabId&&tabs.some(t=>t.id===item.tabId))switchTab(item.tabId);
    status.textContent=`🔍 Leyendo documento pendiente ${ok+1} de ${cola.length}...`;
    try{
      const obj=await leerDocumento(item.b64);
      fillOCRFields(obj,{sinPreguntar:true});
      ok++;
      guardarColaOcr(leerColaOcr().filter(x=>x.ts!==item.ts));
    }catch(e){
      status.textContent='❌ '+e.message;
      break;
    }
  }
  actualizarAvisoOcr();
  if(ok)showToast(`✅ ${ok} documento(s) leído(s) — revisa los campos verdes`,3000);
}
function descartarOcrPendientes(){
  if(!confirm('¿Borrar las fotos de documentos pendientes de leer?'))return;
  guardarColaOcr([]);
  actualizarAvisoOcr();
}

// Toma varias fotos seguidas y deja en el canvas la más nítida (la mano se
// mueve y el enfoque tarda: casi siempre alguna sale mejor que la primera)
const RAFAGA_FOTOS=5,RAFAGA_PAUSA_MS=90;
async function mejorCuadro(video,canvas){
  const region=marcoActivo()?recorteDelMarco(video):null;
  let mejor=-1;
  const tmp=document.createElement('canvas');
  tmp.width=video.videoWidth;tmp.height=video.videoHeight;
  for(let i=0;i<RAFAGA_FOTOS;i++){
    if(i)await new Promise(r=>setTimeout(r,RAFAGA_PAUSA_MS));
    tmp.getContext('2d').drawImage(video,0,0);
    const n=nitidez(grisReducido(tmp,region));
    if(n>mejor){
      mejor=n;
      canvas.width=tmp.width;canvas.height=tmp.height;
      canvas.getContext('2d').drawImage(tmp,0,0);
    }
  }
  return mejor;
}

async function captureOCR(){
  if(_capturando)return;
  _capturando=true;
  try{await capturarYLeer();}finally{_capturando=false;}
}
let _capturando=false;
async function capturarYLeer(){
  const status=document.getElementById('scan-status');
  const video=document.getElementById('ocr-video');
  const canvas=document.getElementById('ocr-canvas');
  status.textContent='📸 Tomando la foto más nítida...';
  await mejorCuadro(video,canvas);
  // La foto completa se guarda en el teléfono; a la IA va solo el marco
  savePhotoToDevice(canvas);
  if(marcoActivo()){
    const r=recorteDelMarco(video);
    const tmp=document.createElement('canvas');
    tmp.width=Math.round(r.w);tmp.height=Math.round(r.h);
    tmp.getContext('2d').drawImage(canvas,r.x,r.y,r.w,r.h,0,0,tmp.width,tmp.height);
    canvas.width=tmp.width;canvas.height=tmp.height;
    canvas.getContext('2d').drawImage(tmp,0,0);
  }
  stopOCR();
  document.getElementById('ocr-summary').style.display='none';
  showPreview(canvas);
  checkImageQuality(canvas);
  const base64=canvasParaOCR(canvas);
  if(!navigator.onLine){
    if(encolarOcr(base64))status.textContent='📥 Sin conexión: la foto se guardó y se leerá cuando vuelva la señal.';
    document.getElementById('btn-releer').style.display='inline-flex';
    return;
  }
  setProgress(10);
  status.textContent='🔍 Analizando documento con IA...';
  try{
    const obj=await leerDocumento(base64);
    setProgress(90);
    fillOCRFields(obj);
  }catch(e){
    setProgress(0);
    if(esErrorDeRed(e)&&encolarOcr(base64)){
      status.textContent='📥 La señal falló: la foto se guardó y se leerá cuando vuelva.';
    }else{
      status.textContent='❌ '+e.message;
    }
    console.error('captureOCR error:',e);
  }
  document.getElementById('btn-releer').style.display='inline-flex';
}

// ── REINTENTO AUTOMÁTICO ───────────────────────────────
// Lee el documento y, si la lectura no cuadra (CURP con dígito verificador
// incorrecto, CURP que no corresponde al nombre, NIV o código del reverso
// inválidos), lo vuelve a leer con otro modelo diciéndole qué revisar, y se
// queda con la lectura que tenga menos errores. Solo gasta una consulta
// extra cuando hay error.
async function leerDocumento(base64){
  const r1=await callGroqWithRetry(base64);
  const prob=problemasLectura(r1);
  if(!prob.length)return r1;
  const status=document.getElementById('scan-status');
  status.textContent='🔁 La lectura no cuadra: revisándola con otro modelo...';
  const extra=`\n\nIMPORTANTE: otra lectura de esta misma imagen tuvo errores: ${prob.join('; ')}. Vuelve a leer con mucho cuidado carácter por carácter.`;
  try{
    const r2=await callGroqWithRetry(base64,{extra,desde:1});
    const mejor=mejorLectura(r1,r2);
    mejor._segundaLectura=true;
    return mejor;
  }catch(e){
    console.warn('Segunda lectura falló:',e.message);
    return r1;
  }
}

async function callGroqWithRetry(base64,opts){
  opts=opts||{};
  // Con "desde" se empieza por otro modelo (para la segunda lectura)
  const d=(opts.desde||0)%OCR_MODELOS.length;
  const modelos=OCR_MODELOS.slice(d).concat(OCR_MODELOS.slice(0,d));
  let lastErr,clavePedida=false;
  for(let i=0;i<modelos.length;i++){
    const modelo=modelos[i];
    try{
      if(i>0){
        const status=document.getElementById('scan-status');
        status.textContent=`🔄 Probando modelo alternativo (${i+1}/${modelos.length})...`;
        await new Promise(r=>setTimeout(r,800));
      }
      return await callGroq(base64,modelo,opts.extra);
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
          return await callGroq(base64,modelo,opts.extra);
        }catch(e2){lastErr=e2;}
      }
    }
  }
  throw lastErr;
}

async function callGroq(base64,modelName,extra){
  modelName=modelName||'qwen/qwen3.6-27b';
  const status=document.getElementById('scan-status');
  const prompt=`Eres un sistema OCR especializado en documentos mexicanos. Analiza la imagen y extrae SOLO los datos visibles.
Responde SOLO con este JSON, sin texto adicional, sin markdown, sin comentarios:
{"tipo":"","nombre_impreso":"","nombres":"","apellido_paterno":"","apellido_materno":"","curp":"","mrz":"","fecha_nac":"","sexo":"","domicilio":"","cod_estado":"","num_estado":"","menor":false,"licencia_tipo":"","licencia_estado":"","licencia_folio":"","licencia_vigencia":"","tipo_vehiculo":"","marca":"","submarca":"","anio":"","placas":"","estado_placas":"","serie":"","motor":""}
- tipo: "ine" (frente de la credencial para votar INE/IFE), "ine_reverso" (reverso de la INE), "licencia" (licencia de conducir de cualquier estado), "pasaporte", "otro" (otra identificación con datos de una persona) o "circulacion" (tarjeta de circulación de un vehículo)
- mrz: si hay renglones de código de lectura mecánica (en el reverso de la INE empiezan con IDMEX; en pasaportes con P<MEX), cópialos EXACTOS, cada renglón separado por \\n, con todos los signos < (cada renglón de la INE tiene 30 caracteres)
- nombre_impreso: el nombre completo copiado en el MISMO orden en que está impreso, de arriba a abajo y de izquierda a derecha
- nombres, apellido_paterno, apellido_materno: el nombre separado. OJO con el orden: la INE imprime primero los apellidos y después el nombre; las licencias y pasaportes suelen imprimir primero el nombre y después los apellidos. Guíate por las etiquetas (NOMBRE, APELLIDOS) y por la CURP: su 1.ª letra es la inicial del apellido paterno, la 3.ª la del materno y la 4.ª la del nombre
- curp: los 18 caracteres tal como aparecen impresos, sin espacios ("" si no es legible)
- fecha_nac: SOLO la fecha de nacimiento, DD/MM/AAAA. NUNCA la fecha de expedición, emisión, vigencia o vencimiento. Si el documento no muestra la fecha de nacimiento: ""
- sexo: "Masculino" o "Femenino" (solo si aparece)
- domicilio: tal como aparece, en una sola línea
- cod_estado: 2 letras del estado en la CURP (ej: NL, JC, DF)
- menor: true solo si la fecha de nacimiento indica menos de 18 años
- licencia_tipo: la letra o clase de la licencia (ej: A, B, C, D, E, M). licencia_estado: estado que la expide. licencia_folio: folio o número de la licencia. licencia_vigencia: fecha de vencimiento DD/MM/AAAA ("Permanente" si así dice)
- Campos del vehículo: solo si es tarjeta de circulación
- Si un dato no es visible: cadena vacía ""`+(extra||'');

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
  let okCount=0,failCount=0,queuedCount=0,errorDetails=[];
  for(let i=0;i<files.length;i++){
    const file=files[i];
    const label=file&&file.name?file.name:`imagen ${i+1}`;
    status.textContent=isHeicFile(file)?`🔄 Convirtiendo ${label} (HEIC→JPG)...`:`🔍 Procesando ${label} (${i+1}/${files.length})...`;
    setProgress(Math.round((i/files.length)*80));
    try{
      if(await processSingleImage(file)==='encolado')queuedCount++;
      else okCount++;
    }catch(e){
      failCount++;
      const msg=e&&e.message?e.message:String(e);
      errorDetails.push(`${label}: ${msg}`);
      console.error(`Error procesando "${label}":`,e);
    }
  }
  setProgress(100);
  setTimeout(()=>setProgress(0),1000);
  if(queuedCount>0&&failCount===0){
    status.textContent=`📥 Sin señal: ${queuedCount} foto(s) guardada(s) para leer cuando vuelva la conexión.`;
  }else if(failCount>0&&okCount===0&&queuedCount===0){
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
  const base64=canvasParaOCR(canvas);
  if(!base64){throw new Error('No se pudo convertir la imagen a base64 (canvas vacío)');}
  if(!navigator.onLine){
    if(encolarOcr(base64))return'encolado';
    throw new Error('Sin conexión y no se pudo guardar la foto');
  }
  let obj;
  try{
    obj=await leerDocumento(base64);
  }catch(e){
    if(esErrorDeRed(e)&&encolarOcr(base64))return'encolado';
    throw e;
  }
  fillOCRFields(obj);
}

function fillOCRFields(obj,opts){
  const status=document.getElementById('scan-status');
  if(!obj||obj.error==='imagen_borrosa'){status.textContent='⚠️ Imagen borrosa';return;}
  const filled=[];

    // INE, licencia, pasaporte u otra identificación: datos de la persona
    if(obj.tipo&&obj.tipo!=='circulacion'){
      // Código del reverso (MRZ): con sus dígitos de control es la fuente más
      // confiable para la fecha de nacimiento y el sexo
      const mrz=obj.mrz?leerMRZ(obj.mrz):null;
      if(mrz&&mrz.valido){
        if(mrz.fecha_nac)obj.fecha_nac=mrz.fecha_nac;
        if(mrz.sexo)obj.sexo=mrz.sexo;
        if(!obj.nombres&&!obj.nombre_impreso&&mrz.nombres){obj.nombres=mrz.nombres;obj.apellido_paterno=mrz.apellidos;obj.apellido_materno='';}
        filled.push('Código del reverso ✔');
      }
      let curpParsed=null,curpClean='';
      if(obj.curp&&obj.curp.replace(/\s/g,'').length===18){
        curpClean=obj.curp.replace(/\s/g,'').toUpperCase();
        curpParsed=parseCurp(curpClean);
        const cst=document.getElementById('curp-status');
        fill('curp',curpClean);
        filled.push('CURP');
        if(curpParsed.valid){
          if(cst){
            if(curpParsed.digitoOk){cst.style.color='var(--green)';cst.textContent='✅ CURP leído del documento';}
            else{cst.style.color='#f0a000';cst.textContent='⚠️ CURP leído, pero el dígito verificador no coincide — verifícalo contra el documento';}
          }
        }else{
          // Se llena igual para que el policía lo corrija viendo el documento
          if(cst){cst.style.color='#f0a000';cst.textContent='⚠️ CURP leído pero no es válido ('+curpParsed.error+') — compáralo con el documento';}
        }
      }
      // Nombre en orden "Apellidos Nombre(s)": la licencia lo trae al revés que la INE
      const nom=ordenarNombre(obj,curpParsed&&curpParsed.valid?curpClean:'');
      // El reverso no trae acentos: no reemplaza un nombre ya leído del frente
      if(nom.nombre&&!(obj.tipo==='ine_reverso'&&v('nombre'))){fillTitle('nombre',nom.nombre);filled.push('Nombre');}
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
      if(obj.tipo==='licencia')anotarLicencia(obj)&&filled.push('Datos de la licencia');
    } else if(obj.tipo==='circulacion'){
      if(obj.marca){fill('marca',buscarMarca(obj.marca)||toTitleCase(obj.marca));updateSubmarcaList();filled.push('Marca');}
      if(obj.submarca){
        const det=detectarVehiculo(obj.marca,obj.submarca);
        fill('submarca',det?det.modelo:toTitleCase(obj.submarca));
        filled.push('Submarca');
      }
      // Tipo: primero por el modelo (catálogo); si no se reconoce, por lo
      // que dice la tarjeta ("SEDAN 4 PTAS", "VAGONETA"...)
      const antesTipo=v('tipo_vehiculo');
      if(!antesTipo)tipoVehiculoAuto=true;
      const det=aplicarDeteccionVehiculo();
      if(!(det&&det.tipo)&&!antesTipo){
        const tt=tipoDesdeTexto(obj.tipo_vehiculo);
        if(tt){
          pickSelect('tipo_vehiculo','tipo_vehiculo_search',tt);
          document.getElementById('tipo_vehiculo_search').classList.add('filled');
          tipoVehiculoAuto=true;
        }
      }
      if(!antesTipo&&v('tipo_vehiculo'))filled.push('Tipo de vehículo');
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
  // Lo que leyó la IA puede venir mal (un 0 por O, un dígito de menos)
  const porRevisar=revisarTodo();
  if(porRevisar.length)summary.textContent+=` — ⚠️ revisa: ${porRevisar.map(x=>ETIQUETAS_REVISION[x.id]).join(', ')}`;
  if(!(opts&&opts.sinPreguntar))preguntarOtraCaptura();
}

// ── OCR ZOOM ───────────────────────────────────────────
let ocrZoom = 1;
let ocrZoomCss = 1;
let ocrTrack = null;
function zoomOCR(dir){
  ocrZoom = Math.min(Math.max(ocrZoom + dir * 0.5, 1), 5);
  // Zoom de la cámara si el teléfono lo tiene; si no, se amplía la imagen.
  // (Antes el error del zoom no se atrapaba y en esos teléfonos no hacía nada.)
  const caps=ocrTrack&&ocrTrack.getCapabilities?ocrTrack.getCapabilities():{};
  if(caps.zoom){
    const z=Math.min(Math.max(ocrZoom,caps.zoom.min),caps.zoom.max);
    ocrTrack.applyConstraints({advanced:[{zoom:z}]}).catch(zoomPorImagen);
  }else{
    zoomPorImagen();
  }
}
function zoomPorImagen(){
  ocrZoomCss=ocrZoom;
  const v=document.getElementById('ocr-video');
  v.style.transform=`scale(${ocrZoom})`;
  v.style.transformOrigin='center center';
}

// ── MARCO GUÍA DE LA CÁMARA ─────────────────────────────
// La foto que va a la IA se recorta al marco (tamaño de credencial) con un
// pequeño margen, así la INE ocupa toda la imagen y se lee mejor. Con 🔲 se
// apaga para documentos grandes (p. ej. tarjeta de circulación en hoja).
const MARCO_KEY='fc_marco_ocr',PROPORCION_CREDENCIAL=85.6/54,MARGEN_MARCO=0.06;
function marcoActivo(){try{return localStorage.getItem(MARCO_KEY)!=='0';}catch(e){return true;}}
function toggleMarco(){
  const on=!marcoActivo();
  try{localStorage.setItem(MARCO_KEY,on?'1':'0');}catch(e){}
  actualizarMarcoUI();
  showToast(on?'🔲 Marco activado: se lee solo lo que está dentro':'Marco apagado: se envía la foto completa',2600);
}
function actualizarMarcoUI(){
  const on=marcoActivo();
  document.getElementById('ocr-marco').style.display=on?'block':'none';
  document.getElementById('marco-btn').classList.toggle('on',on);
  posicionarMarco();
}
// Rectángulo del marco dentro del video, en pixeles de pantalla
function rectMarco(w,h){
  let fw=w*0.88,fh=fw/PROPORCION_CREDENCIAL;
  if(fh>h*0.85){fh=h*0.85;fw=fh*PROPORCION_CREDENCIAL;}
  return{x:(w-fw)/2,y:(h-fh)/2,w:fw,h:fh};
}
function posicionarMarco(){
  const v=document.getElementById('ocr-video'),m=document.getElementById('ocr-marco');
  if(!v.clientWidth)return;
  const r=rectMarco(v.clientWidth,v.clientHeight);
  Object.assign(m.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
}
// Pasa el marco de la pantalla a pixeles del video (object-fit:cover + zoom de imagen)
function recorteDelMarco(video){
  const w=video.clientWidth,h=video.clientHeight,vw=video.videoWidth,vh=video.videoHeight;
  const s=Math.max(w/vw,h/vh)*ocrZoomCss;
  const ox=(w-vw*s)/2,oy=(h-vh*s)/2;
  const m=rectMarco(w,h);
  let x=(m.x-m.w*MARGEN_MARCO-ox)/s,y=(m.y-m.h*MARGEN_MARCO-oy)/s;
  let cw=m.w*(1+2*MARGEN_MARCO)/s,ch=m.h*(1+2*MARGEN_MARCO)/s;
  x=Math.max(0,x);y=Math.max(0,y);
  return{x,y,w:Math.min(cw,vw-x),h:Math.min(ch,vh-y)};
}
document.getElementById('ocr-video').addEventListener('loadedmetadata',posicionarMarco);
window.addEventListener('resize',posicionarMarco);

// ── LINTERNA ────────────────────────────────────────────
let torchOn=false;
async function toggleTorch(){
  if(!ocrTrack)return;
  try{
    torchOn=!torchOn;
    await ocrTrack.applyConstraints({advanced:[{torch:torchOn}]});
    document.getElementById('torch-btn').classList.toggle('on',torchOn);
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

// Agrega a Datos adicionales qué licencia presentó (se puede borrar o editar)
function anotarLicencia(obj){
  const partes=[];
  if(obj.licencia_tipo)partes.push('tipo '+String(obj.licencia_tipo).trim().toUpperCase());
  if(obj.licencia_estado)partes.push('del estado de '+toTitleCase(String(obj.licencia_estado).trim()));
  if(obj.licencia_folio)partes.push('folio '+String(obj.licencia_folio).trim());
  const vig=String(obj.licencia_vigencia||'').trim();
  if(/permanente/i.test(vig))partes.push('permanente');
  else if(vig)partes.push((fechaVencida(vig)?'VENCIDA desde el ':'vigente hasta el ')+vig);
  if(!partes.length)return false;
  const frase='Presenta licencia de conducir '+partes.join(', ')+'.';
  if(obsManualPersona.includes(frase))return false;
  obsManualPersona=(obsManualPersona.trim()?obsManualPersona.trim()+' ':'')+frase;
  refreshAdicionales();
  document.getElementById('adicionales').classList.add('filled');
  return true;
}

// ── CAPTURA AUTOMÁTICA ──────────────────────────────────
// Con la cámara abierta se revisa el marco 3 veces por segundo; cuando la
// credencial está quieta y enfocada durante ~1 s, la foto se toma sola.
// Con 🤖 se apaga (se recuerda). Siempre se puede tocar "Capturar".
const AUTO_KEY='fc_auto_captura',AUTO_INTERVALO_MS=330,AUTO_CUADROS_QUIETO=3;
let _autoId=null,_autoPrevio=null,_autoQuieto=0,_autoMejor=0,_autoInicio=0;
function autoActiva(){try{return localStorage.getItem(AUTO_KEY)!=='0';}catch(e){return true;}}
function toggleAutoCaptura(){
  const on=!autoActiva();
  try{localStorage.setItem(AUTO_KEY,on?'1':'0');}catch(e){}
  document.getElementById('auto-btn').classList.toggle('on',on);
  if(on)iniciarAutoCaptura();else detenerAutoCaptura();
  showToast(on?'🤖 Foto automática: se toma sola cuando está quieta y enfocada':'Foto automática apagada',2800);
}
function iniciarAutoCaptura(){
  detenerAutoCaptura();
  const b=document.getElementById('auto-btn');
  if(b)b.classList.toggle('on',autoActiva());
  if(!autoActiva())return;
  _autoPrevio=null;_autoQuieto=0;_autoMejor=0;_autoInicio=Date.now();
  _autoId=setInterval(revisarAutoCaptura,AUTO_INTERVALO_MS);
}
function detenerAutoCaptura(){
  clearInterval(_autoId);_autoId=null;
  const m=document.getElementById('ocr-marco');if(m)m.classList.remove('listo');
}
function revisarAutoCaptura(){
  const video=document.getElementById('ocr-video');
  if(!ocrStream||!video.videoWidth||_capturando||document.hidden)return;
  const region=marcoActivo()?recorteDelMarco(video):null;
  // Misma escala (320 px) con la que se calibraron los umbrales: más chica,
  // una foto borrosa parece nítida
  const cuadro=grisReducido(video,region,320);
  const mov=diferenciaCuadros(cuadro,_autoPrevio);
  _autoPrevio=cuadro;
  const n=nitidez(cuadro);
  _autoMejor=Math.max(_autoMejor,n);
  const quieto=mov<MOVIMIENTO_QUIETO;
  _autoQuieto=quieto?_autoQuieto+1:0;
  const enfocado=n>=NITIDEZ_MIN_AUTO&&n>=_autoMejor*0.8;
  document.getElementById('ocr-marco').classList.toggle('listo',quieto&&enfocado);
  // Esperar al menos 1.2 s desde que se abrió la cámara (que el enfoque se acomode)
  if(_autoQuieto>=AUTO_CUADROS_QUIETO&&enfocado&&Date.now()-_autoInicio>1200){
    detenerAutoCaptura();
    vibrate(60);
    captureOCR();
  }
}
