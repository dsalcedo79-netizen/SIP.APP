"use strict";
/* ============================================================
   SIP · Maestría de Vida — App del Ciclo de Transformación
   VIVE • CRECE • CONTRIBUYE
   Navegación = el viaje de 5 fases. Compuertas: Fases 1 y 2
   obligatorias → Plan de 90 Días → Mi Día (progresivo) →
   Evolución (cortes cada 15 días). Coach IA vía /api/chat.
   ============================================================ */

// ---------- Metodología ----------
const GRUPOS = [
  ["Del Ser", ["Espiritual","Emocional","Mental","Cuerpo","Personalidad"]],
  ["Del Hacer", ["Familiar","Social","Profesional"]],
  ["Del Tener", ["Financiero","Calidad de Vida"]]
];
const DIMS = GRUPOS.flatMap(g=>g[1]);
const OBJETIVOS = {
  "Espiritual":"Conectar con tu yo interior y tu entorno",
  "Emocional":"Sentirte bien la mayor parte del tiempo",
  "Mental":"Aumentar el conocimiento y dominar la mente a tu favor",
  "Cuerpo":"Tener un estilo de vida saludable, un cuerpo sano y en forma",
  "Personalidad":"Fuerza de carácter y valores constructivos",
  "Familiar":"Tener una buena relación familiar y de pareja",
  "Social":"Tener buenas amistades",
  "Profesional":"Desarrollar habilidades que te hagan mejor profesional",
  "Financiero":"Tener múltiples fuentes de ingreso",
  "Calidad de Vida":"Tener grandes experiencias de vida"
};
// ---- Catalogo unico de las 10 areas de vida ----
// `id` es la clave de almacenamiento y no cambia nunca. `rueda` es el nombre que usa
// la Rueda de la Vida; `workbook` el del cuaderno impreso "Plan Anual de Vida".
// Antes cada taller guardaba con el nombre que mostraba, y los datos no se podian cruzar.
const AREAS = [
  {id:"espiritual",   rueda:"Espiritual",      workbook:"Espiritual"},
  {id:"emocional",    rueda:"Emocional",       workbook:"Emocional"},
  {id:"mental",       rueda:"Mental",          workbook:"Mental"},
  {id:"salud",        rueda:"Cuerpo",          workbook:"Salud"},
  {id:"personalidad", rueda:"Personalidad",    workbook:"Personalidad"},
  {id:"familiar",     rueda:"Familiar",        workbook:"Familiar"},
  {id:"social",       rueda:"Social",          workbook:"Social"},
  {id:"ocupacional",  rueda:"Profesional",     workbook:"Ocupacional"},
  {id:"economico",    rueda:"Financiero",      workbook:"Economico"},
  {id:"calidad_vida", rueda:"Calidad de Vida", workbook:"Calidad de Vida"}
];
const AREA_POR_RUEDA = Object.fromEntries(AREAS.map(a=>[a.rueda,a]));

const MED_MAPA = ["Espiritualidad · Conexión con Dios","Salud Mental, Emocional y Física","Carácter","Relaciones · Familia","Finanzas · Abundancia","Vocación · Vida Profesional","Visión · Propósito de Vida"];
const MOODS = [["enojado","😠"],["cansado","😴"],["triste","😢"],["feliz","😊"],["emocionado","🤩"]];
const FRASES = [
  "Tú eres el protagonista y escritor de tu destino.",
  "La vida es o una gran aventura o repetición de lo mismo. Tú eres el autor.",
  "Como es adentro, es afuera: tu exterior es el resultado de tu interior.",
  "Obtienes aquello en lo que te enfocas. Enfócate en lo que quieres.",
  "Lo que pasa por tu mente, pasa por tu vida.",
  "La transformación no ocurre cuando haces un plan; ocurre cuando ejecutas todos los días.",
  "Un viaje de muchas millas comienza con un simple paso.",
  "Nunca pierdas tu esencia de grandeza.",
  "Siempre tu humildad te hará enorme.",
  "Cambia tu vida hoy: actúa ahora, sin demora, disfrutando cada momento.",
  "Para trazar la ruta de tu destino debes saber dónde estás y para dónde vas.",
  "La felicidad es una decisión, no un destino.",
  "Cuando nos enfocamos en la gratitud, la vida se expande.",
  "Pequeñas victorias diarias construyen carácter.",
  "La constancia es tu superpoder: protégela.",
  "Nuestra vida es muy corta: haz que valga la pena.",
  "Vive con propósito, crece sin pausa, contribuye con amor.",
  "Tus creencias construyen tu realidad: elígelas.",
  "Hoy es una nueva oportunidad de avanzar hacia la vida que deseas.",
  "El compromiso contigo mismo es el más importante de todos.",
  "Vive • Crece • Contribuye."
];
const TEMP_NOMBRES = ["Sanguíneo","Colérico","Melancólico","Flemático"];
const TEMP_DESC = {
  "Sanguíneo":"Entusiasta, sociable y optimista. Tu energía contagia. Reto: constancia y enfoque.",
  "Colérico":"Decidido, líder natural y orientado a resultados. Reto: paciencia y empatía.",
  "Melancólico":"Profundo, analítico y perfeccionista. Sientes y piensas con intensidad. Reto: soltar la autocrítica.",
  "Flemático":"Sereno, confiable y pacificador. Tu calma es un regalo. Reto: iniciativa y decisión."
};
const TEMP_QS = [
  {q:"En una reunión social, normalmente...", o:["Hablo con todos y cuento historias","Dirijo la conversación hacia planes y acciones","Observo y converso a fondo con pocos","Escucho tranquilo y disfruto sin protagonismo"]},
  {q:"Frente a un problema nuevo...", o:["Busco a alguien y lo resolvemos hablando","Tomo el control y decido rápido","Analizo todas las variables antes de actuar","Espero con calma, suele resolverse"]},
  {q:"Mi mayor fortaleza es...", o:["Mi alegría y espontaneidad","Mi determinación","Mi profundidad y sensibilidad","Mi estabilidad y paciencia"]},
  {q:"Lo que más me molesta es...", o:["El aburrimiento y la rutina","La lentitud y la indecisión","El desorden y la superficialidad","El conflicto y la presión"]},
  {q:"Cuando trabajo en equipo...", o:["Animo y motivo al grupo","Organizo y dirijo","Cuido la calidad de los detalles","Mantengo la armonía"]},
  {q:"Mis emociones...", o:["Se notan al instante y cambian rápido","Se convierten en acción (a veces enojo)","Son profundas y duraderas","Rara vez me desbordan"]},
  {q:"Ante un cambio inesperado...", o:["¡Me emociona la novedad!","Lo aprovecho para avanzar","Necesito tiempo para procesarlo","Me adapto sin drama"]},
  {q:"La gente diría que soy...", o:["Divertido y expresivo","Fuerte y decidido","Sensible y detallista","Tranquilo y confiable"]}
];
// ---- El Plan de Vuelo (decisión CEO): los 90 días como un vuelo ----
const ETAPAS = [
  [1,15,"🗺 Preparación del Vuelo","Completa tu Estado Actual y tu Plan de Vida: el sistema autoriza el despegue cuando ambos estén listos."],
  [16,30,"🛫 Despegue","Toda la velocidad: compromiso firmado, nuevas rutinas y hábitos. Da lo mejor de ti."],
  [31,45,"📈 Ascenso","Estás cogiendo altura: consolida tus nuevos hábitos día a día."],
  [46,60,"✈️ Vuelo crucero","Mantén el rumbo: la rutina ya es tuya, vuela con constancia."],
  [61,75,"🛬 Aproximación","Haz correcciones con tu Coach y enfila hacia tus metas: el destino está cerca."],
  [76,90,"🏁 Aterrizaje","Cierra tus metas: resultados, nueva rueda, lecciones, celebración y nuevo destino."]
];
function etapaDe(d){ return ETAPAS.find(([a,b])=>d>=a&&d<=b) || ETAPAS[ETAPAS.length-1]; }
// Taller 27 del cuaderno: los habitos se deciden, no solo se listan.
const HABITO_TIPOS = [
  ["comenzar","Debo comenzar","🌱"],
  ["fortalecer","Debo fortalecer","💪"],
  ["eliminar","Debo eliminar","🚫"]
];
const RUT_M = ["Despertar y agradecer","Meditación del día","Leer mi Declaración de Vida","Revisar mis 3 prioridades"];
const RUT_N = ["Evaluar mi día","Gratitud y aprendizajes","Preparar el día de mañana"];
const PREGUNTAS_AREA = [
  ["hoy","1. ¿Cómo describes esta área hoy?"],
  ["trascender","2. ¿Qué te gustaría trascender en esta área?"],
  ["experiencias","3. ¿Qué experiencias te gustaría vivir?"],
  ["crecer","4. ¿Cómo te gustaría crecer?"],
  ["contribuir","5. ¿Cómo podrías contribuir?"],
  ["limita","6. ¿Qué te limita hacerlo?"],
  ["creencias_actuales","Mis creencias actuales"],
  ["nuevas_creencias","Mis nuevas creencias"]
];
const FASES = [
  ["estado","1 · Estado Actual","¿Dónde estás hoy?"],
  ["plan","2 · Plan de Vida","¿Hacia dónde quieres ir?"],
  ["noventa","3 · Misión de 90 Días","¿Cuál será tu próximo destino?"],
  ["dia","4 · Mi Día","¿Qué harás hoy?"],
  ["evolucion","5 · Mi Evolución","¿Qué has logrado?"],
  ["coach","Coach IA","Tu mentor 24/7"]
];

// ---------- Estado ----------
let state = JSON.parse(localStorage.getItem("sip_v3") || "null") || {
  viaje:{inicio:""},
  perfil:{nombre:"",mision:"",vision:""},
  diagnosticos:[], temperamento:{resp:{},resultado:""},
  foda:{f:"",o:"",d:"",a:""}, ikigai:{amas:"",bueno:"",mundo:"",valor:"",sintesis:""},
  planAnual:{vivir:"",crecer:"",contribuir:"",areas:{}},
  declaracion:"", afirmaciones:[], aformaciones:[], vision:[],
  porqueArea:{}, analisisArea:{}, motivaArea:{},   // Talleres 3, 4 y 5 del cuaderno
  metas:[],
  ciclo:null, ciclos:[],           // ciclo = {inicio,prioridades:[],metas90:[],firma,firmadoEl}
  habitos:[], registros:{}, sesiones:[],
  dias:{},                          // por fecha: {prio:[{t,ok}],rutM:[],rutN:[],mood,gratitud,aprendi,mejora,eval}
  revisiones:{},                    // por semana ISO: {logre,obstaculos,ajustes}
  coach:{token:"",nombre:"",rol:"",modo:"entrar",msgs:[]}
};
state.viaje = state.viaje || {inicio: state.perfil && state.perfil.nombre ? hoyF() : ""};
state.porqueArea   = state.porqueArea   || {};
state.analisisArea = state.analisisArea || {};
state.motivaArea   = state.motivaArea   || {};
// El "Analisis por Area" guardaba con los nombres del cuaderno ("Salud", "CalidadVida").
// Se migran una sola vez a los ids estables de AREAS, sin perder lo ya escrito.
(function migrarClavesDeArea(){
  const viejo = {Espiritual:"espiritual", Emocional:"emocional", Mental:"mental",
    Salud:"salud", Personalidad:"personalidad", Familiar:"familiar", Social:"social",
    Ocupacional:"ocupacional", Economico:"economico", CalidadVida:"calidad_vida"};
  ["porqueArea","analisisArea","motivaArea"].forEach(function(k){
    const o = state[k]; if(!o) return;
    Object.keys(viejo).forEach(function(v){
      if(o[v] === undefined) return;
      if(o[viejo[v]] === undefined && String(o[v]).trim()) o[viejo[v]] = o[v];
      delete o[v];
    });
  });
})();
let vista = "inicio";
function hoyF(){ return new Date().toLocaleDateString("sv-SE"); }
function save(){ localStorage.setItem("sip_v3", JSON.stringify(state)); programarGuardado(); }

// ---------- Sincronizacion con el servidor ----------
// El navegador sigue siendo la copia de trabajo: la app funciona sin conexion
// y no espera al servidor para nada. El servidor guarda la copia durable.
let guardadoTimer = null, subiendo = false, conflicto = null;
let estadoSync = "";   // texto que se muestra al usuario

// El token es de la sesion, no del plan: nunca se guarda en el servidor.
function planParaSubir(){
  const copia = JSON.parse(JSON.stringify(state));
  if(copia.coach) copia.coach.token = "";
  delete copia._rev;
  return copia;
}

// Si el servidor se reinicio, el token guardado ya no vale. Hay que decirlo:
// un guardado que falla en silencio es peor que no tener guardado.
function sesionExpirada(){
  state.coach.token = ""; state.coach.rol = ""; state.coach.modo = "entrar";
  estadoSync = "Tu sesion expiro. Entra de nuevo para seguir guardando.";
  save(); render();
}

function programarGuardado(){
  if(!state.coach || !state.coach.token) return;
  clearTimeout(guardadoTimer);
  guardadoTimer = setTimeout(subirPlan, 2500);
}

async function subirPlan(opciones){
  if(subiendo || !state.coach.token) return;
  subiendo = true;
  const forzar = opciones && opciones.forzar;
  try{
    const r = await fetch("/api/plan",{method:"POST",
      headers:{"Content-Type":"application/json","X-Session":state.coach.token},
      keepalive: true,
      body: JSON.stringify({datos: planParaSubir(),
                            revision: forzar ? (conflicto ? conflicto.revision : state._rev||0)
                                             : (state._rev||0)})});
    if(r.status === 401){ subiendo = false; sesionExpirada(); return; }
    const j = await r.json();
    if(j.ok){ state._rev = j.revision; estadoSync = "Guardado"; conflicto = null; save(); }
    else if(j.conflicto){ conflicto = j; estadoSync = "Hay otra version"; render(); }
    else { estadoSync = j.error || "No se pudo guardar"; }
  }catch(e){ estadoSync = "Sin conexion: guardado local"; }
  subiendo = false;
  const el = document.getElementById("syncMsg"); if(el) el.textContent = estadoSync;
}

// Reemplaza el estado local por el del servidor, conservando la sesion actual.
function aplicarPlan(j){
  const token = state.coach.token, nombre = state.coach.nombre, rol = state.coach.rol;
  state = j.datos;
  state.coach = state.coach || {};
  state.coach.token = token; state.coach.nombre = nombre; state.coach.rol = rol;
  state.coach.modo = "entrar";
  state._rev = j.revision;
  save();
}

function hayDatosLocales(){
  return !!(state.perfil && state.perfil.nombre) ||
         (state.diagnosticos && state.diagnosticos.length > 0);
}

// Al entrar se decide que copia vale. Si ambas tienen contenido no se pisa
// ninguna: se le pregunta a la persona.
async function sincronizarAlEntrar(){
  try{
    const r = await fetch("/api/plan",{headers:{"X-Session":state.coach.token}});
    if(r.status === 401){ sesionExpirada(); return; }
    const j = await r.json();
    if(!j.ok) return;
    if(!j.existe){
      if(hayDatosLocales()) await subirPlan();
      else { state._rev = 0; save(); }
      return;
    }
    if(!hayDatosLocales()){ aplicarPlan(j); return; }
    if((state._rev||0) === j.revision) return;   // al dia
    conflicto = j;                                // dos versiones: decide la persona
  }catch(e){ /* sin conexion: se sigue con la copia local */ }
  render();
  cargarCohorte();
}

function resolverConflicto(cual){
  if(cual === "servidor"){ aplicarPlan(conflicto); conflicto = null; render(); }
  else { const c = conflicto; conflicto = null; state._rev = c.revision;
         save(); subirPlan({forzar:true}); render(); }
}

// Avisa al servidor de un hito del metodo, para poder medir activacion y
// retencion. Silencioso: si falla, el usuario no se entera ni se interrumpe.
function evento(nombre, unaVez){
  if(!state.coach || !state.coach.token) return;
  if(unaVez){
    state.hitos = state.hitos || {};
    if(state.hitos[nombre]) return;
    state.hitos[nombre] = hoy(); save();
  }
  fetch("/api/evento",{method:"POST",
    headers:{"Content-Type":"application/json","X-Session":state.coach.token},
    body:JSON.stringify({evento:nombre})}).catch(function(){});
}
// Los hitos de fase se detectan solos en cada render.
function revisarHitos(){
  actualizarReto();
  if(fase1Done()) evento("fase1", true);
  if(fase2Done()) evento("fase2", true);
}
const hoy = () => new Date().toLocaleDateString("sv-SE");
// Parsea "YYYY-MM-DD" como fecha LOCAL (evita el corrimiento de un día por zona horaria)
function fecha(s){ const [y,m,d]=String(s).split("-").map(Number); return new Date(y, m-1, d); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

document.getElementById("hoyTxt").textContent =
  new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

// ---------- Utilidades ----------
function ultimoDiag(){ return state.diagnosticos.length ? state.diagnosticos[state.diagnosticos.length-1] : null; }
function primerDiag(){ return state.diagnosticos.length ? state.diagnosticos[0] : null; }
function promedio(d){ if(!d) return null; const v=DIMS.map(x=>d.valores[x]||0); return (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1); }
function dimMasBaja(d){ if(!d) return null; let min=DIMS[0]; DIMS.forEach(x=>{ if((d.valores[x]||0)<(d.valores[min]||0)) min=x; }); return min; }
function habitosHoy(){ const r=state.registros[hoy()]||[]; return [state.habitos.filter(h=>r.includes(h.id)).length, state.habitos.length]; }
function racha(){
  let n=0, d=new Date();
  const c = f => (state.registros[f]||[]).length>0;
  if(!c(hoy())) d.setDate(d.getDate()-1);
  while(c(d.toLocaleDateString("sv-SE"))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function diaMed(){ return Math.min(state.sesiones.length+1, 21); }

// ---------- Reto diario ----------
// Un dia cuenta cuando la persona lo CIERRA, es decir cuando lo evalua con
// estrellas. Abrir la app no basta: el reto es el acto deliberado de decir
// "hoy si estuve". El dia de hoy no rompe la racha mientras siga abierto.
function rachaReto(){
  let n = 0, d = new Date();
  const cerrado = f => ((state.dias[f]||{}).eval || 0) > 0;
  if(!cerrado(hoy())) d.setDate(d.getDate()-1);
  while(cerrado(d.toLocaleDateString("sv-SE"))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function cerroHoy(){ return ((state.dias[hoy()]||{}).eval || 0) > 0; }

// La racha se guarda en el plan para que el servidor pueda sumar la del grupo
// sin tener que recorrer el diario de cada persona.
function actualizarReto(){
  state.reto = state.reto || {racha:0, record:0, ultimoDia:""};
  const r = rachaReto();
  const antes = JSON.stringify(state.reto);
  state.reto.racha = r;
  if(r > (state.reto.record||0)) state.reto.record = r;
  if(cerroHoy()) state.reto.ultimoDia = hoy();
  if(JSON.stringify(state.reto) !== antes) save();
}
function fodaOk(){ const f=state.foda; return f.f.trim()&&f.o.trim()&&f.d.trim()&&f.a.trim(); }
function ikigaiOk(){ const k=state.ikigai; return k.amas.trim()&&k.bueno.trim()&&k.mundo.trim()&&k.valor.trim(); }
function fase1Done(){ return !!ultimoDiag() && !!state.temperamento.resultado && !!fodaOk() && !!ikigaiOk(); }
function fase2Done(){ const p=state.planAnual; return !!(p.vivir.trim()&&p.crecer.trim()&&p.contribuir.trim()&&state.declaracion.trim()&&state.metas.length>=3); }
function cicloActivo(){ return state.ciclo && state.ciclo.firma; }
function diaViaje(){
  if(!state.viaje.inicio) return 0;
  const ms = fecha(hoy()) - fecha(state.viaje.inicio);
  return Math.max(1, Math.min(90, Math.round(ms/86400000)+1));
}
function diaCiclo(){ return diaViaje(); }
function D(){ const f=hoy(); return state.dias[f]=state.dias[f]||{prio:[{t:"",ok:false},{t:"",ok:false},{t:"",ok:false}],rutM:[],rutN:[],mood:"",gratitud:"",aprendi:"",mejora:"",eval:0}; }
function semanaISO(){
  const d=new Date(); const t=new Date(d.getFullYear(),0,1);
  const w=Math.ceil((((d-t)/86400000)+t.getDay()+1)/7);
  return d.getFullYear()+"-S"+String(w).padStart(2,"0");
}

// ---------- Radar (con comparativa opcional) ----------
function radar(valores, size=300, comparar=null){
  const c=size/2, R=c-58, N=DIMS.length;
  const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/N; return [(c+r*Math.cos(a)).toFixed(1),(c+r*Math.sin(a)).toFixed(1)];};
  let s=`<svg class="radar" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  for(let g=2;g<=10;g+=2){ s+=`<polygon points="${DIMS.map((_,i)=>pt(i,R*g/10).join(",")).join(" ")}" fill="none" stroke="#e8e2d6"/>`; }
  DIMS.forEach((d,i)=>{
    const [x,y]=pt(i,R), [lx,ly]=pt(i,R+30);
    s+=`<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#e8e2d6"/>`;
    s+=`<text x="${lx}" y="${ly}" font-size="9.5" fill="#6b665d" text-anchor="middle" dominant-baseline="middle">${d}</text>`;
  });
  if(comparar){
    const p0=DIMS.map((d,i)=>pt(i,R*(comparar[d]||1)/10).join(",")).join(" ");
    s+=`<polygon points="${p0}" fill="rgba(201,162,39,.18)" stroke="#c9a227" stroke-width="2" stroke-dasharray="5,4"/>`;
  }
  const pts=DIMS.map((d,i)=>pt(i,R*(valores[d]||1)/10).join(",")).join(" ");
  s+=`<polygon points="${pts}" fill="rgba(31,92,77,.25)" stroke="#1f5c4d" stroke-width="2"/>`;
  return s+"</svg>";
}

// ---------- Navegación (el viaje) ----------
function bloqueada(id){
  if(id==="noventa") return !(fase1Done()&&fase2Done());
  if(id==="dia"||id==="evolucion") return !cicloActivo();
  return false;
}
function hechaFase(id){
  if(id==="estado") return fase1Done();
  if(id==="plan") return fase2Done();
  if(id==="noventa") return cicloActivo();
  if(id==="dia") return cicloActivo() && (state.dias[hoy()]||{}).eval>0;
  if(id==="evolucion") return diaCiclo()>=90;
  return false;
}
function pintarViaje(){
  const pasos = esAdmin() ? FASES.concat([["actividad","Actividad","Quién usa el programa"]]) : FASES;
  document.getElementById("viaje").innerHTML = pasos.map(([id,t,sub])=>{
    const cls=[vista===id?"activo":"", hechaFase(id)?"hecho":"", bloqueada(id)?"bloq":""].join(" ");
    return `<div class="paso ${cls}" onclick="ir('${id}')"><b>${t}</b>${sub}</div>`;
  }).join("");
}
function ir(v){
  if(bloqueada(v)){ vista=v; } // se muestra la compuerta explicativa
  else vista=v;
  render(); window.scrollTo(0,0);
}
function compuertaHTML(){
  const falta=[];
  if(!ultimoDiag()) falta.push("Herramienta 1 · Taller 2 · Mi Rueda de Vida Hoy");
  if(!state.temperamento.resultado) falta.push("Herramienta 2 · Taller 6 · Test de Temperamento");
  if(!fodaOk()) falta.push("Herramienta 3 · Taller 7 · Mi FODA Personal");
  if(!ikigaiOk()) falta.push("Herramienta 4 · Talleres 8 a 11 · Método Ikigai");
  const p=state.planAnual;
  if(!(p.vivir.trim()&&p.crecer.trim()&&p.contribuir.trim())) falta.push("Herramienta 5 · Taller 18 · Las tres preguntas más importantes");
  if(state.metas.length<3) falta.push("Herramienta 7 · Taller 20 · Objetivos por área (mínimo 3)");
  if(!state.declaracion.trim()) falta.push("Herramienta 9 · Taller 22 · Declaración de vida");
  return `<div class="compuerta"><b>🔒 El viaje se recorre en orden.</b>
    <p class="sub" style="margin-top:6px;">Para llegar aquí primero debes conocer tu realidad y diseñar tu futuro. Te falta:</p>
    <ul>${falta.map(x=>`<li>${x}</li>`).join("")}</ul>
    <br><button class="btn" onclick="ir('${!fase1Done()?"estado":"plan"}')">Continuar mi viaje</button></div>`;
}

// ---------- INICIO ----------
function vInicio(){
  if(!state.perfil.nombre){
    return `<div class="card centro">
      <div class="lema">Vive · Crece · Contribuye</div>
      <h2>Bienvenido al Sistema Integral de Propósito</h2>
      <p class="sub">Un viaje guiado por cinco preguntas para transformar tu vida.</p>
      <div style="max-width:320px;margin:14px auto;">
        <input type="text" id="nom" placeholder="¿Cómo te llamas?">
        <br><br><button class="btn" onclick="empezar()">Comenzar mi viaje</button>
      </div></div>`;
  }
  const d=ultimoDiag(), [hh,ht]=habitosHoy(), dc=diaViaje();
  const et = dc ? etapaDe(dc) : null;
  return `<div class="card"><div class="lema">Vive · Crece · Contribuye</div>
    <h2>Hola, ${esc(state.perfil.nombre)} 🌱</h2>
    <p class="sub">${state.declaracion?'"'+esc(state.declaracion.slice(0,140))+'"':"Tu viaje de transformación te espera."}</p>
    ${et?`<div class="insight"><b>Plan de Vuelo · Día ${dc} de 90 · ${et[2]}</b><br>${et[3]}</div>`:""}</div>
    <div class="grid">
      <div class="kpi"><div class="num">${promedio(d)??"–"}</div><div class="lbl">Promedio de vida</div></div>
      <div class="kpi"><div class="num">${dc?("Día "+dc):"–"}</div><div class="lbl">De mis 90 días</div></div>
      <div class="kpi"><div class="num">${ht?hh+"/"+ht:"–"}</div><div class="lbl">Hábitos hoy</div></div>
      <div class="kpi"><div class="num">${racha()} 🔥</div><div class="lbl">Racha</div></div>
    </div>
    ${cicloActivo() ? tarjetaReto() : ""}
    ${tarjetaCohorte()}
    <div class="card centro">
      ${!fase1Done()?`<p class="sub">Tu siguiente paso: <b>Fase 1 · Tu Estado Actual</b></p><button class="btn" onclick="ir('estado')">¿Dónde estás hoy?</button>`
      : !fase2Done()?`<p class="sub">Tu siguiente paso: <b>Fase 2 · Tu Plan de Vida</b></p><button class="btn" onclick="ir('plan')">¿Hacia dónde quieres ir?</button>`
      : !cicloActivo()?`<p class="sub">Tu siguiente paso: <b>Fase 3 · Tu Plan de 90 Días</b></p><button class="btn" onclick="ir('noventa')">Crear mi plan de 90 días</button>`
      : `<p class="sub">Tu centro de operaciones te espera.</p><button class="btn" onclick="ir('dia')">Ir a Mi Día (Día ${dc} de 90)</button>`}
    </div>`;
}
function empezar(){ const n=document.getElementById("nom").value.trim(); if(!n) return; state.perfil.nombre=n; state.viaje.inicio=hoy(); save(); vista="estado"; render(); }

// ---------- FASE 1 · ESTADO ACTUAL ----------
// Los talleres 3, 4 y 5 del cuaderno comparten estructura: una respuesta por cada
// una de las 10 areas. Un solo componente los sirve a los tres.
function bloqueArea(ref, titulo, pregunta, store, placeholder){
  const datos = state[store] || {};
  const llenas = AREAS.filter(a => (datos[a.id]||"").trim()).length;
  return `<details class="area"><summary><span>${ref} · ${titulo}<br><span class="objetivo">${pregunta}</span></span><span class="tag ${llenas===10?"":"dorado"}">${llenas}/10</span></summary>
    <div class="cuerpo">
      ${AREAS.map(a=>`<label class="campo">${a.workbook}${a.workbook!==a.rueda?` <span style="color:var(--gris);font-weight:400;font-size:.9em;">· ${a.rueda} en la rueda</span>`:""}</label><textarea onblur="campoArea('${store}','${a.id}',this.value)" style="min-height:60px;" placeholder="${placeholder}">${esc(datos[a.id])}</textarea>`).join("")}
    </div></details>`;
}
function campoArea(store,id,v){ (state[store]=state[store]||{})[id]=v; save(); pintarViaje(); }

let diagTmp=null;
function vEstado(){
  const d=ultimoDiag();
  diagTmp = diagTmp || (d ? {...d.valores} : Object.fromEntries(DIMS.map(x=>[x,5])));
  const t=state.temperamento;
  let filas="";
  GRUPOS.forEach(([g,areas])=>{
    filas+=`<div class="grupo-titulo">${g}</div>`;
    filas+=areas.map(x=>`<div class="dim-fila"><label>${x}</label>
      <input type="range" min="1" max="10" value="${diagTmp[x]}" oninput="dimCambia('${x}',this.value)">
      <span class="val" id="v-${x.replace(/\s/g,'_')}">${diagTmp[x]}</span></div>`).join("");
  });
  return `<div class="card"><div class="lema">Fase 1 · ¿Dónde estás hoy?</div>
    <h2>Tu Estado Actual</h2>
    <p class="sub">No te estamos evaluando: te estamos ayudando a descubrirte. Completa los 4 talleres.</p></div>

  ${typeof vRuedaHTML==="function" ? vRuedaHTML() : ""}

  <details class="area" ${!d?"open":""}><summary><span>Herramienta 1 · Taller 2 · Mi Rueda de Vida Hoy<br><span class="objetivo">Califícate de 1 a 10 en cada área · versión con deslizadores</span></span><span class="tag ${d?"":"dorado"}">${d?"✓ Completado":"Pendiente"}</span></summary>
    <div class="cuerpo">${filas}
      <br><div class="centro" id="radarBox">${radar(diagTmp)}</div>
      <div class="centro"><button class="btn" onclick="guardarDiag()">Guardar mi rueda</button></div>
      ${state.diagnosticos.length?`<br>${state.diagnosticos.slice().reverse().map(x=>`<div class="lista-item"><span>${x.fecha}</span><span class="tag dorado">Promedio ${promedio(x)}</span></div>`).join("")}`:""}
    </div></details>

  ${bloqueArea("Herramienta 1 · Taller 3","¿Por qué me califiqué así?","Observa el equilibrio entre áreas y reflexiona el porqué de cada calificación","porqueArea","¿Por qué te calificaste así en esta área?")}

  ${bloqueArea("Herramienta 1 · Taller 4","¿Cómo podría mejorar mi calificación en un año?","Define qué harás para subir al menos un nivel","analisisArea","¿Cómo mejorar en esta área?")}

  ${bloqueArea("Herramienta 1 · Taller 5","¿Qué me puede motivar a mejorar?","Identifica motivadores y beneficios de crecer en cada área","motivaArea","¿Qué te motivaría a crecer aquí?")}

  <details class="area"><summary><span>Herramienta 2 · Taller 6 · Identifico qué temperamento tengo<br><span class="objetivo">¿Cómo eres? Los 4 temperamentos clásicos</span></span><span class="tag ${t.resultado?"":"dorado"}">${t.resultado?"✓ "+t.resultado:"Pendiente"}</span></summary>
    <div class="cuerpo">
    ${TEMP_QS.map((item,i)=>`<label class="campo">${i+1}. ${item.q}</label>
      ${item.o.map((op,j)=>`<button class="opcion ${t.resp[i]===j?"sel":""}" onclick="tempResp(${i},${j})">${op}</button>`).join("")}`).join("")}
    ${Object.keys(t.resp).length>=TEMP_QS.length?`<div class="insight"><b>Tu temperamento predominante: ${t.resultado}.</b><br>${TEMP_DESC[t.resultado]}</div>`:`<p class="aviso">Responde las ${TEMP_QS.length} preguntas para ver tu resultado.</p>`}
    </div></details>

  <details class="area"><summary><span>Herramienta 3 · Taller 7 · Mi FODA Personal<br><span class="objetivo">Comprende tu realidad</span></span><span class="tag ${fodaOk()?"":"dorado"}">${fodaOk()?"✓ Completado":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">💪 Fortalezas — ¿Qué amas hacer? ¿Qué te diferencia?</label><textarea onblur="campo('foda','f',this.value)">${esc(state.foda.f)}</textarea>
      <label class="campo">🌅 Oportunidades — ¿Qué tendencias o puertas puedes aprovechar?</label><textarea onblur="campo('foda','o',this.value)">${esc(state.foda.o)}</textarea>
      <label class="campo">🧗 Debilidades — ¿Qué te podría distraer o frenar?</label><textarea onblur="campo('foda','d',this.value)">${esc(state.foda.d)}</textarea>
      <label class="campo">⚠️ Amenazas — ¿Qué riesgos externos enfrentas?</label><textarea onblur="campo('foda','a',this.value)">${esc(state.foda.a)}</textarea>
    </div></details>

  <details class="area"><summary><span>Herramienta 4 · Talleres 8 a 11 · Método Ikigai<br><span class="objetivo">¿Cuál podría ser tu propósito?</span></span><span class="tag ${ikigaiOk()?"":"dorado"}">${ikigaiOk()?"✓ Completado":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">❤️ ¿Qué amas hacer?</label><textarea onblur="campo('ikigai','amas',this.value)">${esc(state.ikigai.amas)}</textarea>
      <label class="campo">⭐ ¿En qué eres bueno?</label><textarea onblur="campo('ikigai','bueno',this.value)">${esc(state.ikigai.bueno)}</textarea>
      <label class="campo">🌍 ¿Qué necesita el mundo de ti?</label><textarea onblur="campo('ikigai','mundo',this.value)">${esc(state.ikigai.mundo)}</textarea>
      <label class="campo">💎 ¿Por qué pueden pagarte o cómo generas valor?</label><textarea onblur="campo('ikigai','valor',this.value)">${esc(state.ikigai.valor)}</textarea>
      <label class="campo">🎯 Síntesis — Mi posible propósito es...</label><textarea onblur="campo('ikigai','sintesis',this.value)">${esc(state.ikigai.sintesis)}</textarea>
    </div></details>

  ${fase1Done()?`<div class="card centro"><p class="sub">✨ <b>Este es mi estado actual.</b> Fase 1 completada.</p><button class="btn" onclick="ir('plan')">Continuar → Mi Plan de Vida</button></div>`:""}`;
}
function dimCambia(dim,val){ diagTmp[dim]=+val; document.getElementById("v-"+dim.replace(/\s/g,"_")).textContent=val; document.getElementById("radarBox").innerHTML=radar(diagTmp); }
function guardarDiag(){ state.diagnosticos.push({fecha:hoy(), valores:{...diagTmp}}); diagTmp=null; save(); evento("rueda_guardada"); render(); }
function tempResp(i,j){
  state.temperamento.resp[i]=j;
  const c=[0,0,0,0];
  Object.values(state.temperamento.resp).forEach(v=>c[v]++);
  if(Object.keys(state.temperamento.resp).length>=TEMP_QS.length)
    state.temperamento.resultado = TEMP_NOMBRES[c.indexOf(Math.max(...c))];
  save(); render();
}
function campo(obj,k,v){ state[obj][k]=v; save(); pintarViaje(); }

// ---------- FASE 2 · PLAN DE VIDA ----------
function vPlan(){
  const pa=state.planAnual, porDim={};
  state.metas.forEach(m=>{ (porDim[m.area]=porDim[m.area]||[]).push(m); });
  const areasCubiertas = DIMS.filter(x=>(porDim[x]||[]).length>=2).length;
  let areasHtml="";
  GRUPOS.forEach(([g,areas])=>{
    areasHtml+=`<div class="grupo-titulo">${g}</div>`;
    areas.forEach(a=>{
      const r=pa.areas[a]||{};
      const llenas=PREGUNTAS_AREA.filter(([k])=>r[k]&&r[k].trim()).length;
      areasHtml+=`<details class="area"><summary><span>${a}<br><span class="objetivo">${OBJETIVOS[a]}</span></span><span class="tag">${llenas}/${PREGUNTAS_AREA.length}</span></summary>
        <div class="cuerpo">${PREGUNTAS_AREA.map(([k,q])=>`<label class="campo">${q}</label><textarea onblur="pa('${a}','${k}',this.value)">${esc(r[k])}</textarea>`).join("")}</div></details>`;
    });
  });
  return `<div class="card"><div class="lema">Fase 2 · ¿Hacia dónde quieres ir?</div>
    <h2>Tu Plan de Vida</h2><p class="sub">Aquí comienza la construcción de tu futuro.</p></div>

  <details class="area" open><summary><span>Herramienta 5 · Taller 18 · Las tres preguntas más importantes ❤️<br><span class="objetivo">Vive • Crece • Contribuye — aquí nace el propósito</span></span><span class="tag ${pa.vivir&&pa.crecer&&pa.contribuir?"":"dorado"}">${pa.vivir&&pa.crecer&&pa.contribuir?"✓":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">🌎 ¿Cómo quieres VIVIR? (experiencias, estilo de vida)</label><textarea onblur="tres('vivir',this.value)">${esc(pa.vivir)}</textarea>
      <label class="campo">🌱 ¿Cómo quieres CRECER? (la persona en la que te convertirás)</label><textarea onblur="tres('crecer',this.value)">${esc(pa.crecer)}</textarea>
      <label class="campo">🤝 ¿Cómo quieres CONTRIBUIR? (tu impacto en el mundo)</label><textarea onblur="tres('contribuir',this.value)">${esc(pa.contribuir)}</textarea>
    </div></details>

  <details class="area"><summary><span>Herramienta 6 · Taller 19 · ¿Cuál es la visión de mi vida en un año?<br><span class="objetivo">Une las tres respuestas anteriores en una sola imagen, escrita en presente</span></span><span class="tag ${state.perfil.vision&&state.perfil.vision.trim()?"":"dorado"}">${state.perfil.vision&&state.perfil.vision.trim()?"✓":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <p class="sub">Imagina que ya es dentro de un año y todo ocurrió. Describe cómo te sientes, cómo actúas, cómo te relacionas y cómo vives en cada área. Cuanto más clara y detallada sea tu visión, más fácil será reconocer las oportunidades cuando aparezcan.</p>
      <label class="campo">Mi visión de vida a un año</label>
      <textarea style="min-height:150px" onblur="visionAnual(this.value)" placeholder="Dentro de un año...">${esc(state.perfil.vision)}</textarea>
    </div></details>

  <details class="area"><summary><span>Herramienta 7 · Taller 20 · Objetivos por área de vida<br><span class="objetivo">Claros, medibles y con fecha — el cuaderno pide 2 por área</span></span><span class="tag ${areasCubiertas===10?"":"dorado"}">${areasCubiertas}/10 áreas · ${state.metas.length} metas</span></summary>
    <div class="cuerpo">
      <div class="fila"><select id="mDim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select><input type="date" id="mPlazo"></div><br>
      <input type="text" id="mTxt" placeholder="¿Qué quieres lograr?"><br><br>
      <button class="btn" onclick="addMeta()">Agregar objetivo</button><br><br>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(112px,1fr));">
        ${DIMS.map(x=>{const n=(porDim[x]||[]).length; return `<div class="kpi" style="padding:8px;"><div class="num" style="font-size:1.05rem;color:${n>=2?"var(--verde)":"var(--gris)"}">${n}/2</div><div class="lbl" style="font-size:.66rem;">${x}</div></div>`;}).join("")}
      </div><br>
      ${DIMS.filter(x=>porDim[x]).map(x=>`<h3>${x}</h3>${porDim[x].map(m=>
        `<div class="lista-item"><button class="estado ${m.estado}" onclick="cicloMeta('${m.id}')">${{pendiente:"Pendiente",en_progreso:"En progreso",lograda:"✓ Lograda"}[m.estado]}</button>
        <span style="flex:1;">${esc(m.descripcion)}</span>${m.plazo?`<span class="tag">${m.plazo}</span>`:""}
        <button class="btn-mini" onclick="delMeta('${m.id}')">✕</button></div>`).join("")}`).join("")}
    </div></details>

  <details class="area"><summary><span>Herramienta 8 · Taller 21 · Afirmaciones y aformaciones<br><span class="objetivo">Programa tu mente</span></span><span class="tag">${state.afirmaciones.length+state.aformaciones.length}</span></summary>
    <div class="cuerpo">
      <label class="campo">Afirmación (ej. "YO SOY disciplinado y constante")</label>
      <div class="fila"><input type="text" id="afiTxt" placeholder="YO SOY / YO PUEDO / YO MEREZCO / YO ELIJO..."><button class="btn-sec" onclick="addLista('afirmaciones','afiTxt')">+</button></div>
      ${state.afirmaciones.map((x,i)=>`<div class="lista-item"><span style="flex:1;">✨ ${esc(x)}</span><button class="btn-mini" onclick="delLista('afirmaciones',${i})">✕</button></div>`).join("")}
      <label class="campo">Aformación — pregunta poderosa (ej. "¿Por qué soy tan capaz de crear abundancia?")</label>
      <div class="fila"><input type="text" id="afoTxt" placeholder="¿Por qué soy tan...?"><button class="btn-sec" onclick="addLista('aformaciones','afoTxt')">+</button></div>
      ${state.aformaciones.map((x,i)=>`<div class="lista-item"><span style="flex:1;">❓ ${esc(x)}</span><button class="btn-mini" onclick="delLista('aformaciones',${i})">✕</button></div>`).join("")}
    </div></details>

  <details class="area"><summary><span>Herramienta 9 · Taller 22 · Declaración de vida<br><span class="objetivo">¿Quién decides ser? ¿Qué legado construirás?</span></span><span class="tag ${state.declaracion.trim()?"":"dorado"}">${state.declaracion.trim()?"✓":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">Mi Declaración de Vida (la leerás cada mañana)</label>
      <textarea style="min-height:110px" onblur="decl(this.value)">${esc(state.declaracion)}</textarea>
    </div></details>

  <details class="area"><summary><span>Herramienta 10 · Tablero de visualización<br><span class="objetivo">Haz visible tu visión</span></span><span class="tag">${state.vision.length}</span></summary>
    <div class="cuerpo">
      <div class="fila"><input type="text" id="vbEmoji" placeholder="Emoji (🏝)" style="max-width:80px;"><input type="text" id="vbTxt" placeholder="Sueño o imagen de tu futuro"><button class="btn-sec" onclick="addVision()">+</button></div><br>
      <div class="grid">${state.vision.map((v,i)=>`<div class="kpi"><div class="num">${esc(v.e)||"⭐"}</div><div class="lbl">${esc(v.t)}</div><button class="btn-mini" onclick="delLista('vision',${i})">✕</button></div>`).join("")}</div>
    </div></details>

  <div class="card"><h2>Herramienta 11 · Plan de acción por área de vida</h2>
    <p class="sub">Aquí usas todo lo anterior. Cada área tiene las mismas ocho preguntas: tu rueda responde la primera, tu FODA las de límites, y las tres preguntas más importantes el resto.</p>
    ${areasHtml}</div>

  ${fase2Done()?`<div class="card centro"><p class="sub">✨ <b>Este es el futuro que quiero construir.</b> Fase 2 completada.</p><button class="btn" onclick="ir('noventa')">Continuar → Mi Plan de 90 Días</button></div>`:""}`;
}
function tres(k,v){ state.planAnual[k]=v; save(); pintarViaje(); }
function visionAnual(v){ state.perfil.vision=v; save(); pintarViaje(); }
function pa(a,k,v){ const r=state.planAnual.areas[a]=state.planAnual.areas[a]||{}; r[k]=v; save(); }
function decl(v){ state.declaracion=v; save(); pintarViaje(); }
function addMeta(){ const t=document.getElementById("mTxt").value.trim(); if(!t) return;
  state.metas.push({id:uid(), area:document.getElementById("mDim").value, descripcion:t, plazo:document.getElementById("mPlazo").value, estado:"pendiente"}); save(); render(); }
function cicloMeta(id){ const m=state.metas.find(x=>x.id===id); m.estado={pendiente:"en_progreso",en_progreso:"lograda",lograda:"pendiente"}[m.estado]; save(); render(); }
function delMeta(id){ state.metas=state.metas.filter(x=>x.id!==id); save(); render(); }
function addLista(k,inputId){ const el=document.getElementById(inputId); const v=el.value.trim(); if(!v) return; state[k].push(v); save(); render(); }
function delLista(k,i){ state[k].splice(i,1); save(); render(); }
function addVision(){ const e=document.getElementById("vbEmoji").value.trim(), t=document.getElementById("vbTxt").value.trim(); if(!t) return; state.vision.push({e,t}); save(); render(); }

// ---------- FASE 3 · PLAN DE 90 DÍAS ----------
function vNoventa(){
  if(!(fase1Done()&&fase2Done())) return `<div class="card"><div class="lema">Fase 3 · ¿Qué harás estos 90 días?</div><h2>Tu Plan de 90 Días</h2></div>`+compuertaHTML();
  if(!state.ciclo) state.ciclo={inicio:hoy(), prioridades:["","",""], metas90:[], firma:"", firmadoEl:""};
  const c=state.ciclo, dv=diaViaje(), et=etapaDe(dv||1);
  const fin = new Date(fecha(state.viaje.inicio).getTime()+89*86400000).toLocaleDateString("sv-SE");
  return `<div class="card"><div class="lema">Fase 3 · ¿Qué harás estos 90 días?</div>
    <h2>Tu Plan de 90 Días — Plan de Vuelo ✈️</h2>
    <p class="sub">Tu vuelo inició el <b>${state.viaje.inicio}</b> y aterriza el <b>${fin}</b>. Hoy es tu día ${dv} (${et[2]}).</p>
    <div class="med-grid" style="grid-template-columns:repeat(6,1fr);">${ETAPAS.map(([a,b,t])=>`<div class="med-dia ${dv>=a&&dv<=b?"actual":""} ${dv>b?"hecha":""}"><div class="n" style="font-size:.75rem;">${t.split(" ")[0]}</div>${t.split(" ").slice(1).join(" ")}<br>${a}–${b}</div>`).join("")}</div></div>

  <div class="card"><h2>Herramienta 12 · Taller 23 · Mis 3 prioridades para los próximos 90 días</h2>
    <p class="sub">No necesitas hacer más cosas. Necesitas identificar las correctas y comprometerte con ellas.</p>
    ${[0,1,2].map(i=>`<label class="campo">Prioridad ${i+1}</label><input type="text" value="${esc(c.prioridades[i])}" onblur="prio90(${i},this.value)" ${c.firma?"disabled":""}>`).join("")}</div>

  <div class="card"><h2>Herramienta 12 · Taller 24 · Resultados esperados</h2>
    <p class="sub">Una prioridad debe convertirse en un resultado medible. Define el indicador: de dónde partes, dónde estás y a dónde vas. Ejemplo: peso actual 80 kg → peso meta 76 kg.</p>
    ${!c.firma?`<div class="fila"><select id="m90Dim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select></div><br>
    <input type="text" id="m90Txt" placeholder="Meta medible (ej. Correr 5K / Leer 3 libros / Ahorrar $X)"><br><br>
    <button class="btn" onclick="addMeta90()">Agregar meta</button><br><br>`:""}
    ${c.metas90.map((m,i)=>`<div class="lista-item" style="flex-wrap:wrap;">
      <span class="tag">${m.area}</span><span style="flex:1;min-width:150px;">${esc(m.desc)}</span>
      <b style="color:var(--verde)">${pct90(m)}%</b>
      ${!c.firma?`<button class="btn-mini" onclick="delMeta90(${i})">✕</button>`:""}
      <div class="fila" style="width:100%;gap:6px;align-items:flex-end;">
        <div><label class="campo" style="margin-top:4px;">Punto de partida</label><input type="text" value="${esc(m.indInicial)}" placeholder="80" onblur="ind90(${i},'indInicial',this.value)"></div>
        <div><label class="campo" style="margin-top:4px;">Hoy</label><input type="text" value="${esc(m.indActual)}" placeholder="79" onblur="ind90(${i},'indActual',this.value)"></div>
        <div><label class="campo" style="margin-top:4px;">Meta</label><input type="text" value="${esc(m.indMeta)}" placeholder="76" onblur="ind90(${i},'indMeta',this.value)"></div>
        <div><label class="campo" style="margin-top:4px;">Unidad</label><input type="text" value="${esc(m.indUnidad)}" placeholder="kg" onblur="ind90(${i},'indUnidad',this.value)"></div>
      </div>
      ${tieneIndicador(m)
        ? `<p class="aviso" style="width:100%;">Indicador: ${esc(m.indInicial)} → <b>${esc(m.indActual||m.indInicial)}</b> → ${esc(m.indMeta)} ${esc(m.indUnidad)} · el avance se calcula solo.</p>`
        : `<input type="range" class="avance" min="0" max="100" step="5" value="${m.avance||0}" oninput="ava90(${i},this.value)"><p class="aviso" style="width:100%;">Sin indicador numérico: mueve la barra a mano.</p>`}
    </div>`).join("") || `<p class="aviso">Agrega al menos una meta.</p>`}</div>

  <div class="card"><h2>Herramienta 12 · Taller 28 · Compromiso personal de 90 días</h2>
    ${c.firma
      ? `<div class="insight">✍️ <b>Firmado por ${esc(c.firma)}</b> el ${c.firmadoEl}.<br><br><i>"Hoy decido asumir la responsabilidad de mi crecimiento personal. Me comprometo a mantener el enfoque en mis prioridades, ejecutar las acciones necesarias y desarrollar los hábitos que me acercarán a la vida que deseo construir. Acepto que los resultados dependerán de mi disciplina, constancia y compromiso diario. Durante los próximos 90 días elegiré avanzar antes que rendirme, aprender antes que justificarme y actuar antes que postergar."</i></div>
        <div class="centro"><button class="btn" onclick="ir('dia')">Ir a Mi Día → Día ${diaCiclo()} de 90</button></div>`
      : `<p class="sub"><b>Toda transformación comienza con una decisión.</b> Lee el siguiente compromiso y firma al finalizar.</p>
        <div class="insight"><i>"Hoy decido asumir la responsabilidad de mi crecimiento personal. Me comprometo a mantener el enfoque en mis prioridades, ejecutar las acciones necesarias y desarrollar los hábitos que me acercarán a la vida que deseo construir. Acepto que los resultados dependerán de mi disciplina, constancia y compromiso diario. Durante los próximos 90 días elegiré avanzar antes que rendirme, aprender antes que justificarme y actuar antes que postergar."</i></div>
        <label class="campo">Firmo con mi nombre completo</label>
        <input type="text" id="firmaTxt" placeholder="${esc(state.perfil.nombre)}">
        <br><br><div class="centro"><button class="btn" onclick="firmar()" ${c.metas90.length?"":"disabled"}>Firmar mi compromiso 🖋</button></div>
        ${c.metas90.length?"":'<p class="aviso centro">Agrega al menos una meta antes de firmar.</p>'}`}
  </div>`;
}
function prio90(i,v){ state.ciclo.prioridades[i]=v; save(); }
function addMeta90(){ const t=document.getElementById("m90Txt").value.trim(); if(!t) return;
  state.ciclo.metas90.push({area:document.getElementById("m90Dim").value, desc:t, avance:0,
    indInicial:"", indActual:"", indMeta:"", indUnidad:""}); save(); render(); }
// Un indicador sirve solo si partida y meta son numeros distintos entre si.
function tieneIndicador(m){
  const a=parseFloat(m.indInicial), b=parseFloat(m.indMeta);
  return !isNaN(a) && !isNaN(b) && a!==b;
}
// Con indicador el avance se deduce; sin el, vale lo que el usuario haya puesto a mano.
function pct90(m){
  if(!tieneIndicador(m)) return m.avance||0;
  const ini=parseFloat(m.indInicial), meta=parseFloat(m.indMeta);
  const act=isNaN(parseFloat(m.indActual))?ini:parseFloat(m.indActual);
  return Math.max(0, Math.min(100, Math.round((act-ini)/(meta-ini)*100)));
}
function ind90(i,campo,v){ const m=state.ciclo.metas90[i]; m[campo]=v; m.avance=pct90(m); save(); render(); }
function delMeta90(i){ state.ciclo.metas90.splice(i,1); save(); render(); }
function ava90(i,v){ state.ciclo.metas90[i].avance=+v; save(); }
function firmar(){ const f=document.getElementById("firmaTxt").value.trim(); if(!f) return;
  state.ciclo.firma=f; state.ciclo.firmadoEl=hoy(); save(); evento("plan_firmado", true); vista="dia"; render(); }

// ---------- FASE 4 · MI DÍA ----------
function vDia(){
  if(!cicloActivo()) return `<div class="card"><div class="lema">Fase 4 · ¿Qué harás hoy?</div><h2>Mi Día</h2></div>`+((fase1Done()&&fase2Done())?`<div class="compuerta"><b>🔒 Primero firma tu Plan de 90 Días.</b><br><br><button class="btn" onclick="ir('noventa')">Ir a Mis 90 Días</button></div>`:compuertaHTML());
  const dc=diaViaje(), e=D(), reg=state.registros[hoy()]||[];
  const et=etapaDe(dc);
  const frase=FRASES[(dc-1)%FRASES.length];
  const actualMed=diaMed(), yaMed=state.sesiones.some(s=>s.fecha===hoy());
  return `<div class="card"><div class="lema">Fase 4 · ¿Qué harás hoy?</div>
    <h2>Mi Día — Día ${dc} de 90 · ${et[2]}</h2>
    <div class="barra"><div style="width:${dc/90*100}%"></div></div>
    <p class="sub">${et[3]}</p></div>

  <div class="frase"><div class="f">"${frase}"</div><div class="a">Maestría de Vida</div></div>

  <div class="card"><h2>🎯 Mis 3 prioridades de hoy</h2>
    ${e.prio.map((p,i)=>`<div class="lista-item">
      <button class="check ${p.ok?"si":""}" onclick="prioOk(${i})">${p.ok?"✓":""}</button>
      <input type="text" value="${esc(p.t)}" placeholder="Prioridad ${i+1}" onblur="prioTxt(${i},this.value)" style="border:none;background:none;"></div>`).join("")}</div>

  <div class="fila" style="align-items:stretch;">
    <div class="card" style="flex:1;"><h2>🌅 Rutina de mañana</h2>
      ${RUT_M.map(r=>`<div class="lista-item"><button class="check ${e.rutM.includes(r)?"si":""}" onclick="rut('rutM','${r}')">${e.rutM.includes(r)?"✓":""}</button><span>${r}</span></div>`).join("")}</div>
    <div class="card" style="flex:1;"><h2>🌙 Rutina de noche</h2>
      ${RUT_N.map(r=>`<div class="lista-item"><button class="check ${e.rutN.includes(r)?"si":""}" onclick="rut('rutN','${r}')">${e.rutN.includes(r)?"✓":""}</button><span>${r}</span></div>`).join("")}</div>
  </div>

  <div class="card"><h2>🧘 Meditación · Día ${actualMed} de 21</h2>
    <div class="insight"><b>${MED_MAPA[(actualMed-1)%7]}</b></div>
    <div class="centro">${state.sesiones.length>=21
      ?`<span class="tag dorado">🏆 Ciclo de 21 completado</span> <button class="btn-sec" onclick="reiniciarMed()">Nuevo ciclo</button>`
      : yaMed?`<span class="tag dorado">✓ Completada hoy</span>`
      :`<button class="btn" onclick="medHoy()">Completé mi meditación 🧘</button>`}</div>
    <details><summary class="aviso" style="cursor:pointer;margin-top:8px;">Ver mapa de 21 días</summary><br>
    <div class="med-grid">${[...Array(21)].map((_,i)=>{const dia=i+1, hechas=state.sesiones.map(s=>s.dia);
      return `<div class="med-dia ${hechas.includes(dia)?"hecha":""} ${dia===actualMed&&!hechas.includes(dia)?"actual":""}"><div class="n">${dia}</div>${["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][i%7]}</div>`;}).join("")}</div></details></div>

  <div class="card"><h2>✅ Mis hábitos clave · Taller 27</h2>
    <p class="sub">Las metas producen resultados; los hábitos producen metas cumplidas.</p>
    ${HABITO_TIPOS.map(([tipo,etiqueta,emoji])=>{
      const lista = state.habitos.filter(h=>(h.tipo||"comenzar")===tipo);
      if(!lista.length) return "";
      return `<div class="grupo-titulo">${emoji} ${etiqueta}</div>` + lista.map(h=>`<div class="lista-item">
        <button class="check ${reg.includes(h.id)?"si":""}" onclick="toggleHabito('${h.id}')">${reg.includes(h.id)?"✓":""}</button>
        <span style="flex:1;">${esc(h.nombre)}</span><span class="tag">${h.area}</span>
        <button class="btn-mini" onclick="delHabito('${h.id}')">✕</button></div>`).join("");
    }).join("") || '<p class="sub">Crea tu primer hábito:</p>'}
    <br><div class="fila"><input type="text" id="hNom" placeholder="Ej. Leer 20 minutos"><select id="hTipo">${HABITO_TIPOS.map(([t,e])=>`<option value="${t}">${e}</option>`).join("")}</select><select id="hDim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select><button class="btn-sec" onclick="addHabito()">+</button></div>
    <p class="aviso">Racha: ${racha()} días 🔥</p></div>

  <div class="card"><h2>🙏 Gratitud y aprendizajes</h2>
    <label class="campo">¿Cómo te sientes hoy?</label>
    <div class="moods">${MOODS.map(([id,em])=>`<button class="${e.mood===id?"sel":""}" onclick="dMood('${id}')">${em}</button>`).join("")}</div>
    <label class="campo">Tres motivos de gratitud</label><textarea onblur="dCampo('gratitud',this.value)">${esc(e.gratitud)}</textarea>
    <label class="campo">Lo que aprendí hoy</label><textarea onblur="dCampo('aprendi',this.value)">${esc(e.aprendi)}</textarea>
    <label class="campo">Qué puedo mejorar mañana</label><textarea onblur="dCampo('mejora',this.value)">${esc(e.mejora)}</textarea></div>

  ${tarjetaReto()}

  <div class="card centro"><h2>⭐ Evaluación de mi día</h2>
    <div class="estrellas">${[1,2,3,4,5].map(n=>`<button class="${e.eval>=n?"on":""}" onclick="dEval(${n})">⭐</button>`).join("")}</div>
    ${e.eval?`<p class="sub">Día evaluado: ${e.eval}/5. ${e.eval>=4?"¡Así se construye una vida con maestría!":"Mañana es una nueva oportunidad."}</p>`:'<p class="aviso">Al final del día, califícalo.</p>'}</div>`;
}
function prioOk(i){ D().prio[i].ok=!D().prio[i].ok; save(); render(); }
function prioTxt(i,v){ D().prio[i].t=v; save(); }
function rut(k,r){ const l=D()[k]; const i=l.indexOf(r); i>=0?l.splice(i,1):l.push(r); save(); render(); }
function medHoy(){ state.sesiones.push({dia:diaMed(), fecha:hoy(), completada:true}); save(); render(); }
function reiniciarMed(){ if(confirm("¿Iniciar un nuevo ciclo de 21 días?")){ state.sesiones=[]; save(); render(); } }
function addHabito(){ const n=document.getElementById("hNom").value.trim(); if(!n) return;
  state.habitos.push({id:uid(), nombre:n, area:document.getElementById("hDim").value,
    tipo:(document.getElementById("hTipo")||{value:"comenzar"}).value}); save(); render(); }
function delHabito(id){ state.habitos=state.habitos.filter(x=>x.id!==id); save(); render(); }
function toggleHabito(id){ const f=hoy(); const r=state.registros[f]=state.registros[f]||[];
  const i=r.indexOf(id); i>=0?r.splice(i,1):r.push(id); save(); render(); }
function dMood(m){ D().mood=m; save(); render(); }
function dCampo(k,v){ D()[k]=v; save(); }
function dEval(n){ D().eval=n; save(); evento("dia_evaluado"); render(); }

// ---------- FASE 5 · MI EVOLUCIÓN ----------
function informeCorte(corte){
  const c=state.ciclo, ini=fecha(state.viaje.inicio);
  const desde=new Date(ini.getTime()+(corte-15)*86400000), hasta=new Date(ini.getTime()+(corte-1)*86400000);
  let evaluados=0, sumEval=0, habDias=0, dias=0;
  for(let d=new Date(desde); d<=hasta; d.setDate(d.getDate()+1)){
    const f=d.toLocaleDateString("sv-SE"); dias++;
    const e=state.dias[f];
    if(e&&e.eval){ evaluados++; sumEval+=e.eval; }
    if((state.registros[f]||[]).length>0) habDias++;
  }
  const avance = c.metas90.length? Math.round(c.metas90.reduce((a,m)=>a+(m.avance||0),0)/c.metas90.length) : 0;
  return {corte, avance, evaluados, dias, habDias, prom: evaluados?(sumEval/evaluados).toFixed(1):"–"};
}
let nuevaTmp=null;
function vEvolucion(){
  if(!cicloActivo()) return `<div class="card"><div class="lema">Fase 5 · ¿Qué has logrado?</div><h2>Tu Evolución</h2></div><div class="compuerta"><b>🔒 Tu evolución se mide dentro de tu Plan de 90 Días.</b><p class="sub" style="margin-top:6px;">Firma tu compromiso y comienza a ejecutar: el primer informe llega el día 15.</p></div>`;
  const dc=diaViaje(), et=etapaDe(dc), sem=semanaISO(), rv=state.revisiones[sem]||{logre:"",obstaculos:"",ajustes:""};
  const cortes=[15,30,45,60,75,90].filter(x=>dc>=x);
  const prox=[15,30,45,60,75,90].find(x=>dc<x);
  let html=`<div class="card"><div class="lema">Fase 5 · ¿Qué has logrado y qué debes mejorar?</div>
    <h2>Tu Evolución — Día ${dc} de 90 · ${et[2]}</h2>
    ${prox?`<p class="sub">Próximo corte con tu Coach IA: día ${prox} (faltan ${prox-dc} días).</p>`:""}</div>`;
  if(!cortes.length) html+=`<div class="card centro"><p class="sub">Tu primer corte de evaluación con el Coach IA es el <b>día 15</b>, al final de la Preparación. Sigue ejecutando: cada día cuenta.</p></div>`;
  cortes.slice().reverse().forEach(x=>{
    const r=informeCorte(x), ex=etapaDe(x);
    html+=`<div class="card"><h2>📊 Corte del día ${x} · ${ex[2]}</h2>
      <div class="grid">
        <div class="kpi"><div class="num">${r.avance}%</div><div class="lbl">Avance de metas 90</div></div>
        <div class="kpi"><div class="num">${r.habDias}/${r.dias}</div><div class="lbl">Días con hábitos</div></div>
        <div class="kpi"><div class="num">${r.evaluados}/${r.dias}</div><div class="lbl">Días evaluados</div></div>
        <div class="kpi"><div class="num">${r.prom}</div><div class="lbl">Calificación promedio</div></div>
      </div>
      <br><div class="centro"><button class="btn-sec" onclick="evalCorte(${x})">🧑‍✈️ Evaluar este corte con mi Coach IA</button></div></div>`;
  });
  html+=`<div class="card"><h2>Herramienta 12 · Taller 29 · Mi progreso — revisión semanal (${sem})</h2>
    <label class="campo">¿Qué logré esta semana?</label><textarea onblur="rev('logre',this.value)">${esc(rv.logre)}</textarea>
    <label class="campo">¿Qué obstáculos encontré?</label><textarea onblur="rev('obstaculos',this.value)">${esc(rv.obstaculos)}</textarea>
    <label class="campo">¿Qué debo ajustar?</label><textarea onblur="rev('ajustes',this.value)">${esc(rv.ajustes)}</textarea></div>`;
  if(dc>=90){
    nuevaTmp = nuevaTmp || Object.fromEntries(DIMS.map(x=>[x,(ultimoDiag()||{valores:{}}).valores[x]||5]));
    html+=`<div class="card"><h2>Cierre de ciclo · Nueva Rueda de la Vida 🏆</h2>
      <p class="sub">Completaste tus 90 días. Vuelve a calificarte y compara con tu punto de partida (línea dorada).</p>
      ${DIMS.map(x=>`<div class="dim-fila"><label>${x}</label>
        <input type="range" min="1" max="10" value="${nuevaTmp[x]}" oninput="nuevaCambia('${x}',this.value)">
        <span class="val" id="n-${x.replace(/\s/g,'_')}">${nuevaTmp[x]}</span></div>`).join("")}
      <br><div class="centro" id="radarNuevo">${radar(nuevaTmp,300,(primerDiag()||{valores:{}}).valores)}</div>
      <label class="campo">Cierre de ciclo · Mis lecciones aprendidas</label><textarea id="lecciones"></textarea>
      <br><div class="centro"><button class="btn" onclick="cerrarCiclo()">🎉 Celebrar y comenzar nuevo ciclo</button></div></div>`;
  }
  return html;
}
function rev(k,v){ const s=semanaISO(); const r=state.revisiones[s]=state.revisiones[s]||{logre:"",obstaculos:"",ajustes:""}; r[k]=v; save(); }
function nuevaCambia(dim,val){ nuevaTmp[dim]=+val; document.getElementById("n-"+dim.replace(/\s/g,"_")).textContent=val; document.getElementById("radarNuevo").innerHTML=radar(nuevaTmp,300,(primerDiag()||{valores:{}}).valores); }
function cerrarCiclo(){
  state.diagnosticos.push({fecha:hoy(), valores:{...nuevaTmp}});
  state.ciclos.push({...state.ciclo, cerradoEl:hoy(), lecciones:(document.getElementById("lecciones")||{}).value||""});
  state.ciclo=null; nuevaTmp=null;
  state.viaje.inicio=hoy(); // nuevo vuelo, nuevo destino
  save();
  alert("🎉 ¡Aterrizaje perfecto! Vuelo de 90 días completado. La mejora continua ya es tu estilo de vida. Diseña tu nuevo plan de vuelo con un nuevo destino.");
  vista="noventa"; render();
}
function evalCorte(x){
  const r=informeCorte(x), ex=etapaDe(x);
  state.coach.draft = `Coach, llegué al corte del día ${x} de mi plan de vuelo (etapa ${ex[2].replace(/^\S+\s/,"")}). Mi informe: avance de metas ${r.avance}%, días con hábitos ${r.habDias}/${r.dias}, días evaluados ${r.evaluados}/${r.dias}, calificación promedio ${r.prom}/5. Evalúa mi progreso, dime qué corregir y cuál debe ser mi enfoque de los próximos 15 días.`;
  save(); vista="coach"; render();
}

// ---------- COACH IA ----------
function contextoCoach(){
  const d=ultimoDiag(), [hh,ht]=habitosHoy();
  const partes=[
    "CONTEXTO DEL USUARIO (no lo repitas literal, úsalo para personalizar):",
    "Nombre: "+state.perfil.nombre,
    "Fase del viaje: "+(!fase1Done()?"1-Estado Actual (incompleta)":!fase2Done()?"2-Plan de Vida (incompleta)":!cicloActivo()?"3-Plan de 90 días (sin firmar)":"4-Ejecución diaria"),
    diaViaje()?("Plan de vuelo: día "+diaViaje()+" de 90, etapa "+etapaDe(diaViaje())[2]+" (cortes con el coach cada 15 días)"):"",
    d?("Rueda de la vida (1-10): "+DIMS.map(x=>x+"="+(d.valores[x]||"-")).join(", ")+". Área más baja: "+dimMasBaja(d)):"Sin diagnóstico aún.",
    state.temperamento.resultado?("Temperamento: "+state.temperamento.resultado):"",
    state.ikigai.sintesis?("Posible propósito (Ikigai): "+state.ikigai.sintesis):"",
    state.declaracion?("Declaración de vida: "+state.declaracion.slice(0,200)):"",
    state.metas.length?("Objetivos: "+state.metas.slice(0,6).map(m=>m.area+": "+m.descripcion+" ("+m.estado+")").join(" | ")):"",
    cicloActivo()?("Metas 90 días: "+state.ciclo.metas90.map(m=>m.desc+" "+(m.avance||0)+"%").join(" | ")):"",
    "Hábitos hoy: "+hh+"/"+ht+". Racha: "+racha()+" días. Meditaciones: "+state.sesiones.length+"/21."
  ].filter(Boolean);
  return partes.join("\n");
}
function vCoach(){
  const c=state.coach;
  const d=ultimoDiag(), baja=dimMasBaja(d);
  const ins=[];
  if(!fase1Done()) ins.push("Estás en la Fase 1. Completa tus 4 talleres de autodescubrimiento para desbloquear tu Plan de Vida.");
  else if(!fase2Done()) ins.push("Fase 2 en curso. Recuerda: el Taller 5 (Vive•Crece•Contribuye) es donde nace tu propósito.");
  else if(!cicloActivo()) ins.push("Tu plan de vida está listo. Fírmalo en 90 días concretos: la transformación ocurre ejecutando.");
  else { ins.push(`Día ${diaCiclo()} de 90. ${baja?`Tu área de mayor crecimiento es <b>${baja}</b> — como es adentro, es afuera.`:""}`); if(racha()>=3) ins.push(`Racha de <b>${racha()} días</b>. La constancia es tu superpoder.`); }
  return `<div class="card"><div class="lema">Tu mentor disponible 24/7</div><h2>Coach IA · Maestría de Vida</h2>
    ${ins.map(x=>`<div class="insight">${x}</div>`).join("")}
    <p class="aviso">El Coach IA acompaña tu proceso de crecimiento personal. No es un terapeuta ni un profesional de la salud, y no reemplaza atención médica, psicológica ni financiera. Si estás atravesando una crisis, busca ayuda profesional.</p></div>
  <div class="card">
    <h3>Conversación ${c.nombre?("· "+esc(c.nombre)):""}</h3>
      <div class="chat" id="chatBox">${c.msgs.map(m=>`<div class="msg ${m.role==="user"?"user":"coach"}">${esc(m.content)}</div>`).join("") || '<div class="msg coach">¡Hola! Soy tu Coach de Maestría de Vida. ¿En qué parte de tu viaje quieres que te acompañe hoy?</div>'}</div>
      <div class="fila"><input type="text" id="chatTxt" value="${esc(c.draft||"")}" placeholder="Escríbele a tu coach..." onkeydown="if(event.key==='Enter')coachSend()"><button class="btn" onclick="coachSend()" id="chatBtn">Enviar</button></div>
      <p class="aviso">El Coach conoce tu fase, tu rueda, tus metas y tu racha. <button class="btn-mini" onclick="coachReset()">Reiniciar conversación</button></p>
  </div>` + bloqueCuenta();
}
async function coachLogin(){
  const u=document.getElementById("cu").value.trim(), p=document.getElementById("cp").value;
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:u,password:p})});
    const j=await r.json();
    if(j.ok){ state.coach.token=j.token; state.coach.nombre=j.nombre; state.coach.rol=j.rol; save(); render(); sincronizarAlEntrar(); }
    else document.getElementById("cErr").textContent = j.error||"Error de acceso";
  }catch(e){ document.getElementById("cErr").textContent="No hay conexión con el servidor. Inicia INICIAR_SIP.bat"; }
}
async function coachSend(){
  const el=document.getElementById("chatTxt"); const txt=el.value.trim(); if(!txt) return;
  const c=state.coach; c.draft="";
  c.msgs.push({role:"user",content:txt}); el.value=""; save(); render();
  const hist=[{role:"user",content:contextoCoach()},{role:"assistant",content:"Contexto recibido. Estoy listo para acompañarte."}].concat(c.msgs.slice(-10));
  try{
    document.getElementById("chatBtn").disabled=true;
    const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Session":c.token},body:JSON.stringify({director:"coach-ia-maestria",messages:hist})});
    const j=await r.json();
    if(j.ok){ c.msgs.push({role:"assistant",content:j.reply}); evento("coach"); }
    else if(r.status===401||j.error==="No autorizado"){ c.token=""; c.msgs.push({role:"assistant",content:"Tu sesión expiró. Vuelve a iniciar sesión."}); }
    else c.msgs.push({role:"assistant",content:"⚠ "+(j.error||"No pude responder.")});
  }catch(e){ c.msgs.push({role:"assistant",content:"⚠ No hay conexión con el servidor local."}); }
  save(); render();
  const box=document.getElementById("chatBox"); if(box) box.scrollTop=box.scrollHeight;
}
function coachReset(){ state.coach.msgs=[]; save(); render(); }
function coachModo(m){ state.coach.modo=m; save(); render(); }
async function coachRegistro(){
  const err = document.getElementById("cErr");
  const cuerpo = {
    nombre:   document.getElementById("rNom").value.trim(),
    email:    document.getElementById("rEmail").value.trim(),
    whatsapp: document.getElementById("rWa").value.trim(),
    password: document.getElementById("rPwd").value,
    acepta:   document.getElementById("rAcepta").checked
  };
  err.textContent = "Creando tu cuenta...";
  try{
    const r = await fetch("/api/registro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cuerpo)});
    const j = await r.json();
    if(j.ok){
      state.coach.token=j.token; state.coach.nombre=j.nombre; state.coach.rol=j.rol;
      state.coach.modo="entrar";
      if(!state.perfil.nombre){ state.perfil.nombre=j.nombre; state.viaje.inicio=hoy(); }
      save(); render(); sincronizarAlEntrar();
    } else { err.textContent = j.error || "No se pudo crear la cuenta."; }
  }catch(e){ err.textContent = "No hay conexión con el servidor."; }
}

// ---------- COHORTE DE VUELO ----------
// Las personas que despegaron la misma semana comparten etapa del vuelo.
// El resumen es ANONIMO: cuantos son y como va el grupo, nunca quienes son.
// Mostrar identidades exigiria un consentimiento aparte.
let cohorteCache = null, cohortePedida = false;

async function cargarCohorte(){
  if(cohortePedida || !state.coach.token) return;
  cohortePedida = true;
  try{
    const r = await fetch("/api/cohorte",{headers:{"X-Session":state.coach.token}});
    if(r.status === 401) return;
    const j = await r.json();
    cohorteCache = j.cohorte || null;
    if(cohorteCache) render();
  }catch(e){ /* sin conexion: la tarjeta simplemente no aparece */ }
}

function tarjetaReto(){
  const r = state.reto || {racha:0, record:0};
  const hecho = cerroHoy();
  const co = cohorteCache;
  return `<div class="card">
    <div class="lema">Reto diario</div>
    <h2>${r.racha} ${r.racha===1?"día":"días"} sin faltar ${r.racha>0?"🔥":""}</h2>
    <p class="sub">${hecho
      ? "Hoy ya está cerrado. Mañana sumas uno más."
      : "Tu día cuenta cuando lo evalúas al final. Aún estás a tiempo."}</p>
    <div class="grid">
      <div class="kpi"><div class="num">${r.racha}</div><div class="lbl">Racha actual</div></div>
      <div class="kpi"><div class="num">${r.record||0}</div><div class="lbl">Tu récord</div></div>
      ${co ? `<div class="kpi"><div class="num">${co.al_dia}/${co.personas}</div><div class="lbl">De tu cohorte, al día</div></div>` : ""}
      ${co ? `<div class="kpi"><div class="num">${co.racha_mayor}</div><div class="lbl">Racha más larga del grupo</div></div>` : ""}
    </div>
    ${!hecho ? `<div class="centro" style="margin-top:12px;"><button class="btn" onclick="ir('dia')">Cerrar mi día</button></div>` : ""}
  </div>`;
}

function tarjetaCohorte(){
  const co = cohorteCache;
  if(!co || !co.personas) return "";
  const solo = co.personas === 1;
  const etapas = Object.entries(co.etapas||{});
  return `<div class="card">
    <div class="lema">Tu cohorte de vuelo</div>
    <h2>${solo ? "Eres la primera de tu semana ✈️" : `Vuelas con ${co.personas-1} ${co.personas-1===1?"persona":"personas"} ✈️`}</h2>
    <p class="sub">${solo
      ? "Cuando alguien más despegue esta semana, volarán juntos y verás aquí cómo avanza el grupo."
      : `Despegaron la semana del ${esc(co.semana)}. El grupo va en el día ${co.dia_promedio} de 90 en promedio.`}</p>
    ${!solo && etapas.length ? `<div class="grid">${etapas.map(([e,n])=>
      `<div class="kpi"><div class="num">${n}</div><div class="lbl">En ${esc(e)}</div></div>`).join("")}</div>` : ""}
    ${!solo ? `<div class="insight">${co.al_dia} de ${co.personas} mantienen su racha al día. La racha más larga del grupo va en ${co.racha_mayor} ${co.racha_mayor===1?"día":"días"}.</div>` : ""}
    <p class="aviso">Tu cohorte es anónima: ves cómo avanza el grupo, nunca quiénes lo componen.</p>
  </div>`;
}

// ---------- ACCESO (obligatorio desde ahora) ----------
function vAcceso(){
  const c = state.coach;
  const registro = c.modo === "registro";
  return `<div class="card centro">
      <div class="lema">Vive · Crece · Contribuye</div>
      <h2>Sistema Integral de Propósito</h2>
      <p class="sub">Un viaje guiado por cinco preguntas para transformar tu vida.</p>
    </div>
  <div class="card">
    ${registro ? `
      <h2>Crea tu cuenta</h2>
      <p class="sub">Tu avance queda guardado y lo recuperas desde cualquier dispositivo. Además entras al grupo de WhatsApp de Maestría de Vida.</p>
      <label class="campo">Nombre completo</label><input type="text" id="rNom" placeholder="Como quieres que te llamemos">
      <label class="campo">Correo</label><input type="text" id="rEmail" placeholder="tucorreo@ejemplo.com">
      <label class="campo">WhatsApp (con indicativo del país)</label><input type="text" id="rWa" placeholder="+57 300 123 4567">
      <label class="campo">Contraseña (mínimo 8 caracteres)</label><input type="password" id="rPwd" placeholder="········">
      <div class="lista-item" style="align-items:flex-start;gap:8px;margin-top:12px;">
        <input type="checkbox" id="rAcepta" style="width:auto;margin-top:3px;flex:0 0 auto;">
        <label for="rAcepta" style="font-size:.82rem;color:var(--gris);cursor:pointer;">
          Autorizo a Maestría de Vida a guardar mi nombre, correo y WhatsApp, y también
          <b>las respuestas de mis talleres, mis metas, hábitos y anotaciones diarias</b>,
          con el fin de darme el programa y poder recuperarlo en cualquier dispositivo.
          Es información personal e íntima: no se comparte con terceros ni se vende.
          Puedo descargarla o pedir que se borre por completo cuando quiera, desde la
          pantalla del Coach.
        </label>
      </div>
      <br><button class="btn" onclick="coachRegistro()">Crear mi cuenta</button>
      <button class="btn-mini" onclick="coachModo('entrar')">Ya tengo cuenta</button>
      <br><span class="aviso" id="cErr"></span>`
    : `
      <h2>Entra a tu viaje</h2>
      <p class="sub">Usa el correo con el que te registraste.</p>
      <div class="fila"><input type="text" id="cu" placeholder="Correo"><input type="password" id="cp" placeholder="Contraseña"></div>
      <br><button class="btn" onclick="coachLogin()">Entrar</button>
      <button class="btn-mini" onclick="coachModo('registro')">Crear una cuenta</button>
      <br><span class="aviso" id="cErr"></span>`}
  </div>`;
}

function vConflicto(){
  const local = state.perfil.nombre ? esc(state.perfil.nombre) : "este dispositivo";
  return `<div class="card"><div class="lema">Dos versiones de tu plan</div>
    <h2>¿Cuál quieres conservar?</h2>
    <p class="sub">Encontramos avances distintos en este dispositivo y en el servidor. No vamos a borrar ninguno sin que tú decidas.</p>
    <div class="compuerta">
      <b>Este dispositivo</b><br><span class="aviso">Lo que ves ahora, a nombre de ${local}.</span>
      <br><br><button class="btn" onclick="resolverConflicto('local')">Conservar el de este dispositivo</button>
    </div>
    <div class="compuerta">
      <b>El servidor</b><br><span class="aviso">Guardado por última vez el ${esc(conflicto.actualizado_en||"–")}.</span>
      <br><br><button class="btn" onclick="resolverConflicto('servidor')">Traer el del servidor</button>
    </div>
    <p class="aviso">Consejo: antes de decidir puedes descargar una copia de lo que tienes ahora con el botón «Descargar mi plan» del Coach.</p></div>`;
}

// ---------- MI CUENTA: copia, cierre de sesion y borrado ----------
function bloqueCuenta(){
  return `<div class="card"><h2>Mi cuenta</h2>
    <p class="sub">Sesión de <b>${esc(state.coach.nombre||"")}</b>. <span class="aviso" id="syncMsg">${esc(estadoSync)}</span></p>
    <div class="fila" style="flex-wrap:wrap;gap:8px;">
      <button class="btn-sec" onclick="descargarPlan()">Descargar mi plan</button>
      <button class="btn-sec" onclick="document.getElementById('archivoPlan').click()">Restaurar desde archivo</button>
      <button class="btn-sec" onclick="cerrarSesion()">Cerrar sesión</button>
    </div>
    <input type="file" id="archivoPlan" accept="application/json" style="display:none" onchange="restaurarPlan(this)">
    <p class="aviso" style="margin-top:12px;">¿Quieres irte? <button class="btn-mini" style="color:var(--rojo);text-decoration:underline;" onclick="borrarTodo()">Borrar mi cuenta y todos mis datos</button></p></div>`;
}

function descargarPlan(){
  const blob = new Blob([JSON.stringify(planParaSubir(), null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mi-plan-maestria-de-vida-" + hoy() + ".json";
  a.click(); URL.revokeObjectURL(a.href);
}

function restaurarPlan(input){
  const f = input.files && input.files[0]; if(!f) return;
  const lector = new FileReader();
  lector.onload = function(){
    try{
      const datos = JSON.parse(lector.result);
      if(!datos || typeof datos !== "object" || !datos.perfil) throw new Error("formato");
      if(!confirm("Esto reemplaza tu plan actual por el del archivo. ¿Continuar?")) return;
      aplicarPlan({datos: datos, revision: state._rev||0});
      subirPlan({forzar:true}); render();
    }catch(e){ alert("Ese archivo no parece un plan de Maestría de Vida."); }
  };
  lector.readAsText(f);
  input.value = "";
}

function cerrarSesion(){
  state.coach.token=""; state.coach.rol=""; state.coach.modo="entrar";
  save(); render();
}

async function borrarTodo(){
  if(!confirm("Se borrará tu cuenta y todo tu plan del servidor. Esto no se puede deshacer.\n\n¿Seguro?")) return;
  if(!confirm("Última confirmación: perderás tu rueda, tus metas, tus hábitos y tus anotaciones.")) return;
  try{
    await fetch("/api/cuenta/borrar",{method:"POST",headers:{"X-Session":state.coach.token}});
  }catch(e){}
  localStorage.removeItem("sip_v3");
  localStorage.removeItem("sip_rueda_vida_v1");
  localStorage.removeItem("sip_rueda_historial_v1");
  localStorage.removeItem("sip_rueda_estado_ideal");
  location.reload();
}

// ---------- PANEL DE ACTIVIDAD (solo administradores) ----------
let actividadCache = null;
function esAdmin(){ return ["presidente","vicepresidente"].includes(state.coach.rol); }

async function cargarActividad(){
  try{
    const r = await fetch("/api/admin/actividad",{headers:{"X-Session":state.coach.token}});
    actividadCache = await r.json();
  }catch(e){ actividadCache = {ok:false, error:"No hay conexion con el servidor."}; }
  render();
}

function vActividad(){
  if(!esAdmin()) return `<div class="card"><h2>Actividad</h2><p class="sub">Necesitas una cuenta de administrador. <button class="btn-sec" onclick="ir('coach')">Iniciar sesión</button></p></div>`;
  if(!actividadCache){ setTimeout(cargarActividad, 30); return `<div class="card centro"><p class="sub">Cargando actividad...</p></div>`; }
  if(!actividadCache.ok) return `<div class="card"><h2>Actividad</h2><div class="insight">${esc(actividadCache.error||"No disponible")}</div><br><button class="btn-sec" onclick="actividadCache=null;render()">Reintentar</button></div>`;

  const m = actividadCache.metricas||{}, p = actividadCache.personas||[], wa = actividadCache.whatsapp||[];
  const activacion = m.usuarios ? Math.round((m.con_fase1||0)/m.usuarios*100) : 0;
  const retencion  = m.usuarios ? Math.round((m.activos_28d||0)/m.usuarios*100) : 0;
  return `<div class="card"><div class="lema">Panel interno</div><h2>Quién usa el programa</h2>
    <p class="sub">Cada persona registrada, cuándo entró por última vez y hasta dónde llegó en el método.</p></div>

  <div class="grid">
    <div class="kpi"><div class="num">${m.usuarios||0}</div><div class="lbl">Personas registradas</div></div>
    <div class="kpi"><div class="num">${m.nuevos_7d||0}</div><div class="lbl">Nuevas esta semana</div></div>
    <div class="kpi"><div class="num">${m.activos_7d||0}</div><div class="lbl">Activas 7 días</div></div>
    <div class="kpi"><div class="num">${m.activos_28d||0}</div><div class="lbl">Activas 28 días</div></div>
  </div>
  <div class="grid">
    <div class="kpi"><div class="num" style="color:${activacion>=60?"var(--verde)":"var(--rojo)"}">${activacion}%</div><div class="lbl">Activación · meta 60%</div></div>
    <div class="kpi"><div class="num" style="color:${retencion>=40?"var(--verde)":"var(--rojo)"}">${retencion}%</div><div class="lbl">Retención 4 semanas · meta 40%</div></div>
    <div class="kpi"><div class="num">${m.firmaron||0}</div><div class="lbl">Firmaron sus 90 días</div></div>
  </div>

  <div class="card"><h2>📱 Grupo de WhatsApp</h2>
    <p class="sub">${wa.length} número${wa.length===1?"":"s"} registrado${wa.length===1?"":"s"}. Cópialos para invitar al grupo.</p>
    <textarea readonly style="min-height:90px;font-family:monospace;font-size:.82rem;">${esc(wa.map(x=>x.numero+"  ·  "+x.nombre).join("\n"))}</textarea>
    <br><button class="btn-sec" onclick="copiarWhatsapp()">Copiar solo los números</button> <span class="aviso" id="waMsg"></span></div>

  <div class="card"><h2>Personas</h2>
    ${p.length ? p.map(x=>`<div class="lista-item" style="flex-wrap:wrap;">
      <span style="flex:1;min-width:160px;"><b>${esc(x.nombre)}</b><br><span class="aviso">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span></span>
      <span class="tag ${x.fase1?"dorado":""}">${x.fase1?"✓ Fase 1":"sin Fase 1"}</span>
      ${x.firmo?`<span class="tag dorado">✓ 90 días</span>`:""}
      <span class="aviso" style="min-width:150px;text-align:right;">${x.dias_activos} día${x.dias_activos===1?"":"s"} activo${x.dias_activos===1?"":"s"}<br>último: ${esc(x.ultimo_login||x.registro||"–")}</span>
    </div>`).join("") : `<p class="sub">Todavía no hay nadie registrado.</p>`}</div>

  <div class="card"><h2>✈️ Cohortes de vuelo</h2>
    <p class="sub">Cada grupo que despegó la misma semana. «Al día» son quienes no han roto su racha.</p>
    ${(actividadCache.cohortes||[]).length ? (actividadCache.cohortes||[]).map(c=>`<div class="lista-item" style="flex-wrap:wrap;">
      <span style="flex:1;min-width:150px;"><b>Semana del ${esc(c.semana)}</b><br><span class="aviso">Día ${c.dia_promedio} de 90 en promedio</span></span>
      <span class="tag">${c.personas} ${c.personas===1?"persona":"personas"}</span>
      <span class="tag ${c.al_dia===c.personas?"dorado":""}">${c.al_dia} al día</span>
      <span class="aviso" style="min-width:130px;text-align:right;">${c.activos_7d} activas 7d<br>racha mayor: ${c.racha_mayor}</span>
    </div>`).join("") : '<p class="sub">Todavía no hay cohortes: aparecen cuando alguien inicia sus 90 días.</p>'}</div>

  <div class="card"><h2>Últimos movimientos</h2>
    ${(actividadCache.recientes||[]).slice(0,40).map(r=>`<div class="lista-item">
      <span class="aviso" style="min-width:120px;">${esc(r.cuando)}</span>
      <span style="flex:1;">${esc(r.quien)}</span><span class="tag">${esc(r.evento)}</span></div>`).join("")
      || `<p class="sub">Sin movimientos todavía.</p>`}
    <br><button class="btn-sec" onclick="actividadCache=null;render()">Actualizar</button></div>`;
}

function copiarWhatsapp(){
  const nums = (actividadCache.whatsapp||[]).map(x=>x.numero).join("\n");
  navigator.clipboard.writeText(nums).then(
    function(){ document.getElementById("waMsg").textContent = "Copiados ✓"; },
    function(){ document.getElementById("waMsg").textContent = "No se pudo copiar; selecciona el texto de arriba."; });
}

// ---------- Render ----------
const VMAP={inicio:vInicio, estado:vEstado, plan:vPlan, noventa:vNoventa, dia:vDia, evolucion:vEvolucion, coach:vCoach, actividad:vActividad};
function render(){
  // Sin sesion no se entra: el plan vive en el servidor, atado a una cuenta.
  if(!state.coach || !state.coach.token){
    document.getElementById("viaje").innerHTML = "";
    document.getElementById("main").innerHTML = vAcceso();
    return;
  }
  if(conflicto){
    document.getElementById("viaje").innerHTML = "";
    document.getElementById("main").innerHTML = vConflicto();
    return;
  }
  pintarViaje();
  revisarHitos();
  if(!state.perfil.nombre) vista="inicio";
  document.getElementById("main").innerHTML = (VMAP[vista]||vInicio)();
  const box=document.getElementById("chatBox"); if(box) box.scrollTop=box.scrollHeight;
}
// Vista inicial: siguiente paso del viaje
if(state.perfil.nombre){
  vista = !fase1Done()?"inicio":!fase2Done()?"inicio":!cicloActivo()?"inicio":"dia";
}
render();
if(state.coach && state.coach.token) sincronizarAlEntrar();

// Al cerrar o dejar la pestana se manda lo pendiente. keepalive permite que la
// peticion sobreviva a la salida de la pagina.
document.addEventListener("visibilitychange", function(){
  if(document.visibilityState === "hidden" && state.coach && state.coach.token){
    clearTimeout(guardadoTimer); subirPlan();
  }
});
