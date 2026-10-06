// Datos de documentos de identidad (INE, licencia, pasaporte). Sin acceso a
// la página: se pueden probar fuera del navegador.

// Partículas que no cuentan para las iniciales de la CURP ("DE LA O", "DEL RÍO")
const PARTICULAS_NOMBRE=['DA','DAS','DE','DEL','DER','DI','DIE','DD','EL','LA','LOS','LAS','LE','LES','MAC','MC','VAN','VON','Y'];
// Nombres que la CURP se salta cuando hay un segundo nombre (MARÍA José → José)
const NOMBRES_COMUNES_CURP=['MARIA','MA','MA.','JOSE','J','J.'];

// Mayúsculas y espacios limpios, conservando acentos y Ñ (para mostrar)
function limpiarNombre(s){
  return String(s||'').toUpperCase().replace(/[^\p{L}.'\s]/gu,' ').replace(/\s+/g,' ').trim();
}
// Sin acentos pero con Ñ (para comparar con la CURP)
function normNombre(s){
  return limpiarNombre(s).replace(/Ñ/g,'\u0001').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\u0001/g,'Ñ');
}
// Une las partículas con la palabra que sigue: ["DE","LA","O"] → ["DE LA O"]
function unidadesNombre(texto){
  const out=[];let pend=[];
  limpiarNombre(texto).split(' ').filter(Boolean).forEach(p=>{
    if(PARTICULAS_NOMBRE.includes(normNombre(p))){pend.push(p);return;}
    out.push(pend.concat(p).join(' '));pend=[];
  });
  if(pend.length)out.push(pend.join(' '));
  return out;
}
function sinParticulas(s){
  return normNombre(s).split(' ').filter(p=>p&&!PARTICULAS_NOMBRE.includes(p)).join('');
}
const letraCurp=c=>(!c||c==='Ñ')?'X':c;

// Las 4 letras con que empieza la CURP de esa persona (reglas de RENAPO,
// sin las palabras altisonantes que RENAPO cambia)
function inicialesCurp(paterno,materno,nombres){
  const p=sinParticulas(paterno),m=sinParticulas(materno);
  let n=normNombre(nombres).split(' ').filter(Boolean);
  if(n.length>1&&NOMBRES_COMUNES_CURP.includes(n[0]))n=n.slice(1);
  const vocal=(p.slice(1).match(/[AEIOU]/)||['X'])[0];
  return letraCurp(p[0])+vocal+letraCurp(m[0])+letraCurp((n[0]||'')[0]);
}

// Ordena el nombre como "Apellido paterno Apellido materno Nombre(s)".
// La INE imprime primero los apellidos y la licencia o el pasaporte primero
// el nombre; con la CURP se comprueba cuál es cuál. Recibe lo que leyó la IA:
// {nombres, apellido_paterno, apellido_materno, nombre_impreso, nombre}.
// Devuelve {nombre, confirmadoConCurp}.
function ordenarNombre(datos,curp){
  const d=datos||{};
  const ini=/^[A-ZÑ]{4}\d{6}[HM]/.test(String(curp||''))?String(curp).slice(0,4):'';
  const formar=(p,m,n)=>[p,m,n].map(limpiarNombre).filter(Boolean).join(' ');
  const separado=limpiarNombre(d.apellido_paterno)&&limpiarNombre(d.nombres);
  if(separado&&ini&&inicialesCurp(d.apellido_paterno,d.apellido_materno,d.nombres)===ini){
    return{nombre:formar(d.apellido_paterno,d.apellido_materno,d.nombres),confirmadoConCurp:true};
  }
  // Con la CURP se prueban todas las formas de partir el nombre impreso,
  // con los apellidos al inicio o al final
  const impreso=d.nombre_impreso||d.nombre||(separado?[d.nombres,d.apellido_paterno,d.apellido_materno].join(' '):'');
  const u=unidadesNombre(impreso);
  if(ini&&u.length>=2){
    const cand=[];
    for(let j=1;j<u.length;j++)cand.push([u[0],u.slice(1,j).join(' '),u.slice(j).join(' ')]); // apellidos primero
    for(let k=1;k<u.length;k++)cand.push([u[k],u.slice(k+1).join(' '),u.slice(0,k).join(' ')]); // nombres primero
    const ok=cand.find(([p,m,n])=>inicialesCurp(p,m,n)===ini);
    if(ok)return{nombre:formar(ok[0],ok[1],ok[2]),confirmadoConCurp:true};
  }
  if(separado)return{nombre:formar(d.apellido_paterno,d.apellido_materno,d.nombres),confirmadoConCurp:false};
  return{nombre:limpiarNombre(d.nombre||impreso),confirmadoConCurp:false};
}

// Fecha DD/MM/AAAA ya pasada (para avisar si la licencia está vencida)
function fechaVencida(fecha,hoy){
  const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(fecha||'').trim());
  if(!m)return false;
  return new Date(+m[3],+m[2]-1,+m[1],23,59,59)<(hoy||new Date());
}

// ── CÓDIGO DEL REVERSO DE LA INE (MRZ) ──────────────────
// Son 3 renglones de 30 caracteres que empiezan con "IDMEX". Cada dato trae
// su dígito de control (norma ICAO 9303), así que se sabe si se leyó bien.
function digitoMRZ(texto){
  const pesos=[7,3,1];
  let s=0;
  for(let i=0;i<texto.length;i++){
    const c=texto[i];
    const v=c==='<'?0:/\d/.test(c)?+c:/[A-Z]/.test(c)?c.charCodeAt(0)-55:-1;
    if(v<0)return -1;
    s+=v*pesos[i%3];
  }
  return s%10;
}
function limpiarMRZ(texto){
  return String(texto||'').toUpperCase().replace(/[«‹＜]/g,'<').split(/[\r\n]+/)
    .map(l=>l.replace(/\s/g,'')).filter(l=>l.length>=20);
}
// Devuelve null si no hay código; si hay, los datos y qué controles pasaron
function leerMRZ(texto,hoy){
  const l=limpiarMRZ(texto);
  if(l.length<3)return null;
  const [l1,l2,l3]=l.slice(-3).map(x=>(x+'<'.repeat(30)).slice(0,30));
  const ok=(campo,dig)=>/\d/.test(dig)&&digitoMRZ(campo)===+dig;
  const r={controles:{documento:ok(l1.slice(5,14),l1[14]),nacimiento:ok(l2.slice(0,6),l2[6]),vigencia:ok(l2.slice(8,14),l2[14])}};
  // Fecha AAMMDD: el siglo se deduce (nadie tiene más de 100 años)
  const yy=+l2.slice(0,2),mm=+l2.slice(2,4),dd=+l2.slice(4,6);
  const actual=(hoy||new Date()).getFullYear()%100;
  const anio=(yy>actual?1900:2000)+yy;
  const f=new Date(anio,mm-1,dd);
  if(r.controles.nacimiento&&f.getMonth()===mm-1&&f.getDate()===dd){
    r.fecha_nac=`${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${anio}`;
  }
  r.sexo=l2[7]==='M'?'Masculino':l2[7]==='F'?'Femenino':'';
  // Renglón 3: APELLIDO1<APELLIDO2<<NOMBRE1<NOMBRE2
  const [ap,nom]=l3.replace(/<+$/,'').split('<<');
  r.apellidos=(ap||'').split('<').filter(Boolean).join(' ');
  r.nombres=(nom||'').split('<').filter(Boolean).join(' ');
  r.valido=r.controles.nacimiento;
  return r;
}

// ── ¿LA LECTURA TIENE ERRORES? ──────────────────────────
// Validaciones que no dependen de la IA. Si hay alguna, la app vuelve a
// leer la misma foto con otro modelo y se queda con la mejor lectura.
const CURP_DICC='0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
function curpValida(curp){
  const c=String(curp||'').toUpperCase().replace(/\s/g,'');
  if(!/^[A-ZÑ]{4}\d{6}[HM][A-Z]{2}[A-ZÑ]{3}[A-Z0-9]\d$/.test(c))return false;
  let s=0;
  for(let i=0;i<17;i++)s+=CURP_DICC.indexOf(c[i])*(18-i);
  return (10-(s%10))%10===+c[17];
}
function problemasLectura(obj){
  const p=[];
  if(!obj||typeof obj!=='object')return['no se obtuvo respuesta'];
  if(obj.tipo==='circulacion'){
    if(obj.serie&&typeof revisarNIV==='function'&&revisarNIV(obj.serie))p.push(`el número de serie "${obj.serie}" no es válido (${revisarNIV(obj.serie)})`);
    return p;
  }
  if(obj.mrz){
    const m=leerMRZ(obj.mrz);
    if(m&&!m.valido)p.push('el código del reverso (renglones IDMEX) no pasa sus dígitos de control: copia cada carácter con cuidado, incluidos los <');
  }
  const curp=String(obj.curp||'').replace(/\s/g,'').toUpperCase();
  if(curp){
    if(!curpValida(curp))p.push(`la CURP "${curp}" no es válida (formato o dígito verificador): revisa letras y números parecidos (0/O, 1/I, 5/S, 8/B)`);
    else if((obj.nombre_impreso||obj.nombres)&&!ordenarNombre(obj,curp).confirmadoConCurp)p.push(`la CURP "${curp}" no corresponde a las iniciales del nombre leído`);
  }
  return p;
}
// Entre dos lecturas, la que tenga menos errores (empate: la primera)
function mejorLectura(a,b){
  if(!b)return a;
  if(!a)return b;
  return problemasLectura(b).length<problemasLectura(a).length?b:a;
}
