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

const MARCAS=['Acura','Alfa Romeo','Audi','BAIC','Bajaj','BYD','BMW','Buick','Cadillac','Carabela','Chery','Chevrolet','Chrysler','Citroën','Cupra','DFSK','Dodge','Ducati','FAW','Ferrari','Fiat','Ford','GAC','Geely','Genesis','GMC','Great Wall','GWM','Harley-Davidson','Haval','Hero','Honda','Huawei AITO','Hyundai','Infiniti','Isuzu','Italika','JAC','Jaguar','Jeep','Jetour','Kawasaki','Kia','KTM','Lamborghini','Land Rover','Lexus','Lincoln','Maserati','Mazda','Mercedes-Benz','MG','MINI','Mitsubishi','Neta','Nissan','OMODA','Peugeot','Porsche','RAM','Renault','Royal Enfield','SEAT','Shineray','Subaru','Suzuki','Tesla','Toyota','TVS','Vento','Volkswagen','Volvo','Yamaha','Zacua','ZOTYE'];

const SUBMARCAS={
  // ── MOTOS ──
  'Bajaj':['Pulsar NS 160','Pulsar NS 200','Pulsar N 250','Pulsar RS 200','Dominar 400','Boxer CT 100','Avenger 220','Pulsar 125'],
  'Yamaha':['FZ 150','FZ 250','FZ-S','MT-03','MT-07','R3','R15','NMAX 155','TMAX 560','XTZ 125','XTZ 250','Fazer 250','Aerox 155','Bolt','V-Star'],
  'Kawasaki':['Ninja 250','Ninja 400','Ninja 650','Ninja 1000','Z400','Z650','Z900','Versys 300','Versys 650','KLX 150','KLX 300','W800'],
  'Suzuki':['GN 125','GS 150','GSX-R 150','GSX-R 600','GSX-R 1000','V-Strom 650','V-Strom 1050','Gixxer 150','Burgman 200','DR 650'],
  'KTM':['Duke 200','Duke 390','Duke 890','RC 200','RC 390','Adventure 390','Adventure 890','Duke 250','EXC 300'],
  'Royal Enfield':['Meteor 350','Classic 350','Bullet 350','Himalayan 450','Hunter 350','Thunderbird 350','Interceptor 650','Continental GT 650'],
  'Honda Moto':['CB 150F','CB 190R','CBR 250R','CBR 600RR','CBR 1000RR','CRF 150F','CRF 300L','CB500F','CB500X','Forza 350','PCX 150','Wave 110','XR 150L','ADV 150','Monkey'],
  'Italika':['FT 125','FT 150','DS 150','GS 150','CS 125','WS 150','Argos 150','Strada 200','TC 200','Forza 150'],
  'Carabela':['Goliath 150','Speeder 150','RT 200','Defiant 250','Ranger 150'],
  'Harley-Davidson':['Sportster 883','Sportster 1200','Street 500','Street 750','Iron 883','Iron 1200','Fat Boy','Road King','Street Glide','Road Glide','Softail Standard','Breakout','Low Rider'],
  'Ducati':['Monster 797','Monster 1200','Monster SP','Panigale V2','Panigale V4','Scrambler 800','Scrambler 1100','Multistrada V4','Diavel'],
  'Hero':['Splendor','Glamour','HF Deluxe','Passion','Xtreme 160R','Xpulse 200'],
  'TVS':['Apache RTR 160','Apache RTR 200','Raider 125','NTORQ 125','Jupiter'],
  'Shineray':['XY 150','XY 200','Eagle 200','Hunter 200'],
  // ── AUTOS JAPONESES ──
  'Nissan':['Versa','Sentra','Tiida','Altima','Maxima','Frontier','NP300','Kicks','X-Trail','Pathfinder','Murano','Armada','March','Note','Leaf','Ariya','Z','GT-R','370Z'],
  'Toyota':['Corolla','Camry','Yaris','Avanza','Hilux','Tacoma','RAV4','Fortuner','Land Cruiser','4Runner','Prius','C-HR','Sienna','Sequoia','Tundra','BZ4X','GR86','Supra'],
  'Honda':['Civic','Accord','City','Fit','HR-V','CR-V','Pilot','Odyssey','Ridgeline','Passport','Prologue','ZR-V','Integra','e:NY1'],
  'Mazda':['Mazda 2','Mazda 3','Mazda 6','CX-3','CX-30','CX-5','CX-50','CX-9','CX-90','BT-50','MX-5','MX-30'],
  'Mitsubishi':['Mirage','Outlander','Eclipse Cross','ASX','L200','Montero','Galant','Lancer'],
  'Subaru':['Impreza','Legacy','Outback','Forester','XV','BRZ','WRX','Ascent'],
  'Suzuki Auto':['Swift','Vitara','S-Cross','Jimny','Ertiga','Grand Vitara','Ciaz','Dzire'],
  'Isuzu':['D-Max','MU-X','NPR','NQR','NLR','FVR'],
  // ── AUTOS AMERICANOS ──
  'Chevrolet':['Aveo','Spark','Onix','Cavalier','Malibu','Camaro','Trax','Equinox','Blazer','Traverse','Silverado','Colorado','Tahoe','Suburban','Express','Montana','Trailblazer'],
  'Ford':['Fiesta','Focus','Fusion','Mustang','Mustang Mach-E','EcoSport','Escape','Edge','Explorer','Expedition','Ranger','F-150','F-150 Lightning','F-250','F-350','Transit','Maverick','Bronco','Bronco Sport'],
  'Dodge':['Attitude','Neon','Charger','Challenger','Durango','Journey','Hornet'],
  'RAM':['700','1500','2500','3500','ProMaster','ProMaster City','TRX'],
  'Jeep':['Renegade','Compass','Cherokee','Grand Cherokee','Grand Cherokee L','Wrangler','Gladiator','Avenger'],
  'GMC':['Sierra','Canyon','Terrain','Acadia','Yukon','Envoy','Savana'],
  'Buick':['Encore','Enclave','Envision','LaCrosse'],
  'Cadillac':['CT4','CT5','XT4','XT5','XT6','Escalade','LYRIQ'],
  'Lincoln':['Corsair','Nautilus','Aviator','Navigator'],
  'Chrysler':['300','Pacifica','Voyager'],
  // ── AUTOS EUROPEOS ──
  'Volkswagen':['Vento','Jetta','Golf','Polo','Virtus','Taigo','Tiguan','Taos','T-Cross','T-Roc','Amarok','Transporter','Crafter','ID.4','ID.3','Passat','Arteon'],
  'Audi':['A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q5','Q7','Q8','TT','RS3','RS6','e-tron','Q4 e-tron'],
  'BMW':['Serie 1','Serie 2','Serie 3','Serie 4','Serie 5','Serie 7','X1','X2','X3','X4','X5','X6','X7','Z4','iX','i4','i7'],
  'Mercedes-Benz':['Clase A','Clase B','Clase C','Clase E','Clase S','GLA','GLB','GLC','GLE','GLS','AMG GT','Sprinter','Vito','EQA','EQB','EQC','EQE','EQS'],
  'MINI':['Cooper','Countryman','Clubman','Paceman','Convertible','Aceman'],
  'Porsche':['Cayenne','Macan','Panamera','911','Taycan','718 Boxster','718 Cayman'],
  'Land Rover':['Defender','Discovery','Range Rover','Range Rover Sport','Range Rover Evoque','Range Rover Velar','Freelander'],
  'Jaguar':['XE','XF','XJ','F-Type','E-Pace','F-Pace','I-Pace'],
  'Volvo':['S60','S90','V60','V90','XC40','XC60','XC90','C40'],
  'Peugeot':['208','308','3008','5008','2008','408','508','Partner','Expert'],
  'Citroën':['C3','C4','C5','Berlingo','Jumpy'],
  'Renault':['Logan','Sandero','Stepway','Duster','Koleos','Captur','Clio','Megane','Kangoo','Master','Zoe'],
  'SEAT':['Ibiza','Leon','Arona','Ateca','Tarraco','Cupra Formentor'],
  'Cupra':['Formentor','Born','Ateca','Leon'],
  'Alfa Romeo':['Giulia','Stelvio','Tonale','Giulietta'],
  'Fiat':['500','Mobi','Uno','Pulse','Fastback','Toro','Doblo','Ducato'],
  'Maserati':['Ghibli','Quattroporte','Levante','Grecale','MC20'],
  'Lamborghini':['Huracán','Urus','Revuelto'],
  'Ferrari':['F8','Roma','SF90','488','Portofino','Purosangue'],
  // ── AUTOS COREANOS ──
  'Hyundai':['Accent','Elantra','Sonata','Tucson','Santa Fe','Creta','Grand i10','Ioniq 5','Ioniq 6','Palisade','Venue','Kona','Staria'],
  'Kia':['Rio','Forte','K5','Sportage','Sorento','Carnival','Stinger','EV6','EV9','Seltos','Sonet','Telluride','Niro'],
  'Genesis':['G70','G80','G90','GV70','GV80'],
  // ── AUTOS CHINOS ──
  'MG':['MG5','MG6','MG ZS','MG HS','MG4','RX5','RX8','Cyberster','One'],
  'BYD':['Atto 3','Dolphin','Seal','Han','Tang','Seagull','Song Plus','Song Pro','Yuan Plus','Destroyer 05'],
  'Haval':['H2','H6','Jolion','H9','Dargo','Xianglong','F7'],
  'GWM':['Poer','Cannon','Wingle 7','WEY Coffee 01'],
  'JAC':['S3','S4','S7','T6','T8','E10X','iEV7S','Sei4','Sei7'],
  'Chery':['Tiggo 2','Tiggo 4','Tiggo 7','Tiggo 8','Arrizo 5','QQ'],
  'Geely':['Coolray','Emgrand','Tugella','Azkarra','Okavango'],
  'OMODA':['OMODA 5','OMODA C5','OMODA E5'],
  'Jetour':['X70','X90','T2','Dashing'],
  'DFSK':['Glory 500','Glory 560','Glory 580','K01','C35L'],
  'BAIC':['X35','X55','BJ40','X7','EU5'],
  'GAC':['GS3','GS4','GS5','GS8','GA4','Empow'],
  'Neta':['Neta V','Neta U','Neta S','Neta GT'],
  'Acura':['ILX','TLX','RDX','MDX','NSX','Integra'],
  'Infiniti':['Q50','Q60','QX50','QX55','QX60','QX80'],
  'Lexus':['ES','IS','LS','NX','RX','GX','LX','UX','LC','RC','LBX'],
  'Lincoln':['Corsair','Nautilus','Aviator','Navigator'],
  'Tesla':['Model 3','Model Y','Model S','Model X','Cybertruck'],
  'Vento':['Colt','Fiesta','Pegaso','Noble','Crossover','Veloz','Wind','Electra'],
  'Zacua':['MX2','MX3'],
};

const CURP_ESTADOS={'AS':'Aguascalientes','BC':'Baja California','BS':'Baja California Sur','CC':'Campeche','CS':'Chiapas','CH':'Chihuahua','DF':'Ciudad de México','CL':'Coahuila','CM':'Colima','DG':'Durango','GT':'Guanajuato','GR':'Guerrero','HG':'Hidalgo','JC':'Jalisco','MC':'Estado de México','MN':'Michoacán','MS':'Morelos','NT':'Nayarit','NL':'Nuevo León','OC':'Oaxaca','PL':'Puebla','QT':'Querétaro','QR':'Quintana Roo','SP':'San Luis Potosí','SL':'Sinaloa','SR':'Sonora','TC':'Tabasco','TS':'Tamaulipas','TL':'Tlaxcala','VZ':'Veracruz','YN':'Yucatán','ZS':'Zacatecas','NE':'Extranjero'};

const NUM_ESTADOS={'01':'Aguascalientes','02':'Baja California','03':'Baja California Sur','04':'Campeche','05':'Coahuila','06':'Colima','07':'Chiapas','08':'Chihuahua','09':'Ciudad de México','10':'Durango','11':'Guanajuato','12':'Guerrero','13':'Hidalgo','14':'Jalisco','15':'Estado de México','16':'Michoacán','17':'Morelos','18':'Nayarit','19':'Nuevo León','20':'Oaxaca','21':'Puebla','22':'Querétaro','23':'Quintana Roo','24':'San Luis Potosí','25':'Sinaloa','26':'Sonora','27':'Tabasco','28':'Tamaulipas','29':'Tlaxcala','30':'Veracruz','31':'Yucatán','32':'Zacatecas'};

const MOTIVOS=['Prevención del delito','Vigilancia y seguridad pública','Actitud o conducta sospechosa','Reporte ciudadano','Operativo de seguridad','Verificación de identidad','Falta administrativa','Alteración del orden público','Punto de revisión','Apoyo a otra corporación','Atención a grupo vulnerable','Merodeo'];
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
