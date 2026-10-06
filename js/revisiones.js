// Revisión de datos: detecta valores que probablemente están mal escritos o
// mal leídos por el OCR. Solo avisan (campo en naranja); no impiden generar.
// Cada función recibe el texto y devuelve el aviso, o '' si se ve bien.
// Sin acceso a la página: se pueden probar fuera del navegador.

// NIV / número de serie (norma ISO 3779, la de Norteamérica y México):
// 17 caracteres, sin I, O ni Q, y el 9.º es un dígito verificador.
const NIV_VALORES={A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9};
const NIV_PESOS=[8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
function digitoNIV(niv){
  let suma=0;
  for(let i=0;i<17;i++){
    const c=niv[i];
    const val=/\d/.test(c)?Number(c):NIV_VALORES[c];
    if(val===undefined)return null;
    suma+=val*NIV_PESOS[i];
  }
  const r=suma%11;
  return r===10?'X':String(r);
}
function revisarNIV(texto){
  const v=String(texto||'').toUpperCase().replace(/[\s-]/g,'');
  if(!v)return'';
  if(v.length!==17)return`El NIV debe tener 17 caracteres (tiene ${v.length})`;
  if(/[IOQ]/.test(v))return'El NIV no lleva las letras I, O ni Q: probablemente es 1 o 0';
  if(!/^[A-Z0-9]{17}$/.test(v))return'El NIV solo lleva letras y números';
  if(digitoNIV(v)!==v[8])return'El dígito verificador (9.º carácter) no coincide: revisa que esté bien escrito';
  return'';
}

// Placas mexicanas: de 5 a 8 letras y números según el estado y el tipo
function revisarPlacas(texto){
  const v=String(texto||'').toUpperCase().replace(/[\s-]/g,'');
  if(!v)return'';
  if(!/^[A-Z0-9]+$/.test(v))return'Las placas solo llevan letras y números';
  if(v.length<5||v.length>8)return`Las placas suelen tener de 5 a 8 caracteres (tiene ${v.length})`;
  if(!/\d/.test(v))return'Las placas llevan al menos un número';
  return'';
}

// Teléfono: 10 dígitos (se acepta +52 al inicio). Texto sin números como
// "No proporciona" no se revisa.
function revisarTelefono(texto){
  const t=String(texto||'');
  let d=t.replace(/\D/g,'');
  if(!d)return'';
  if(d.length===12&&d.startsWith('52'))d=d.slice(2);
  if(d.length!==10)return`El teléfono debe tener 10 dígitos (tiene ${d.length})`;
  return'';
}

// Edad en años cumplidos a una fecha (DD/MM/AAAA); null si la fecha no existe
function edadDesdeFecha(fecha,hoy){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fecha||'').trim());
  if(!m)return null;
  const d=+m[1],mes=+m[2],a=+m[3];
  const f=new Date(a,mes-1,d);
  if(f.getFullYear()!==a||f.getMonth()!==mes-1||f.getDate()!==d)return null;
  hoy=hoy||new Date();
  let e=hoy.getFullYear()-a;
  if(hoy.getMonth()<mes-1||(hoy.getMonth()===mes-1&&hoy.getDate()<d))e--;
  return e;
}
function revisarNacimiento(fecha,hoy){
  if(!String(fecha||'').trim())return'';
  const e=edadDesdeFecha(fecha,hoy);
  if(e===null)return'La fecha no existe en el calendario (DD/MM/AAAA)';
  if(e<0)return'La fecha de nacimiento es posterior a hoy';
  if(e>110)return`Daría ${e} años: revisa el año`;
  return'';
}
function revisarEdad(edad,fecha,hoy){
  const t=String(edad||'').trim();
  if(!t)return'';
  const n=Number(t);
  if(!Number.isInteger(n)||n<0||n>110)return'La edad no es válida';
  const e=edadDesdeFecha(fecha,hoy);
  if(e!==null&&e>=0&&e!==n)return`Según la fecha de nacimiento tendría ${e} años`;
  return'';
}
