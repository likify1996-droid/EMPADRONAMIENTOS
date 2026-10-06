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
