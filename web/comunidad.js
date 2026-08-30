"use strict";
/* ============================================================
   Comunidad · Maestría de Vida
   Muro, grupos de apoyo por área de vida, y personas a seguir.

   Regla que atraviesa todo este archivo: el plan de vida es PRIVADO.
   Nada de lo que la persona escribe en sus talleres se publica solo.
   Publicar es siempre un botón que ella aprieta, pieza por pieza.
   ============================================================ */

var CO = { pestana: "muro", grupo: null, perfil: null, cargando: false,
           muro: [], grupos: [], personas: [], yo: null, viendo: null, error: "" };

var CO_TIPOS = [
  ["mensaje", "Un mensaje", "¿Qué quieres compartir con quienes te acompañan?"],
  ["meta",    "Una meta",   "¿Qué te propusiste lograr?"],
  ["leccion", "Una lección","¿Qué aprendiste que le sirva a otro?"],
  ["mejora",  "Algo a mejorar", "¿En qué estás trabajando y quieres apoyo?"]
];
var CO_ETIQUETA = { mensaje:"compartió", meta:"se propuso una meta",
                    leccion:"aprendió algo", mejora:"quiere mejorar" };
var CO_ICONO = { mensaje:"💬", meta:"🎯", leccion:"💡", mejora:"🌱" };

function coCab(){ return {"Content-Type":"application/json","X-Session":state.coach.token}; }

async function coGet(ruta){
  try{
    const r = await fetch("/api/social/" + ruta, {headers:{"X-Session":state.coach.token}});
    if(r.status === 401){ if(typeof sesionExpirada==="function") sesionExpirada(); return null; }
    return await r.json();
  }catch(e){ CO.error = "Sin conexión con el servidor."; return null; }
}
async function coPost(ruta, cuerpo){
  try{
    const r = await fetch("/api/social/" + ruta,
      {method:"POST", headers:coCab(), body: JSON.stringify(cuerpo||{})});
    if(r.status === 401){ if(typeof sesionExpirada==="function") sesionExpirada(); return null; }
    return await r.json();
  }catch(e){ CO.error = "Sin conexión con el servidor."; return null; }
}

async function coCargar(){
  if(CO.cargando) return;
  CO.cargando = true; CO.error = "";
  const yo = await coGet("yo");
  CO.yo = yo ? yo.perfil : null;
  if(CO.yo){
    // Los grupos se cargan siempre: el compositor los usa como destino.
    const g = await coGet("grupos"); CO.grupos = g ? g.grupos : [];
    if(CO.pestana === "muro"){
      const m = await coGet("muro" + (CO.grupo ? "?grupo=" + encodeURIComponent(CO.grupo) : ""));
      CO.muro = m ? m.publicaciones : [];
    } else if(CO.pestana === "personas"){
      const p = await coGet("personas"); CO.personas = p ? p.personas : [];
    }
  }
  CO.cargando = false;
  render();
}

function coIr(pestana, grupo){
  CO.pestana = pestana; CO.grupo = grupo || null; CO.viendo = null;
  CO.cargando = false; render(); coCargar();
}

async function coVerPerfil(id){
  const j = await coGet("perfil?id=" + encodeURIComponent(id));
  CO.viendo = j ? j.perfil : null;
  render();
}

// ---------- Acciones ----------
async function coPublicar(){
  const texto = (document.getElementById("coTexto")||{}).value || "";
  const tipo  = (document.getElementById("coTipo")||{}).value || "mensaje";
  const dest  = (document.getElementById("coDestino")||{}).value || "";
  if(!texto.trim()){ CO.error = "Escribe algo antes de publicar."; render(); return; }
  const j = await coPost("publicar", {texto: texto, tipo: tipo,
    grupo: dest || null, area: dest || null});
  CO.error = (j && j.ok) ? "" : ((j && j.error) || "No se pudo publicar.");
  if(j && j.ok){ CO.grupo = dest || CO.grupo; }
  coCargar();
}
async function coApoyar(id, ap){ await coPost("apoyar", {id:id, apoyar:ap}); coCargar(); }
async function coSeguir(id, seg){ await coPost("seguir", {id:id, seguir:seg});
  if(CO.viendo) await coVerPerfil(id); else coCargar(); }
async function coGrupo(id, entrar){ await coPost("grupo", {id:id, entrar:entrar}); coCargar(); }
async function coBorrar(id){
  if(!confirm("¿Borrar esta publicación?")) return;
  await coPost("borrar", {id:id}); coCargar();
}
async function coReportar(id){
  const motivo = prompt("¿Qué problema tiene esta publicación? Un moderador la revisará.");
  if(motivo === null) return;
  const j = await coPost("reportar", {id:id, motivo:motivo});
  alert(j && j.ok ? "Gracias. Un moderador lo va a revisar." : "No se pudo enviar el reporte.");
}
async function coBloquear(id){
  if(!confirm("Dejarás de ver sus publicaciones y esa persona dejará de ver las tuyas. ¿Continuar?")) return;
  await coPost("bloquear", {id:id, bloquear:true});
  CO.viendo = null; coIr("muro");
}
async function coGuardarPerfil(){
  const alias = (document.getElementById("coAlias")||{}).value || "";
  const bio   = (document.getElementById("coBio")||{}).value || "";
  const j = await coPost("perfil", {alias:alias, bio:bio});
  CO.error = (j && j.ok) ? "" : ((j && j.error) || "No se pudo guardar.");
  coCargar();
}

// ---------- Vistas ----------
function coPerfilNuevo(){
  const sugerido = (state.perfil.nombre || "").split(" ")[0] || "";
  return `<div class="card">
    <div class="lema">Comunidad</div>
    <h2>Crea tu perfil de comunidad</h2>
    <p class="sub">Esto es lo único que verán las demás personas. Tu plan de vida, tus talleres y tus anotaciones siguen siendo privados: nada de eso se publica solo.</p>
    <label class="campo">¿Cómo quieres que te vean?</label>
    <input type="text" id="coAlias" maxlength="40" value="${esc(sugerido)}" placeholder="Tu nombre o como prefieras">
    <p class="aviso">Puede ser tu nombre, solo el primero, o un apodo. Tú decides cuánto muestras.</p>
    <label class="campo">Una línea sobre ti (opcional)</label>
    <textarea id="coBio" maxlength="300" placeholder="En qué estás trabajando, qué buscas..."></textarea>
    <br><button class="btn" onclick="coGuardarPerfil()">Entrar a la comunidad</button>
    <span class="aviso">${esc(CO.error)}</span>
  </div>`;
}

function coCompositor(){
  const misGrupos = CO.grupos.filter(g=>g.soy_miembro);
  return `<div class="card">
    <h2>Comparte con quienes te acompañan</h2>
    <div class="fila">
      <select id="coTipo" onchange="coCambioTipo()">${CO_TIPOS.map(([v,n])=>
        `<option value="${v}">${CO_ICONO[v]} ${n}</option>`).join("")}</select>
      <select id="coDestino">
        <option value="">A quienes me siguen</option>
        ${(misGrupos.length?misGrupos:CO.grupos).map(g=>
          `<option value="${g.id}" ${CO.grupo===g.id?"selected":""}>Grupo · ${esc(g.nombre)}</option>`).join("")}
      </select>
    </div>
    <textarea id="coTexto" maxlength="1500" style="min-height:80px;margin-top:10px;"
      placeholder="${esc(CO_TIPOS[0][2])}"></textarea>
    ${state.metas && state.metas.length ? `
      <p class="aviso" style="margin-top:6px;">O publica una meta que ya escribiste:
        <select id="coMeta" onchange="coUsarMeta()" style="max-width:100%;margin-top:4px;">
          <option value="">— elegir de mis metas —</option>
          ${state.metas.map((m,i)=>`<option value="${i}">${esc(m.area)}: ${esc(m.descripcion.slice(0,60))}</option>`).join("")}
        </select></p>` : ""}
    <div class="centro" style="margin-top:10px;">
      <button class="btn" onclick="coPublicar()">Publicar</button></div>
    <span class="aviso">${esc(CO.error)}</span>
  </div>`;
}
function coCambioTipo(){
  const t = document.getElementById("coTipo").value;
  const conf = CO_TIPOS.find(x=>x[0]===t);
  const ta = document.getElementById("coTexto");
  if(conf && ta) ta.placeholder = conf[2];
}
function coUsarMeta(){
  const i = document.getElementById("coMeta").value;
  if(i === "") return;
  const m = state.metas[+i];
  document.getElementById("coTexto").value = m.descripcion;
  document.getElementById("coTipo").value = "meta";
  coCambioTipo();
}

function coTarjeta(p){
  return `<div class="card" style="padding:14px 16px;">
    <div class="lista-item" style="border:none;padding:0 0 6px;">
      <span style="flex:1;">
        <b style="cursor:pointer;" onclick="coVerPerfil(${p.usuario_id})">${esc(p.alias)}</b>
        <span class="aviso"> ${CO_ETIQUETA[p.tipo]||""}${p.grupo_nombre?` en ${esc(p.grupo_nombre)}`:""}</span>
      </span>
      <span class="aviso">${esc(p.creado_en)}</span>
    </div>
    <p style="white-space:pre-wrap;margin:4px 0 10px;">${CO_ICONO[p.tipo]||""} ${esc(p.texto)}</p>
    <div class="fila" style="gap:8px;flex-wrap:wrap;">
      <button class="btn-sec" onclick="coApoyar(${p.id}, ${!p.apoyado})"
        style="${p.apoyado?"background:#e3efe9;":""}">🤝 Te acompaño${p.apoyos?" · "+p.apoyos:""}</button>
      ${p.es_mia
        ? `<button class="btn-mini" onclick="coBorrar(${p.id})">Borrar</button>`
        : `<button class="btn-mini" onclick="coReportar(${p.id})">Reportar</button>`}
    </div>
  </div>`;
}

function coMuro(){
  const g = CO.grupo ? CO.grupos.find(x=>x.id===CO.grupo) : null;
  return `${g ? `<div class="card"><div class="lema">Grupo de apoyo</div>
      <h2>${esc(g.nombre)}</h2><p class="sub">${esc(g.objetivo)}</p>
      <button class="btn-sec" onclick="coIr('muro')">← Volver a mi muro</button></div>` : ""}
    ${coCompositor()}
    ${CO.cargando ? '<div class="card centro"><p class="sub">Cargando...</p></div>' : ""}
    ${CO.muro.length ? CO.muro.map(coTarjeta).join("") : `<div class="card centro">
      <p class="sub">${CO.grupo ? "Todavía nadie ha escrito en este grupo. Puedes ser la primera persona."
        : "Tu muro está vacío. Sigue a alguien o entra a un grupo de apoyo para empezar a ver publicaciones."}</p>
      ${!CO.grupo?`<button class="btn" onclick="coIr('grupos')">Ver grupos de apoyo</button>`:""}</div>`}`;
}

function coGrupos(){
  return `<div class="card"><div class="lema">Grupos de apoyo</div>
    <h2>Las diez áreas de tu vida</h2>
    <p class="sub">Cada área del método es un grupo. Entra a los que estás trabajando: verás lo que comparten quienes están en lo mismo.</p></div>
    ${CO.grupos.map(g=>`<div class="card" style="padding:14px 16px;">
      <div class="lista-item" style="border:none;padding:0;flex-wrap:wrap;">
        <span style="flex:1;min-width:160px;"><b>${esc(g.nombre)}</b><br>
          <span class="aviso">${esc(g.objetivo)}</span></span>
        <span class="tag">${g.miembros} ${g.miembros===1?"persona":"personas"}</span>
        <button class="btn-sec" onclick="coIr('muro','${g.id}')">Ver</button>
        <button class="${g.soy_miembro?"btn-mini":"btn-sec"}" onclick="coGrupo('${g.id}', ${!g.soy_miembro})">
          ${g.soy_miembro?"Salir":"Unirme"}</button>
      </div></div>`).join("")}`;
}

function coPersonas(){
  return `<div class="card"><div class="lema">Personas</div>
    <h2>A quién puedes seguir</h2>
    <p class="sub">Al seguir a alguien verás en tu muro lo que decida compartir.</p></div>
    ${CO.personas.length ? CO.personas.map(p=>`<div class="card" style="padding:14px 16px;">
      <div class="lista-item" style="border:none;padding:0;flex-wrap:wrap;">
        <span style="flex:1;min-width:150px;">
          <b style="cursor:pointer;" onclick="coVerPerfil(${p.usuario_id})">${esc(p.alias)}</b><br>
          <span class="aviso">${esc(p.bio||"")}</span></span>
        <span class="tag">${p.seguidores} ${p.seguidores===1?"seguidor":"seguidores"}</span>
        <button class="${p.lo_sigo?"btn-mini":"btn-sec"}" onclick="coSeguir(${p.usuario_id}, ${!p.lo_sigo})">
          ${p.lo_sigo?"Dejar de seguir":"Seguir"}</button>
      </div></div>`).join("")
      : '<div class="card centro"><p class="sub">Todavía no hay más personas en la comunidad. Serás de las primeras.</p></div>'}`;
}

function coPerfilOtro(){
  const p = CO.viendo;
  return `<div class="card">
    <button class="btn-mini" onclick="CO.viendo=null;render()">← Volver</button>
    <h2 style="margin-top:8px;">${esc(p.alias)}</h2>
    ${p.bio?`<p class="sub">${esc(p.bio)}</p>`:""}
    <div class="grid">
      <div class="kpi"><div class="num">${p.seguidores}</div><div class="lbl">Seguidores</div></div>
      <div class="kpi"><div class="num">${p.siguiendo}</div><div class="lbl">Sigue a</div></div>
    </div>
    <div class="fila" style="gap:8px;margin-top:12px;">
      <button class="btn" onclick="coSeguir(${p.usuario_id}, ${!p.lo_sigo})">${p.lo_sigo?"Dejar de seguir":"Seguir"}</button>
      <button class="btn-mini" onclick="coBloquear(${p.usuario_id})">Bloquear</button>
    </div></div>
    ${p.publicaciones.length ? p.publicaciones.map(coTarjeta).join("")
      : '<div class="card centro"><p class="sub">Todavía no ha compartido nada.</p></div>'}`;
}

function coMiPerfil(){
  const y = CO.yo;
  return `<div class="card"><div class="lema">Mi perfil</div>
    <h2>${esc(y.alias)}</h2>
    <div class="grid">
      <div class="kpi"><div class="num">${y.seguidores}</div><div class="lbl">Seguidores</div></div>
      <div class="kpi"><div class="num">${y.siguiendo}</div><div class="lbl">Sigue a</div></div>
      <div class="kpi"><div class="num">${y.publicaciones}</div><div class="lbl">Publicaciones</div></div>
    </div>
    <label class="campo">¿Cómo quieres que te vean?</label>
    <input type="text" id="coAlias" maxlength="40" value="${esc(y.alias)}">
    <label class="campo">Una línea sobre ti</label>
    <textarea id="coBio" maxlength="300">${esc(y.bio||"")}</textarea>
    <br><button class="btn" onclick="coGuardarPerfil()">Guardar</button>
    <span class="aviso">${esc(CO.error)}</span>
    <p class="aviso" style="margin-top:14px;">Recuerda: tu plan de vida, tus talleres y tus anotaciones diarias son privados. Aquí solo se ve lo que publicas a propósito.</p>
  </div>`;
}

function vComunidad(){
  if(!CO.yo && !CO.cargando){ setTimeout(coCargar, 20); }
  const pestanas = [["muro","Mi muro"],["grupos","Grupos"],["personas","Personas"],["perfil","Mi perfil"]];
  const barra = `<div class="card" style="padding:10px;">
    <div class="fila" style="gap:6px;flex-wrap:wrap;">
      ${pestanas.map(([id,n])=>`<button class="${CO.pestana===id&&!CO.viendo?"btn":"btn-sec"}"
        onclick="coIr('${id}')">${n}</button>`).join("")}
    </div></div>`;

  if(!CO.yo) return CO.cargando
    ? '<div class="card centro"><p class="sub">Cargando comunidad...</p></div>'
    : coPerfilNuevo();
  if(CO.viendo) return barra + coPerfilOtro();
  if(CO.pestana === "grupos")   return barra + coGrupos();
  if(CO.pestana === "personas") return barra + coPersonas();
  if(CO.pestana === "perfil")   return barra + coMiPerfil();
  return barra + coMuro();
}
