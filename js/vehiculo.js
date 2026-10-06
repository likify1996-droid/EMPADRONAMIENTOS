// Vehículo: autocompletado de marca/submarca y tipo automático desde el catálogo.
// Parte de la app; se carga en el orden de index.html.

// ── SUBMARCA AUTOCOMPLETE ──────────────────────────────
function onMarcaInput(){
  acFilter('marca','ac_marca',MARCAS);
  updateSubmarcaList();
}
function updateSubmarcaList(){
  const marca=buscarMarca(document.getElementById('marca').value);
  const modelos=SUBMARCAS[marca]||[];
  const sub=document.getElementById('submarca');
  if(modelos.length&&sub.value==='')sub.placeholder=modelos[0]+'...';
}
function acSubmarca(){
  const marca=buscarMarca(document.getElementById('marca').value);
  const val=normVeh(document.getElementById('submarca').value);
  const list=document.getElementById('ac_submarca');
  const base=SUBMARCAS[marca]||[];
  // Si hay lista de la marca, filtrar de ella; si no, buscar en todos
  const pool=base.length?base:TODAS_SUBMARCAS;
  if(!val){list.classList.remove('show');return;}
  pintarAutocomplete('submarca','ac_submarca',pool.filter(d=>normVeh(d).includes(val)).slice(0,8));
}

// ── TIPO DE VEHÍCULO AUTOMÁTICO ────────────────────────
// Con la submarca (y la marca si la hay) se busca el modelo en el catálogo
// y se llena el tipo. Si el tipo lo eligió el policía a mano, no se cambia:
// solo se muestra lo que dice el catálogo (p. ej. eligió "Taxi" para un Versa).
let tipoVehiculoAuto=false;
function aplicarDeteccionVehiculo(){
  const hint=document.getElementById('tipo-detectado');
  const r=detectarVehiculo(v('marca'),v('submarca'));
  if(!r){hint.style.display='none';return null;}
  // Completar o corregir la marca (p. ej. "nissan" → "Nissan")
  const marcaActual=v('marca');
  if(r.marca&&(!marcaActual||buscarMarca(marcaActual)===r.marca)&&marcaActual!==r.marca){
    fill('marca',r.marca);
    updateSubmarcaList();
  }
  // "versa" → "Versa" (solo si escribió el modelo exacto, no "Versa Advance")
  if(r.exacto&&v('submarca')!==r.modelo)document.getElementById('submarca').value=r.modelo;
  if(!r.tipo){hint.style.display='none';return r;}
  const actual=v('tipo_vehiculo');
  const nombre=[r.marca,r.modelo].filter(Boolean).join(' ');
  if(!actual||tipoVehiculoAuto){
    pickSelect('tipo_vehiculo','tipo_vehiculo_search',r.tipo);
    document.getElementById('tipo_vehiculo_search').classList.add('filled');
    tipoVehiculoAuto=true;
    hint.textContent=`🔎 Tipo detectado: ${r.tipo} (${nombre})`;
    hint.style.display='block';
  }else if(actual!==r.tipo){
    hint.textContent=`ℹ️ Según el catálogo, ${nombre} es ${r.tipo}`;
    hint.style.display='block';
  }else{
    hint.style.display='none';
  }
  return r;
}
function ocultarTipoDetectado(){
  tipoVehiculoAuto=false;
  const h=document.getElementById('tipo-detectado');if(h)h.style.display='none';
}
function onSubmarcaBlur(){
  // Espera a que termine un posible clic en la lista de sugerencias
  setTimeout(aplicarDeteccionVehiculo,150);
}
