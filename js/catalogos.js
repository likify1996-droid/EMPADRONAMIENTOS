// Catálogos de datos de la app (categorías, estados, vehículos, motivos).
// Se cargan antes de app.js.

const SUBCATS={
  'Entretenimiento':['Bar o Centro Nocturno','Table dance','Centros de apuestas','Evento masivo','Otro'],
  'Comercio':['Comercio ambulante','Cachimba','Reciclador o pepenador','Tianguis','Comercio formal','Yonke','Casa de Empeño','Depósito de alcohol','Otro'],
  'Transporte':['Taxi con permiso','Taxi pirata','Mototaxi','Taxi de aplicación','Repartidor','Transporte de personal','Transporte de carga','Otro'],
  'Seguridad':['Personal de Seguridad Privada','Escoltas','Personal o expersonal de Seguridad Pública','Personal o expersonal de Fuerzas Armadas','Otro'],
  'Sectores Vulnerables':['Indigente','Indígenas','Migrante','Persona con trastornos mentales','Persona con adicciones','Persona con discapacidad','Centro de Rehabilitación','Otro'],
  'General':['Actividad sospechosa','Conducta de riesgo','Otro']
};

const ESTADOS=['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'];


const CURP_ESTADOS={'AS':'Aguascalientes','BC':'Baja California','BS':'Baja California Sur','CC':'Campeche','CS':'Chiapas','CH':'Chihuahua','DF':'Ciudad de México','CL':'Coahuila','CM':'Colima','DG':'Durango','GT':'Guanajuato','GR':'Guerrero','HG':'Hidalgo','JC':'Jalisco','MC':'Estado de México','MN':'Michoacán','MS':'Morelos','NT':'Nayarit','NL':'Nuevo León','OC':'Oaxaca','PL':'Puebla','QT':'Querétaro','QR':'Quintana Roo','SP':'San Luis Potosí','SL':'Sinaloa','SR':'Sonora','TC':'Tabasco','TS':'Tamaulipas','TL':'Tlaxcala','VZ':'Veracruz','YN':'Yucatán','ZS':'Zacatecas','NE':'Extranjero'};

const NUM_ESTADOS={'01':'Aguascalientes','02':'Baja California','03':'Baja California Sur','04':'Campeche','05':'Coahuila','06':'Colima','07':'Chiapas','08':'Chihuahua','09':'Ciudad de México','10':'Durango','11':'Guanajuato','12':'Guerrero','13':'Hidalgo','14':'Jalisco','15':'Estado de México','16':'Michoacán','17':'Morelos','18':'Nayarit','19':'Nuevo León','20':'Oaxaca','21':'Puebla','22':'Querétaro','23':'Quintana Roo','24':'San Luis Potosí','25':'Sinaloa','26':'Sonora','27':'Tabasco','28':'Tamaulipas','29':'Tlaxcala','30':'Veracruz','31':'Yucatán','32':'Zacatecas'};

// Motivos del empadronamiento. Todo contacto con una persona es un acto de
// molestia (art. 16 constitucional): debe tener una causa objetiva que se
// pueda explicar, no la apariencia o una impresión subjetiva. Cada motivo
// lleva su fundamento (se ve al dejar el dedo sobre la opción).
// Ojo: el texto se copia tal cual al reporte; revísalo con el área jurídica
// antes de cambiarlo.
const MOTIVOS=[
  {texto:'Prevención del delito',fundamento:'Art. 21 constitucional: la seguridad pública comprende la prevención de los delitos'},
  {texto:'Patrullaje preventivo y proximidad social',fundamento:'Art. 21 constitucional y Ley General del Sistema Nacional de Seguridad Pública'},
  {texto:'Atención a reporte ciudadano o del C5',fundamento:'Denuncia o reporte que señala hechos concretos (art. 21 constitucional)'},
  {texto:'Sospecha razonable por hechos objetivos observados',fundamento:'Control preventivo provisional (criterios de la SCJN): describir en datos adicionales qué hechos concretos se observaron'},
  {texto:'Comisión de falta administrativa',fundamento:'Art. 21 constitucional: sanción de infracciones a reglamentos gubernativos y de policía'},
  {texto:'Alteración del orden público',fundamento:'Falta administrativa prevista en el reglamento de policía municipal (art. 21 constitucional)'},
  {texto:'Operativo o punto de revisión autorizado',fundamento:'Operativo ordenado por autoridad competente, con registro de la orden'},
  {texto:'Apoyo solicitado por otra autoridad',fundamento:'Coordinación entre instituciones de seguridad pública (art. 21 constitucional)'},
  {texto:'Asistencia a persona en situación de vulnerabilidad',fundamento:'Art. 1 constitucional: obligación de proteger los derechos humanos'},
];
const TIPOS_VEHICULO=[
  {nombre:'Motocicleta',svg:'<svg viewBox="0 0 64 32" width="48" height="24"><circle cx="12" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="52" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 24 L20 12 L32 12 L38 20 L52 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 12 L36 6 L44 6 L46 12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M38 20 L42 14" fill="none" stroke="currentColor" stroke-width="2"/></svg>'},
  {nombre:'Bicicleta',svg:'<svg viewBox="0 0 64 32" width="48" height="24"><circle cx="14" cy="22" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="50" cy="22" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 22 L28 10 L50 22" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 10 L32 22" stroke="currentColor" stroke-width="2"/><path d="M24 10 L36 10" stroke="currentColor" stroke-width="2.5"/><path d="M28 6 L28 10" stroke="currentColor" stroke-width="2"/></svg>'},
  {nombre:'Monopatín / Scooter eléctrico',svg:'<svg viewBox="0 0 64 36" width="48" height="27"><circle cx="10" cy="30" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="54" cy="30" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M10 30 L10 8 L16 8 L16 4 L22 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 25 L54 25 L54 30" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="30" y="14" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>'},
  {nombre:'Sedán',svg:'<svg viewBox="0 0 80 36" width="56" height="27"><path d="M8 24 L8 18 L20 10 L56 10 L72 18 L72 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 10 L26 4 L52 4 L58 10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="60" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="25" y1="24" x2="55" y2="24" stroke="currentColor" stroke-width="1.5"/></svg>'},
  {nombre:'Hatchback',svg:'<svg viewBox="0 0 80 36" width="56" height="27"><path d="M8 24 L8 18 L18 10 L62 10 L72 18 L72 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 10 L20 4 L62 4 L62 10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="60" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Coupé',svg:'<svg viewBox="0 0 80 36" width="56" height="27"><path d="M6 24 L8 18 L22 8 L58 8 L72 18 L72 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 8 L30 3 L56 3 L60 8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="60" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Pick up',svg:'<svg viewBox="0 0 88 36" width="60" height="27"><path d="M6 24 L6 16 L20 10 L44 10 L44 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 10 L24 4 L42 4 L44 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M44 16 L82 16 L82 24 L44 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="68" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Camioneta SUV',svg:'<svg viewBox="0 0 88 36" width="60" height="27"><path d="M6 24 L6 14 L16 8 L72 8 L82 14 L82 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 8 L20 3 L70 3 L72 8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="68" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="44" y1="8" x2="44" y2="24" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2,2"/></svg>'},
  {nombre:'Van / Minivan',svg:'<svg viewBox="0 0 88 36" width="60" height="27"><path d="M6 24 L6 12 L18 8 L76 8 L82 12 L82 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 8 L18 3 L76 3 L76 8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="68" cy="27" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="52" y1="8" x2="52" y2="24" stroke="currentColor" stroke-width="1.5"/></svg>'},
  {nombre:'Camión de carga',svg:'<svg viewBox="0 0 96 40" width="64" height="27"><rect x="6" y="8" width="84" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="38" y1="8" x2="38" y2="30" stroke="currentColor" stroke-width="2"/><path d="M6 8 L6 18 L38 18" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="72" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="84" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Camioneta de reparto',svg:'<svg viewBox="0 0 88 36" width="60" height="27"><rect x="44" y="8" width="38" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M6 24 L6 12 L20 8 L44 8 L44 26 L6 26 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 8 L20 3 L40 3 L44 8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="28" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="68" cy="28" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Tráiler',svg:'<svg viewBox="0 0 110 40" width="72" height="27"><rect x="46" y="6" width="58" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M6 28 L6 14 L20 8 L46 8 L46 28 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 8 L22 3 L44 3 L46 8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="66" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="80" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="94" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Autobús',svg:'<svg viewBox="0 0 96 40" width="64" height="27"><rect x="6" y="6" width="84" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="14" y="10" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="30" y="10" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="46" y="10" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="62" y="10" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="76" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Microbús',svg:'<svg viewBox="0 0 88 36" width="60" height="27"><rect x="6" y="8" width="76" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="12" y="11" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="26" y="11" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="40" y="11" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="56" y="11" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="29" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="68" cy="29" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Taxi',svg:'<svg viewBox="0 0 80 36" width="56" height="27"><path d="M8 24 L8 18 L20 10 L56 10 L72 18 L72 24 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 10 L26 4 L52 4 L58 10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="28" y="2" width="18" height="4" rx="1" fill="currentColor" opacity="0.5"/><circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="60" cy="26" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'},
  {nombre:'Triciclo',svg:'<svg viewBox="0 0 72 36" width="52" height="27"><circle cx="14" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="58" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="42" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 16 L28 8 L42 18" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 8 L58 18" fill="none" stroke="currentColor" stroke-width="2"/><path d="M42 18 L58 18" fill="none" stroke="currentColor" stroke-width="2"/><rect x="48" y="8" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'},
  {nombre:'Cuatrimoto',svg:'<svg viewBox="0 0 80 36" width="56" height="27"><circle cx="14" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="66" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 17 L20 10 L60 10 L66 17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="6" width="28" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M36 6 L38 2 L42 2 L44 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'},
  {nombre:'Sin vehículo',svg:'<svg viewBox="0 0 48 48" width="36" height="36"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3"/><line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="3"/></svg>'},
];

// ── CATÁLOGO DE VEHÍCULOS ──────────────────────────────
// Marca → tipo → modelos. El tipo de cada modelo permite que la app
// deduzca sola el "Tipo de Vehículo" al elegir o escanear la submarca.
// Para agregar un modelo, ponlo en la lista del tipo que le corresponde.
// Claves de tipo: M moto · S sedán · H hatchback · C coupé · P pick up ·
// SUV camioneta SUV · V van/minivan · CR camioneta de reparto ·
// CC camión de carga · T tráiler · A autobús · MB microbús ·
// Q cuatrimoto/UTV · TR triciclo · B bicicleta · E monopatín/scooter eléctrico
const TIPO_CLAVE={M:'Motocicleta',S:'Sedán',H:'Hatchback',C:'Coupé',P:'Pick up',SUV:'Camioneta SUV',V:'Van / Minivan',CR:'Camioneta de reparto',CC:'Camión de carga',T:'Tráiler',A:'Autobús',MB:'Microbús',Q:'Cuatrimoto',TR:'Triciclo',B:'Bicicleta',E:'Monopatín / Scooter eléctrico'};

const VEHICULOS={
  // ── AUTOS Y CAMIONETAS: MÁS COMUNES EN MÉXICO ──
  'Nissan':{S:['Versa','Sentra','Tsuru','Tiida','Altima','Maxima','Platina','V-Drive','Almera','Lucino'],H:['March','Note','Tiida Hatchback','Leaf'],C:['Z','370Z','350Z','GT-R'],P:['NP300','Frontier','D21','Titan'],SUV:['Kicks','X-Trail','Pathfinder','Murano','Armada','Juke','Qashqai','Xterra','Ariya'],V:['Urvan','NV350','Quest'],CR:['NV200']},
  'Chevrolet':{S:['Aveo','Onix','Cavalier','Malibu','Sonic','Cruze','Optra','Corsa','Lumina','Impala','Monza'],H:['Chevy','Spark','Beat','Matiz','Pop','Astra'],C:['Camaro','Corvette'],P:['Silverado','Cheyenne','Colorado','S10','Montana','Tornado'],SUV:['Trax','Tracker','Groove','Equinox','Blazer','Captiva','Traverse','Trailblazer','Tahoe','Suburban'],V:['Express','Uplander','Meriva'],CR:['N300','Express Cargo'],CC:['Kodiak']},
  'Volkswagen':{S:['Sedán','Jetta','Vento','Virtus','Bora','Passat','Derby','Atlantic','Arteon'],H:['Golf','Gol','Pointer','Polo','CrossFox','Lupo','Up!','Caribe','ID.3'],C:['Beetle','Scirocco'],P:['Saveiro','Amarok'],SUV:['Tiguan','Taos','T-Cross','T-Roc','Nivus','Taigo','Teramont','Touareg','ID.4'],V:['Combi','Transporter','Caravelle','Crafter'],CR:['Caddy'],CC:['Delivery','Worker'],T:['Constellation'],A:['Volksbus']},
  'Toyota':{S:['Corolla','Camry','Yaris'],H:['Prius'],C:['GR86','Supra'],P:['Hilux','Tacoma','Tundra'],SUV:['RAV4','Corolla Cross','Raize','C-HR','Fortuner','Highlander','4Runner','Land Cruiser','Sequoia','bZ4X'],V:['Avanza','Sienna','Hiace']},
  'Kia':{S:['Rio','Forte','K3','K4','K5','Optima','Stinger'],H:['Picanto','Soul'],SUV:['Seltos','Sonet','Sportage','Sorento','Niro','Telluride','EV6','EV9'],V:['Carnival']},
  'Hyundai':{S:['Accent','Elantra','Sonata','Verna','Ioniq 6'],H:['Grand i10','i10','Atos','HB20'],SUV:['Creta','Tucson','Santa Fe','Venue','Kona','Palisade','Ioniq 5'],V:['Staria','H-1'],CR:['H100']},
  'Mazda':{S:['Mazda 2','Mazda 3','Mazda 6'],C:['MX-5'],P:['BT-50'],SUV:['CX-3','CX-30','CX-5','CX-50','CX-70','CX-9','CX-90','MX-30']},
  'Honda':{S:['Civic','Accord','City','Insight'],H:['Fit'],P:['Ridgeline'],SUV:['HR-V','CR-V','BR-V','ZR-V','Pilot','Passport','Prologue','e:NY1'],V:['Odyssey'],
    M:['Cargo 150','CGL 125 Tool','Wave 110','Dio 110','Navi 110','Elite 125','PCX 150','PCX 160','ADV 150','ADV 160','XR 150L','XR 190L','CB 125F','CB 160F','CB 190R','CB 150F','CBR 250R','CB500F','CB500X','CBR 600RR','CBR 1000RR','CRF 150F','CRF 250F','CRF 300L','Africa Twin','Forza 350','Monkey'],
    Q:['FourTrax Recon','Rancher','Foreman','Pioneer']},
  'Ford':{S:['Fiesta','Focus','Fusion','Ikon','Figo','Topaz','Contour','Grand Marquis','Crown Victoria'],H:['Ka'],C:['Mustang'],P:['Lobo','F-150','Ranger','Maverick','F-150 Lightning','F-250','F-350','Courier'],SUV:['EcoSport','Territory','Escape','Edge','Explorer','Expedition','Bronco','Bronco Sport','Mustang Mach-E'],V:['Transit','Windstar','Econoline'],CR:['Transit Connect'],CC:['F-450','F-550']},
  'Dodge':{S:['Attitude','Neon','Stratus','Avenger','Charger','Dart','Vision','Verna','Shadow','Spirit'],H:['Caliber','i10','Atos'],C:['Challenger'],P:['Dakota','Ram'],SUV:['Durango','Journey','Nitro','Hornet'],V:['Grand Caravan','Caravan'],CR:['H100']},
  'RAM':{P:['700','1200','1500','2500','3500','TRX'],CC:['4000'],V:['ProMaster'],CR:['ProMaster Rapid','V700']},
  'Jeep':{SUV:['Renegade','Compass','Cherokee','Grand Cherokee','Grand Cherokee L','Wrangler','Commander','Liberty','Patriot','Avenger'],P:['Gladiator']},
  'Chrysler':{S:['300','Cirrus','Shadow'],H:['PT Cruiser'],V:['Pacifica','Voyager','Town & Country']},
  'Renault':{S:['Logan','Fluence','Scala'],H:['Clio','Sandero','Stepway','Kwid','Megane','Zoe'],P:['Oroch','Alaskan'],SUV:['Duster','Koleos','Captur'],V:['Master','Trafic'],CR:['Kangoo']},
  'Suzuki':{S:['Ciaz','Dzire'],H:['Swift','Ignis','Baleno','SX4'],SUV:['Vitara','Grand Vitara','S-Cross','Jimny','XL7'],V:['Ertiga'],
    M:['GN 125','GS 150','GSX-R 150','GSX-R 600','GSX-R 1000','GSX-S 750','Hayabusa','V-Strom 250','V-Strom 650','V-Strom 1050','Gixxer 150','Gixxer 250','Burgman 125','Burgman 200','DR 650','Intruder 150'],Q:['KingQuad']},
  'Mitsubishi':{S:['Mirage G4','Lancer','Galant','Attrage'],H:['Mirage'],P:['L200'],SUV:['Outlander','Eclipse Cross','ASX','Montero','Montero Sport'],V:['Xpander']},
  'Peugeot':{S:['301','408'],H:['206','207','208','308'],P:['Landtrek'],SUV:['2008','3008','5008'],V:['Rifter','Expert','Manager'],CR:['Partner']},
  'Citroën':{H:['C3','C4'],SUV:['C3 Aircross','C5 Aircross'],V:['Jumpy'],CR:['Berlingo']},
  'SEAT':{S:['Toledo','Córdoba'],H:['Ibiza','Leon','Altea'],SUV:['Arona','Ateca','Tarraco','Cupra Formentor']},
  'Cupra':{H:['Leon','Born'],SUV:['Formentor','Ateca','Terramar']},
  'Fiat':{S:['Cronos'],H:['500','Mobi','Uno','Palio','Argo'],P:['Strada','Toro'],SUV:['Pulse','Fastback'],V:['Ducato'],CR:['Doblo']},
  'Isuzu':{P:['D-Max'],SUV:['MU-X'],CC:['ELF 100','ELF 200','ELF 300','ELF 400','ELF 500','ELF 600','NPR','NQR','NLR','FVR','FTR']},
  'Subaru':{S:['Impreza','Legacy','WRX'],C:['BRZ'],SUV:['Outback','Forester','XV','Crosstrek','Ascent']},
  // ── MARCAS DE LUJO ──
  'Audi':{S:['A3','A4','A6','A7','A8','RS3','RS6'],H:['A1'],C:['A5','TT','R8'],SUV:['Q2','Q3','Q5','Q7','Q8','e-tron','Q4 e-tron']},
  'BMW':{S:['Serie 3','Serie 5','Serie 7','M3','i4','i7'],H:['Serie 1'],C:['Serie 2','Serie 4','Serie 8','M2','M4','Z4'],SUV:['X1','X2','X3','X4','X5','X6','X7','iX','iX1'],
    M:['G 310 R','G 310 GS','F 850 GS','F 900 R','R 1250 GS','R 1300 GS','S 1000 RR']},
  'Mercedes-Benz':{S:['Clase C','Clase E','Clase S','CLA','CLS','EQE','EQS'],H:['Clase A','Clase B'],C:['AMG GT','SL'],SUV:['GLA','GLB','GLC','GLE','GLS','Clase G','EQA','EQB','EQC'],V:['Sprinter','Vito','Clase V'],CC:['Atego','Accelo'],T:['Actros','Axor'],MB:['Torino','Boxer'],A:['Multego','O500']},
  'MINI':{H:['Cooper','Clubman','Paceman'],C:['Convertible'],SUV:['Countryman','Aceman']},
  'Porsche':{S:['Panamera','Taycan'],C:['911','718 Boxster','718 Cayman'],SUV:['Macan','Cayenne']},
  'Land Rover':{SUV:['Defender','Discovery','Discovery Sport','Range Rover','Range Rover Sport','Range Rover Evoque','Range Rover Velar','Freelander']},
  'Jaguar':{S:['XE','XF','XJ'],C:['F-Type'],SUV:['E-Pace','F-Pace','I-Pace']},
  'Volvo':{S:['S60','S90'],H:['V60','V90'],SUV:['XC40','XC60','XC90','C40','EX30'],T:['VNL','VNR','VM','FH'],A:['9700','7900']},
  'Lexus':{S:['ES','IS','LS'],C:['LC','RC'],SUV:['NX','RX','GX','LX','UX','LBX','TX']},
  'Acura':{S:['ILX','TLX','Integra'],C:['NSX'],SUV:['RDX','MDX','ZDX']},
  'Infiniti':{S:['Q50'],C:['Q60'],SUV:['QX50','QX55','QX60','QX80']},
  'Cadillac':{S:['CT4','CT5','CTS','ATS'],SUV:['Escalade','XT4','XT5','XT6','LYRIQ']},
  'GMC':{P:['Sierra','Canyon'],SUV:['Terrain','Acadia','Yukon','Envoy'],V:['Savana']},
  'Buick':{S:['LaCrosse','Regal','Verano'],SUV:['Encore','Envista','Enclave','Envision']},
  'Lincoln':{S:['MKZ','Continental'],SUV:['Corsair','Nautilus','Aviator','Navigator','MKX']},
  'Genesis':{S:['G70','G80','G90'],SUV:['GV60','GV70','GV80']},
  'Alfa Romeo':{S:['Giulia'],H:['Giulietta'],SUV:['Stelvio','Tonale','Junior']},
  'Tesla':{S:['Model 3','Model S'],SUV:['Model Y','Model X'],P:['Cybertruck']},
  'Maserati':{S:['Ghibli','Quattroporte'],C:['MC20','GranTurismo'],SUV:['Levante','Grecale']},
  'Lamborghini':{C:['Huracán','Revuelto','Aventador'],SUV:['Urus']},
  'Ferrari':{C:['F8','Roma','SF90','488','Portofino','296','12Cilindri'],SUV:['Purosangue']},
  // ── MARCAS QUE YA NO SE VENDEN PERO SIGUEN EN LA CALLE ──
  'Pontiac':{S:['G4','G6','Grand Am'],H:['G3','Matiz'],C:['G5','Sunfire','Solstice'],SUV:['Aztek','Torrent'],V:['Montana']},
  'Mercury':{S:['Grand Marquis','Milan','Sable'],SUV:['Mountaineer']},
  'Hummer':{SUV:['H2','H3']},
  // ── MARCAS CHINAS ──
  'MG':{S:['MG5','MG GT','MG7'],H:['MG3','MG4'],C:['Cyberster'],SUV:['MG ZS','MG HS','RX5','RX8','One','Marvel R']},
  'BYD':{S:['Seal','Han','King'],H:['Dolphin','Dolphin Mini','Seagull'],P:['Shark'],SUV:['Atto 3','Tang','Song Plus','Song Pro','Yuan Plus','Yuan Pro','Sealion 7']},
  'GWM':{P:['Poer','Cannon','Wingle 7'],SUV:['Tank 300'],H:['Ora 03']},
  'Haval':{SUV:['H2','H6','Jolion','H9','Dargo','F7']},
  'JAC':{S:['J4'],H:['E10X'],P:['Frison T6','Frison T8','Frison T9','T6','T8'],SUV:['S2','S3','S4','S7','Sei2','Sei3','Sei4','Sei7','E40X'],V:['Sunray'],CC:['X200','X350']},
  'Chirey':{S:['Arrizo 5','Arrizo 8'],SUV:['Tiggo 2 Pro','Tiggo 4 Pro','Tiggo 7 Pro','Tiggo 8 Pro']},
  'Chery':{S:['Arrizo 5'],H:['QQ','Face'],SUV:['Tiggo 2','Tiggo 4','Tiggo 7','Tiggo 8']},
  'Geely':{S:['Emgrand','Cityray'],H:['Geometry C'],SUV:['Coolray','Tugella','Azkarra','Okavango','Starray','Monjaro']},
  'OMODA':{SUV:['C5','O5','E5','OMODA 5','OMODA C5','OMODA E5']},
  'Jaecoo':{SUV:['7','J7']},
  'Jetour':{SUV:['X70','X90','X50','T2','Dashing']},
  'Changan':{S:['Alsvin','UNI-V'],P:['Hunter'],SUV:['CS35 Plus','CS55 Plus','UNI-T','UNI-K']},
  'GAC':{S:['GA4','Empow'],SUV:['GS3','GS4','GS5','GS8','Emkoo','Emzoom','Aion Y'],V:['GN8']},
  'BAIC':{S:['U5','EU5'],SUV:['X35','X55','BJ30','BJ40','X7']},
  'DFSK':{SUV:['Glory 500','Glory 560','Glory 580','Glory 600'],V:['C35'],CR:['C31','K01']},
  'Foton':{P:['Tunland'],V:['Toano','View'],CC:['Aumark','Miler']},
  'Neta':{S:['Neta S'],C:['Neta GT'],SUV:['Neta V','Neta U','Neta X']},
  'ZOTYE':{SUV:['T600']},
  'Great Wall':{},'FAW':{},'Huawei AITO':{},
  'Zacua':{H:['MX2','MX3']},
  // ── CAMIONES, TRACTOCAMIONES Y AUTOBUSES ──
  'Kenworth':{T:['T680','T880','T800','W900','C500'],CC:['T370']},
  'Freightliner':{T:['Cascadia','Columbia','Century','Coronado'],CC:['M2 106','M2 112']},
  'International':{T:['LT','ProStar','Lonestar','9200','9400'],CC:['4300','4400','MV','HV','DuraStar','CV']},
  'Peterbilt':{T:['579','389','567','386'],CC:['520','337','348']},
  'Mack':{T:['Anthem','Granite','Pinnacle','Vision']},
  'Hino':{CC:['Serie 300','Serie 500','Dutro'],T:['Serie 700']},
  'Scania':{T:['Serie R','Serie G','Serie S'],CC:['Serie P'],A:['Serie K']},
  'DINA':{A:['Runner','Linner','Outsider']},
  'Irizar':{A:['i6','i6S','i8','Century']},
  // ── MOTOCICLETAS ──
  'Italika':{M:['FT125','FT150','FT180','FT200','DM125','DM150','DM200','DM250','DS125','DS150','WS150','WS175','XS150','CS125','GS150','RT180','RT200','RT250','125Z','150Z','250Z','Vort-X 200','Vort-X 300','Blackbird 250','TC200','TC250','Forza 150','Modena 150','Modena 250','D125','AT110','AT125','Strada 200','Argos 150'],Q:['ATV150','ATV200']},
  'Vento':{M:['Rocketman 125','Rocketman 150','Rocketman 250','Tornado 250','Workman 150','Workman 250','Nitrox 200','Nitrox 250','Screamer 250','Cyclone 250','Crossmax 250','Atom 50']},
  'Yamaha':{M:['FZ 150','FZ 25','FZ-S','MT-03','MT-07','MT-09','R3','R15','YZF-R1','NMAX 155','XMAX 300','TMAX 560','XTZ 125','XTZ 150','XTZ 250','Fazer 250','Aerox 155','Crypton','BWS 125','YBR 125','Ténéré 700','Bolt','V-Star'],Q:['Grizzly 700','Kodiak 450','Raptor 700','YFZ450R']},
  'Kawasaki':{M:['Ninja 250','Ninja 400','Ninja 500','Ninja 650','Ninja 1000','Ninja ZX-6R','Ninja ZX-10R','Z400','Z500','Z650','Z900','Versys 300','Versys 650','Versys 1000','KLX 150','KLX 230','KLX 300','KLR 650','W800','Vulcan S'],Q:['Brute Force 300','Brute Force 750','Mule']},
  'Bajaj':{M:['Pulsar NS 125','Pulsar NS 160','Pulsar NS 200','Pulsar N 250','Pulsar RS 200','Pulsar 125','Pulsar 150','Pulsar 180','Dominar 250','Dominar 400','Boxer CT 100','Boxer 150','Platina 125','Avenger 220','Avenger Street 160'],TR:['RE']},
  'KTM':{M:['Duke 200','Duke 250','Duke 390','Duke 890','RC 200','RC 390','Adventure 390','Adventure 890','EXC 300']},
  'Royal Enfield':{M:['Meteor 350','Classic 350','Bullet 350','Hunter 350','Thunderbird 350','Himalayan 411','Himalayan 450','Scram 411','Interceptor 650','Continental GT 650','Super Meteor 650','Shotgun 650']},
  'Harley-Davidson':{M:['Sportster 883','Sportster 1200','Iron 883','Iron 1200','Nightster','Street 500','Street 750','X 350','X 500','Fat Boy','Heritage Classic','Street Bob','Softail Standard','Breakout','Low Rider','Road King','Street Glide','Road Glide','Ultra Limited','Pan America 1250']},
  'Ducati':{M:['Monster','Monster 797','Monster 1200','Panigale V2','Panigale V4','Streetfighter V2','Streetfighter V4','Scrambler 800','Scrambler 1100','Multistrada V4','Hypermotard','DesertX','Diavel']},
  'Triumph':{M:['Speed 400','Scrambler 400 X','Trident 660','Street Triple','Speed Triple','Tiger 660','Tiger 900','Tiger 1200','Bonneville T100','Bonneville T120','Speed Twin','Rocket 3']},
  'Benelli':{M:['TNT 135','180S','302S','Leoncino 250','Leoncino 500','TRK 251','TRK 502','Imperiale 400']},
  'Kymco':{M:['Agility 125','Like 150','People S','X-Town','DTX 360','AK 550']},
  'Keeway':{M:['RKS 150','RKV 200','Superlight 200','K-Light 202']},
  'CFMoto':{M:['250NK','300NK','450NK','650NK','300SR','450SR','450MT','650MT','800MT','700CL-X','Papio'],Q:['CFORCE 450','CFORCE 600','CFORCE 1000','UFORCE','ZFORCE']},
  'Hero':{M:['Splendor','Glamour','HF Deluxe','Passion','Hunk 160R','Ignitor 125','Xtreme 160R','Xpulse 200']},
  'TVS':{M:['Apache RTR 160','Apache RTR 200','Apache RR 310','Ronin','Raider 125','NTORQ 125','Jupiter','Star City'],TR:['King']},
  'Carabela':{M:['Goliath 150','Speeder 150','RT 200','Defiant 250','Ranger 150']},
  'Shineray':{M:['XY 150','XY 200','Eagle 200','Hunter 200']},
  'Can-Am':{Q:['Outlander','Renegade','Maverick','Defender','Commander'],TR:['Spyder','Ryker']},
  'Polaris':{Q:['Sportsman 450','Sportsman 570','Sportsman 850','RZR','Ranger','General'],TR:['Slingshot']},
  // ── BICICLETAS Y SCOOTERS ELÉCTRICOS ──
  'Benotto':{B:['Montaña','Ruta','Urbana','Cross','BMX']},
  'Mercurio':{B:['Montaña','Ruta','Urbana','Cross','BMX']},
  'Alubike':{B:['Montaña','Ruta','Urbana']},
  'Trek':{B:['Marlin','Fuel EX','Domane','Émonda','FX']},
  'Specialized':{B:['Rockhopper','Stumpjumper','Allez','Tarmac','Sirrus']},
  'Giant':{B:['Talon','Trance','TCR','Escape']},
  'Xiaomi':{E:['Mi Electric Scooter','Electric Scooter 4','Electric Scooter 4 Pro']},
  'Segway':{E:['Ninebot Max G30','Ninebot E2','Ninebot F40','Ninebot G2']},
};

// Otros nombres con los que se escribe o se lee la marca
const MARCA_ALIAS={'vw':'Volkswagen','volks wagen':'Volkswagen','chevy':'Chevrolet','gm':'Chevrolet','mercedes':'Mercedes-Benz','mercedes benz':'Mercedes-Benz','benz':'Mercedes-Benz','harley':'Harley-Davidson','harley davidson':'Harley-Davidson','great wall motors':'GWM','land rover':'Land Rover','range rover':'Land Rover','alfa':'Alfa Romeo','citroen':'Citroën','can am':'Can-Am','cf moto':'CFMoto','royal':'Royal Enfield','ninebot':'Segway'};
// Apodos de modelos: texto → [marca, modelo]
const MODELO_ALIAS={'vocho':['Volkswagen','Sedán'],'escarabajo':['Volkswagen','Sedán'],'chevy':['Chevrolet','Chevy'],'pick up nissan':['Nissan','NP300']};

// ── Índices derivados (no editar: se calculan del catálogo) ──
const MARCAS=Object.keys(VEHICULOS).sort((a,b)=>a.localeCompare(b,'es'));
const SUBMARCAS={};
const _VEH_IDX=[];
function normVeh(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[-_.\/!]/g,' ').replace(/\s+/g,' ').trim();}
function compactVeh(s){return normVeh(s).replace(/ /g,'');}
MARCAS.forEach(marca=>{
  SUBMARCAS[marca]=[];
  Object.entries(VEHICULOS[marca]).forEach(([clave,modelos])=>{
    modelos.forEach(modelo=>{
      SUBMARCAS[marca].push(modelo);
      _VEH_IDX.push({marca,modelo,tipo:TIPO_CLAVE[clave],norm:normVeh(modelo),compact:compactVeh(modelo)});
    });
  });
});
const TODAS_SUBMARCAS=[...new Set(_VEH_IDX.map(x=>x.modelo))].sort((a,b)=>a.localeCompare(b,'es'));

// Marca escrita como sea ("nissan", "VW", "MERCEDES BENZ") → nombre del catálogo
function buscarMarca(texto){
  const n=normVeh(texto);
  if(!n)return'';
  if(MARCA_ALIAS[n])return MARCA_ALIAS[n];
  return MARCAS.find(m=>normVeh(m)===n)||MARCAS.find(m=>compactVeh(m)===n.replace(/ /g,''))||'';
}

// Busca el modelo dentro del texto (p. ej. "VERSA ADVANCE" → Versa).
// Devuelve {marca, modelo, tipo}; marca o tipo quedan vacíos si hay
// varias marcas posibles con tipos distintos. null si no se reconoce.
function detectarVehiculo(marcaTexto,modeloTexto){
  const marca=buscarMarca(marcaTexto);
  const n=normVeh(modeloTexto),c=compactVeh(modeloTexto);
  if(!n)return null;
  const alias=MODELO_ALIAS[n];
  if(alias&&(!marca||marca===alias[0])){
    const hit=_VEH_IDX.find(x=>x.marca===alias[0]&&x.modelo===alias[1]);
    if(hit)return{marca:hit.marca,modelo:hit.modelo,tipo:hit.tipo,exacto:false};
  }
  const pool=marca?_VEH_IDX.filter(x=>x.marca===marca):_VEH_IDX;
  let hits=pool.filter(x=>x.compact===c);
  const exacto=hits.length>0;
  if(!hits.length){
    // El texto empieza con el modelo: gana el modelo más largo
    const pref=pool.filter(x=>n.startsWith(x.norm+' ')||(x.compact.length>=3&&c.startsWith(x.compact)));
    if(pref.length){
      const max=Math.max(...pref.map(x=>x.compact.length));
      hits=pref.filter(x=>x.compact.length===max);
    }
  }
  if(!hits.length)return null;
  const marcas=[...new Set(hits.map(x=>x.marca))];
  const tipos=[...new Set(hits.map(x=>x.tipo))];
  return{marca:marcas.length===1?marcas[0]:'',modelo:hits[0].modelo,tipo:tipos.length===1?tipos[0]:'',exacto};
}

// Tipo escrito en la tarjeta de circulación ("SEDAN 4 PTAS", "VAGONETA"...)
const TIPO_PALABRAS=[
  [/motocicleta|\bmoto\b|motoneta|scooter a gasolina/,'Motocicleta'],
  [/cuatrimoto|\batv\b|utv/,'Cuatrimoto'],
  [/bicicleta/,'Bicicleta'],
  [/monopatin|scooter/,'Monopatín / Scooter eléctrico'],
  [/triciclo|mototaxi/,'Triciclo'],
  [/tracto|trailer|quinta rueda/,'Tráiler'],
  [/microbus/,'Microbús'],
  [/autobus|omnibus/,'Autobús'],
  [/camion(?!eta)|chasis cabina|estacas|volteo|torton|rabon/,'Camión de carga'],
  [/panel|reparto|furgoneta/,'Camioneta de reparto'],
  [/pick ?up|pickup|cabina (sencilla|doble)/,'Pick up'],
  [/\bvan\b|minivan|mini van|pasajeros/,'Van / Minivan'],
  [/vagoneta|\bsuv\b|deportivo utilitario|sport utility/,'Camioneta SUV'],
  [/hatch|hb\b|5 ?(p|ptas|puertas)\b|3 ?(p|ptas|puertas)\b/,'Hatchback'],
  [/coupe|cupe|2 ?(p|ptas|puertas)\b|convertible/,'Coupé'],
  [/sedan|4 ?(p|ptas|puertas)\b/,'Sedán'],
];
function tipoDesdeTexto(texto){
  const n=normVeh(texto);
  if(!n)return'';
  const hit=TIPO_PALABRAS.find(([re])=>re.test(n));
  return hit?hit[1]:'';
}
