// Análisis rápido de la foto: nitidez, reflejo y movimiento. Trabaja sobre
// una copia chica en gris (320 px de ancho) para que sea rápido en el
// teléfono. Las funciones de cálculo no tocan la página y se pueden probar
// fuera del navegador.

// Valores calibrados con fotos reales de credenciales (copia de 320 px):
// credencial nítida ≈ 300–600, con poco desenfoque ≈ 100, borrosa < 20.
const NITIDEZ_BORROSA=40;       // menos que esto: avisar que está borrosa
const NITIDEZ_MIN_AUTO=120;     // mínimo para la foto automática
const REFLEJO_MAX=0.02;         // más del 2 % de pixeles "quemados" = reflejo
const MOVIMIENTO_QUIETO=6;      // diferencia promedio (0–255) entre cuadros

// Copia en gris de una región de una imagen/canvas/video: {w,h,g}
function grisReducido(fuente,region,ancho){
  ancho=ancho||320;
  const r=region||{x:0,y:0,w:fuente.videoWidth||fuente.width,h:fuente.videoHeight||fuente.height};
  const w=ancho,h=Math.max(1,Math.round(r.h*ancho/r.w));
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(fuente,r.x,r.y,r.w,r.h,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data;
  const g=new Float32Array(w*h);
  for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
  return{w,h,g};
}

// Varianza del laplaciano: alta cuando los bordes de las letras están definidos
function nitidez({w,h,g}){
  let s=0,s2=0,n=0;
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      const i=y*w+x;
      const l=4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w];
      s+=l;s2+=l*l;n++;
    }
  }
  if(!n)return 0;
  const m=s/n;
  return s2/n-m*m;
}

// Fracción de pixeles casi blancos (reflejo de la luz en el plástico)
function fraccionReflejo({g}){
  let n=0;
  for(let i=0;i<g.length;i++)if(g[i]>=250)n++;
  return g.length?n/g.length:0;
}

// Diferencia promedio entre dos cuadros del mismo tamaño (movimiento)
function diferenciaCuadros(a,b){
  if(!a||!b||a.g.length!==b.g.length)return Infinity;
  let s=0;
  for(let i=0;i<a.g.length;i++)s+=Math.abs(a.g[i]-b.g[i]);
  return s/a.g.length;
}
