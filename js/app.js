// Arranque de la app, service worker, instalación y estado de conexión.
// Parte de la app; se carga en el orden de index.html.

// ── ARRANQUE DE LA APP ──────────────────────────────────
window.onload=()=>{
  renderMotivos();
  prepararDictado();
  actualizarModoOcrUI();
  document.getElementById('app-version').textContent='Versión '+APP_VERSION;
  renderTiposVehiculo();
  initDT();loadTheme();loadCompact();updateClock();checkGenerateReady();hideSplash();updateConnIndicator();
  updateGoogleKeyUI();
  actualizarAvisoOcr();
  const loteCount=restoreLoteIfAny();
  const nTabs=initTabs();
  if(loteCount&&nTabs)showToast(`📦 Lote recuperado (${loteCount}) y ${nTabs} pestaña(s) en progreso`);
  else if(loteCount)showToast(`📦 Se recuperó tu lote (${loteCount} empadronamiento(s))`);
  else if(nTabs)showToast(`📋 Se recuperaron ${nTabs} pestaña(s) en progreso`);
};

// ── REGISTRAR SERVICE WORKER (PWA offline) ─────────────
// Cuando se publica una versión nueva, el service worker se actualiza solo;
// aquí se avisa para recargar (la app puede quedar abierta todo el turno).
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    const habiaVersion=!!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!habiaVersion)return; // primera instalación: no hay nada que actualizar
      const b=document.getElementById('update-banner');
      if(b)b.style.display='flex';
    });
    navigator.serviceWorker.register('./sw.js')
      .then(reg=>{
        console.log('Service Worker registrado — app funcionará offline');
        const buscar=()=>reg.update().catch(()=>{});
        document.addEventListener('visibilitychange',()=>{if(!document.hidden)buscar();});
        setInterval(buscar,30*60*1000);
      })
      .catch(err=>console.log('SW no disponible (normal si se abre como archivo local):',err.message));
  });
}
function aplicarActualizacion(){
  if(tabsReady)saveTabs();
  location.reload();
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
window.addEventListener('online',()=>{
  updateConnIndicator();
  const n=leerColaOcr().length;
  showToast(n?`🌐 Conexión restaurada — toca "Leer ahora" para ${n} documento(s) pendiente(s)`:'🌐 Conexión restaurada',n?4000:2200);
});
window.addEventListener('offline',()=>{updateConnIndicator();showToast('⚠️ Sin conexión a internet');});
