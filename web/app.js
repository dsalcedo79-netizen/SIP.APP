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
  declaracion:"", afirmaciones:[], aformaciones:[], vision:[], analisisArea:{},
  metas:[],
  ciclo:null, ciclos:[],           // ciclo = {inicio,prioridades:[],metas90:[],firma,firmadoEl}
  habitos:[], registros:{}, sesiones:[],
  dias:{},                          // por fecha: {prio:[{t,ok}],rutM:[],rutN:[],mood,gratitud,aprendi,mejora,eval}
  revisiones:{},                    // por semana ISO: {logre,obstaculos,ajustes}
  coach:{token:"",nombre:"",msgs:[]}
};
state.viaje = state.viaje || {inicio: state.perfil && state.perfil.nombre ? hoyF() : ""};
state.analisisArea = state.analisisArea || {};
let vista = "inicio";
function hoyF(){ return new Date().toLocaleDateString("sv-SE"); }
function save(){ localStorage.setItem("sip_v3", JSON.stringify(state)); }
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
  document.getElementById("viaje").innerHTML = FASES.map(([id,t,sub])=>{
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
  if(!ultimoDiag()) falta.push("Taller 1 · Rueda de la Vida");
  if(!state.temperamento.resultado) falta.push("Taller 2 · Test de Temperamento");
  if(!fodaOk()) falta.push("Taller 3 · FODA Personal");
  if(!ikigaiOk()) falta.push("Taller 4 · Ikigai");
  const p=state.planAnual;
  if(!(p.vivir.trim()&&p.crecer.trim()&&p.contribuir.trim())) falta.push("Taller 5 · Vive • Crece • Contribuye");
  if(state.metas.length<3) falta.push("Taller 6 · Objetivos por área (mínimo 3)");
  if(!state.declaracion.trim()) falta.push("Taller 8 · Declaración de Vida");
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
    <div class="card centro">
      ${!fase1Done()?`<p class="sub">Tu siguiente paso: <b>Fase 1 · Tu Estado Actual</b></p><button class="btn" onclick="ir('estado')">¿Dónde estás hoy?</button>`
      : !fase2Done()?`<p class="sub">Tu siguiente paso: <b>Fase 2 · Tu Plan de Vida</b></p><button class="btn" onclick="ir('plan')">¿Hacia dónde quieres ir?</button>`
      : !cicloActivo()?`<p class="sub">Tu siguiente paso: <b>Fase 3 · Tu Plan de 90 Días</b></p><button class="btn" onclick="ir('noventa')">Crear mi plan de 90 días</button>`
      : `<p class="sub">Tu centro de operaciones te espera.</p><button class="btn" onclick="ir('dia')">Ir a Mi Día (Día ${dc} de 90)</button>`}
    </div>`;
}
function empezar(){ const n=document.getElementById("nom").value.trim(); if(!n) return; state.perfil.nombre=n; state.viaje.inicio=hoy(); save(); vista="estado"; render(); }

// ---------- FASE 1 · ESTADO ACTUAL ----------
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

  <details class="area" ${!d?"open":""}><summary><span>Taller 1 · La Rueda de la Vida<br><span class="objetivo">Califícate de 1 a 10 en cada área</span></span><span class="tag ${d?"":"dorado"}">${d?"✓ Completado":"Pendiente"}</span></summary>
    <div class="cuerpo">${filas}
      <br><div class="centro" id="radarBox">${radar(diagTmp)}</div>
      <div class="centro"><button class="btn" onclick="guardarDiag()">Guardar mi rueda</button></div>
      ${state.diagnosticos.length?`<br>${state.diagnosticos.slice().reverse().map(x=>`<div class="lista-item"><span>${x.fecha}</span><span class="tag dorado">Promedio ${promedio(x)}</span></div>`).join("")}`:""}
    </div></details>

  <details class="area"><summary><span>Análisis por Área<br><span class="objetivo">¿Cómo podría mejorar mi calificación en un año?</span></span></summary>
    <div class="cuerpo">
      ${["Espiritual","Emocional","Mental","Salud","Personalidad","Familiar","Social","Ocupacional","Economico","CalidadVida"].map(k=>
        `<label class="campo">${k==="CalidadVida"?"Calidad de Vida":k==="Economico"?"Económico":k}</label><textarea onblur="campo('analisisArea','${k}',this.value)" style="min-height:60px;" placeholder="¿Cómo mejorar en esta área?">${esc(state.analisisArea[k])}</textarea>`).join("")}
    </div></details>

  <details class="area"><summary><span>Taller 2 · Test de Temperamento<br><span class="objetivo">¿Cómo eres? Los 4 temperamentos clásicos</span></span><span class="tag ${t.resultado?"":"dorado"}">${t.resultado?"✓ "+t.resultado:"Pendiente"}</span></summary>
    <div class="cuerpo">
    ${TEMP_QS.map((item,i)=>`<label class="campo">${i+1}. ${item.q}</label>
      ${item.o.map((op,j)=>`<button class="opcion ${t.resp[i]===j?"sel":""}" onclick="tempResp(${i},${j})">${op}</button>`).join("")}`).join("")}
    ${Object.keys(t.resp).length>=TEMP_QS.length?`<div class="insight"><b>Tu temperamento predominante: ${t.resultado}.</b><br>${TEMP_DESC[t.resultado]}</div>`:`<p class="aviso">Responde las ${TEMP_QS.length} preguntas para ver tu resultado.</p>`}
    </div></details>

  <details class="area"><summary><span>Taller 3 · FODA Personal<br><span class="objetivo">Comprende tu realidad</span></span><span class="tag ${fodaOk()?"":"dorado"}">${fodaOk()?"✓ Completado":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">💪 Fortalezas — ¿Qué amas hacer? ¿Qué te diferencia?</label><textarea onblur="campo('foda','f',this.value)">${esc(state.foda.f)}</textarea>
      <label class="campo">🌅 Oportunidades — ¿Qué tendencias o puertas puedes aprovechar?</label><textarea onblur="campo('foda','o',this.value)">${esc(state.foda.o)}</textarea>
      <label class="campo">🧗 Debilidades — ¿Qué te podría distraer o frenar?</label><textarea onblur="campo('foda','d',this.value)">${esc(state.foda.d)}</textarea>
      <label class="campo">⚠️ Amenazas — ¿Qué riesgos externos enfrentas?</label><textarea onblur="campo('foda','a',this.value)">${esc(state.foda.a)}</textarea>
    </div></details>

  <details class="area"><summary><span>Taller 4 · Ikigai<br><span class="objetivo">¿Cuál podría ser tu propósito?</span></span><span class="tag ${ikigaiOk()?"":"dorado"}">${ikigaiOk()?"✓ Completado":"Pendiente"}</span></summary>
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
function guardarDiag(){ state.diagnosticos.push({fecha:hoy(), valores:{...diagTmp}}); diagTmp=null; save(); render(); }
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

  <details class="area" open><summary><span>Taller 5 · Vive • Crece • Contribuye ❤️<br><span class="objetivo">Las tres preguntas más importantes — aquí nace el propósito</span></span><span class="tag ${pa.vivir&&pa.crecer&&pa.contribuir?"":"dorado"}">${pa.vivir&&pa.crecer&&pa.contribuir?"✓":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">🌎 ¿Cómo quieres VIVIR? (experiencias, estilo de vida)</label><textarea onblur="tres('vivir',this.value)">${esc(pa.vivir)}</textarea>
      <label class="campo">🌱 ¿Cómo quieres CRECER? (la persona en la que te convertirás)</label><textarea onblur="tres('crecer',this.value)">${esc(pa.crecer)}</textarea>
      <label class="campo">🤝 ¿Cómo quieres CONTRIBUIR? (tu impacto en el mundo)</label><textarea onblur="tres('contribuir',this.value)">${esc(pa.contribuir)}</textarea>
    </div></details>

  <details class="area"><summary><span>Taller 6 · Objetivos por Área de Vida<br><span class="objetivo">Claros, medibles, con fecha (mínimo 3)</span></span><span class="tag ${state.metas.length>=3?"":"dorado"}">${state.metas.length} metas</span></summary>
    <div class="cuerpo">
      <div class="fila"><select id="mDim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select><input type="date" id="mPlazo"></div><br>
      <input type="text" id="mTxt" placeholder="¿Qué quieres lograr?"><br><br>
      <button class="btn" onclick="addMeta()">Agregar objetivo</button><br><br>
      ${DIMS.filter(x=>porDim[x]).map(x=>`<h3>${x}</h3>${porDim[x].map(m=>
        `<div class="lista-item"><button class="estado ${m.estado}" onclick="cicloMeta('${m.id}')">${{pendiente:"Pendiente",en_progreso:"En progreso",lograda:"✓ Lograda"}[m.estado]}</button>
        <span style="flex:1;">${esc(m.descripcion)}</span>${m.plazo?`<span class="tag">${m.plazo}</span>`:""}
        <button class="btn-mini" onclick="delMeta('${m.id}')">✕</button></div>`).join("")}`).join("")}
    </div></details>

  <details class="area"><summary><span>Taller 7 · Afirmaciones y Aformaciones<br><span class="objetivo">Programa tu mente</span></span><span class="tag">${state.afirmaciones.length+state.aformaciones.length}</span></summary>
    <div class="cuerpo">
      <label class="campo">Afirmación (ej. "YO SOY disciplinado y constante")</label>
      <div class="fila"><input type="text" id="afiTxt" placeholder="YO SOY / YO PUEDO / YO MEREZCO / YO ELIJO..."><button class="btn-sec" onclick="addLista('afirmaciones','afiTxt')">+</button></div>
      ${state.afirmaciones.map((x,i)=>`<div class="lista-item"><span style="flex:1;">✨ ${esc(x)}</span><button class="btn-mini" onclick="delLista('afirmaciones',${i})">✕</button></div>`).join("")}
      <label class="campo">Aformación — pregunta poderosa (ej. "¿Por qué soy tan capaz de crear abundancia?")</label>
      <div class="fila"><input type="text" id="afoTxt" placeholder="¿Por qué soy tan...?"><button class="btn-sec" onclick="addLista('aformaciones','afoTxt')">+</button></div>
      ${state.aformaciones.map((x,i)=>`<div class="lista-item"><span style="flex:1;">❓ ${esc(x)}</span><button class="btn-mini" onclick="delLista('aformaciones',${i})">✕</button></div>`).join("")}
    </div></details>

  <details class="area"><summary><span>Taller 8 · Declaración de Vida<br><span class="objetivo">¿Quién decides ser? ¿Qué legado construirás?</span></span><span class="tag ${state.declaracion.trim()?"":"dorado"}">${state.declaracion.trim()?"✓":"Pendiente"}</span></summary>
    <div class="cuerpo">
      <label class="campo">Mi Declaración de Vida (la leerás cada mañana)</label>
      <textarea style="min-height:110px" onblur="decl(this.value)">${esc(state.declaracion)}</textarea>
    </div></details>

  <details class="area"><summary><span>Taller 9 · Vision Board<br><span class="objetivo">Haz visible tu visión</span></span><span class="tag">${state.vision.length}</span></summary>
    <div class="cuerpo">
      <div class="fila"><input type="text" id="vbEmoji" placeholder="Emoji (🏝)" style="max-width:80px;"><input type="text" id="vbTxt" placeholder="Sueño o imagen de tu futuro"><button class="btn-sec" onclick="addVision()">+</button></div><br>
      <div class="grid">${state.vision.map((v,i)=>`<div class="kpi"><div class="num">${esc(v.e)||"⭐"}</div><div class="lbl">${esc(v.t)}</div><button class="btn-mini" onclick="delLista('vision',${i})">✕</button></div>`).join("")}</div>
    </div></details>

  ${fase2Done()?`<div class="card centro"><p class="sub">✨ <b>Este es el futuro que quiero construir.</b> Fase 2 completada.</p><button class="btn" onclick="ir('noventa')">Continuar → Mi Plan de 90 Días</button></div>`:""}`;
}
function tres(k,v){ state.planAnual[k]=v; save(); pintarViaje(); }
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

  <div class="card"><h2>Taller 10 · Mis 3 prioridades del período</h2>
    ${[0,1,2].map(i=>`<label class="campo">Prioridad ${i+1}</label><input type="text" value="${esc(c.prioridades[i])}" onblur="prio90(${i},this.value)" ${c.firma?"disabled":""}>`).join("")}</div>

  <div class="card"><h2>Talleres 11-13 · Metas de 90 días con indicador</h2>
    <p class="sub">Metas medibles por área. Actualiza tu % de avance desde Mi Día o aquí.</p>
    ${!c.firma?`<div class="fila"><select id="m90Dim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select></div><br>
    <input type="text" id="m90Txt" placeholder="Meta medible (ej. Correr 5K / Leer 3 libros / Ahorrar $X)"><br><br>
    <button class="btn" onclick="addMeta90()">Agregar meta</button><br><br>`:""}
    ${c.metas90.map((m,i)=>`<div class="lista-item" style="flex-wrap:wrap;">
      <span class="tag">${m.area}</span><span style="flex:1;">${esc(m.desc)}</span>
      <b style="color:var(--verde)">${m.avance||0}%</b>
      ${!c.firma?`<button class="btn-mini" onclick="delMeta90(${i})">✕</button>`:""}
      <input type="range" class="avance" min="0" max="100" step="5" value="${m.avance||0}" oninput="ava90(${i},this.value)">
    </div>`).join("") || `<p class="aviso">Agrega al menos una meta.</p>`}</div>

  <div class="card"><h2>Taller 14 · Compromiso Personal de 90 Días</h2>
    ${c.firma
      ? `<div class="insight">✍️ <b>Firmado por ${esc(c.firma)}</b> el ${c.firmadoEl}.<br><br><i>"Yo, ${esc(c.firma)}, me comprometo conmigo mismo a ejecutar este plan durante 90 días, un día a la vez, para VIVIR, CRECER y CONTRIBUIR."</i></div>
        <div class="centro"><button class="btn" onclick="ir('dia')">Ir a Mi Día → Día ${diaCiclo()} de 90</button></div>`
      : `<p class="sub"><i>"Yo, ______, me comprometo conmigo mismo a ejecutar este plan durante 90 días, un día a la vez, para VIVIR, CRECER y CONTRIBUIR."</i></p>
        <label class="campo">Firmo con mi nombre completo</label>
        <input type="text" id="firmaTxt" placeholder="${esc(state.perfil.nombre)}">
        <br><br><div class="centro"><button class="btn" onclick="firmar()" ${c.metas90.length?"":"disabled"}>Firmar mi compromiso 🖋</button></div>
        ${c.metas90.length?"":'<p class="aviso centro">Agrega al menos una meta antes de firmar.</p>'}`}
  </div>`;
}
function prio90(i,v){ state.ciclo.prioridades[i]=v; save(); }
function addMeta90(){ const t=document.getElementById("m90Txt").value.trim(); if(!t) return;
  state.ciclo.metas90.push({area:document.getElementById("m90Dim").value, desc:t, avance:0}); save(); render(); }
function delMeta90(i){ state.ciclo.metas90.splice(i,1); save(); render(); }
function ava90(i,v){ state.ciclo.metas90[i].avance=+v; save(); }
function firmar(){ const f=document.getElementById("firmaTxt").value.trim(); if(!f) return;
  state.ciclo.firma=f; state.ciclo.firmadoEl=hoy(); save(); vista="dia"; render(); }

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

  <div class="card"><h2>✅ Mis hábitos</h2>
    ${state.habitos.map(h=>`<div class="lista-item">
      <button class="check ${reg.includes(h.id)?"si":""}" onclick="toggleHabito('${h.id}')">${reg.includes(h.id)?"✓":""}</button>
      <span style="flex:1;">${esc(h.nombre)}</span><span class="tag">${h.area}</span>
      <button class="btn-mini" onclick="delHabito('${h.id}')">✕</button></div>`).join("") || '<p class="sub">Crea tu primer hábito:</p>'}
    <br><div class="fila"><input type="text" id="hNom" placeholder="Ej. Leer 20 minutos"><select id="hDim">${DIMS.map(x=>`<option>${x}</option>`).join("")}</select><button class="btn-sec" onclick="addHabito()">+</button></div>
    <p class="aviso">Racha: ${racha()} días 🔥</p></div>

  <div class="card"><h2>🙏 Gratitud y aprendizajes</h2>
    <label class="campo">¿Cómo te sientes hoy?</label>
    <div class="moods">${MOODS.map(([id,em])=>`<button class="${e.mood===id?"sel":""}" onclick="dMood('${id}')">${em}</button>`).join("")}</div>
    <label class="campo">Tres motivos de gratitud</label><textarea onblur="dCampo('gratitud',this.value)">${esc(e.gratitud)}</textarea>
    <label class="campo">Lo que aprendí hoy</label><textarea onblur="dCampo('aprendi',this.value)">${esc(e.aprendi)}</textarea>
    <label class="campo">Qué puedo mejorar mañana</label><textarea onblur="dCampo('mejora',this.value)">${esc(e.mejora)}</textarea></div>

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
  state.habitos.push({id:uid(), nombre:n, area:document.getElementById("hDim").value}); save(); render(); }
function delHabito(id){ state.habitos=state.habitos.filter(x=>x.id!==id); save(); render(); }
function toggleHabito(id){ const f=hoy(); const r=state.registros[f]=state.registros[f]||[];
  const i=r.indexOf(id); i>=0?r.splice(i,1):r.push(id); save(); render(); }
function dMood(m){ D().mood=m; save(); render(); }
function dCampo(k,v){ D()[k]=v; save(); }
function dEval(n){ D().eval=n; save(); render(); }

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
  html+=`<div class="card"><h2>Taller 23 · Revisión Semanal (${sem})</h2>
    <label class="campo">¿Qué logré esta semana?</label><textarea onblur="rev('logre',this.value)">${esc(rv.logre)}</textarea>
    <label class="campo">¿Qué obstáculos encontré?</label><textarea onblur="rev('obstaculos',this.value)">${esc(rv.obstaculos)}</textarea>
    <label class="campo">¿Qué debo ajustar?</label><textarea onblur="rev('ajustes',this.value)">${esc(rv.ajustes)}</textarea></div>`;
  if(dc>=90){
    nuevaTmp = nuevaTmp || Object.fromEntries(DIMS.map(x=>[x,(ultimoDiag()||{valores:{}}).valores[x]||5]));
    html+=`<div class="card"><h2>Taller 25 · Nueva Rueda de la Vida 🏆</h2>
      <p class="sub">Completaste tus 90 días. Vuelve a calificarte y compara con tu punto de partida (línea dorada).</p>
      ${DIMS.map(x=>`<div class="dim-fila"><label>${x}</label>
        <input type="range" min="1" max="10" value="${nuevaTmp[x]}" oninput="nuevaCambia('${x}',this.value)">
        <span class="val" id="n-${x.replace(/\s/g,'_')}">${nuevaTmp[x]}</span></div>`).join("")}
      <br><div class="centro" id="radarNuevo">${radar(nuevaTmp,300,(primerDiag()||{valores:{}}).valores)}</div>
      <label class="campo">Taller 26 · Mis lecciones aprendidas</label><textarea id="lecciones"></textarea>
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
    ${ins.map(x=>`<div class="insight">${x}</div>`).join("")}</div>
  <div class="card">
    ${!c.token ? `
      <h3>Inicia sesión para conversar con tu Coach</h3>
      <p class="sub">Usa tu usuario del sistema (el servidor local debe estar corriendo).</p>
      <div class="fila"><input type="text" id="cu" placeholder="Usuario"><input type="password" id="cp" placeholder="Contraseña"></div>
      <br><button class="btn" onclick="coachLogin()">Entrar</button> <span class="aviso" id="cErr"></span>`
    : `
      <h3>Conversación ${c.nombre?("· "+esc(c.nombre)):""}</h3>
      <div class="chat" id="chatBox">${c.msgs.map(m=>`<div class="msg ${m.role==="user"?"user":"coach"}">${esc(m.content)}</div>`).join("") || '<div class="msg coach">¡Hola! Soy tu Coach de Maestría de Vida. ¿En qué parte de tu viaje quieres que te acompañe hoy?</div>'}</div>
      <div class="fila"><input type="text" id="chatTxt" value="${esc(c.draft||"")}" placeholder="Escríbele a tu coach..." onkeydown="if(event.key==='Enter')coachSend()"><button class="btn" onclick="coachSend()" id="chatBtn">Enviar</button></div>
      <p class="aviso">El Coach conoce tu fase, tu rueda, tus metas y tu racha. <button class="btn-mini" onclick="coachReset()">Reiniciar conversación</button></p>`}
  </div>`;
}
async function coachLogin(){
  const u=document.getElementById("cu").value.trim(), p=document.getElementById("cp").value;
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:u,password:p})});
    const j=await r.json();
    if(j.ok){ state.coach.token=j.token; state.coach.nombre=j.nombre; save(); render(); }
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
    if(j.ok) c.msgs.push({role:"assistant",content:j.reply});
    else if(r.status===401||j.error==="No autorizado"){ c.token=""; c.msgs.push({role:"assistant",content:"Tu sesión expiró. Vuelve a iniciar sesión."}); }
    else c.msgs.push({role:"assistant",content:"⚠ "+(j.error||"No pude responder.")});
  }catch(e){ c.msgs.push({role:"assistant",content:"⚠ No hay conexión con el servidor local."}); }
  save(); render();
  const box=document.getElementById("chatBox"); if(box) box.scrollTop=box.scrollHeight;
}
function coachReset(){ state.coach.msgs=[]; save(); render(); }

// ---------- Render ----------
const VMAP={inicio:vInicio, estado:vEstado, plan:vPlan, noventa:vNoventa, dia:vDia, evolucion:vEvolucion, coach:vCoach};
function render(){
  pintarViaje();
  if(!state.perfil.nombre) vista="inicio";
  document.getElementById("main").innerHTML = (VMAP[vista]||vInicio)();
  const box=document.getElementById("chatBox"); if(box) box.scrollTop=box.scrollHeight;
}
// Vista inicial: siguiente paso del viaje
if(state.perfil.nombre){
  vista = !fase1Done()?"inicio":!fase2Done()?"inicio":!cicloActivo()?"inicio":"dia";
}
render();
