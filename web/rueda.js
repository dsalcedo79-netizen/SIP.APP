"use strict";
/* ============================================================
   Rueda de la Vida Interactiva — módulo ADITIVO (Fase 1)
   No modifica los talleres existentes. Claves propias:
   sip_rueda_vida_v1 (actual) · sip_rueda_historial_v1 (histórico)
   Colores: relleno #1D9E75, borde #0F6E56 (paleta de la app).
   ============================================================ */

var RV = { size: 360, c: 180, R: 148 };

function rvDims(){
  return (typeof DIMS !== "undefined") ? DIMS
    : ["Espiritual","Emocional","Mental","Cuerpo","Personalidad","Familiar","Social","Profesional","Financiero","Calidad de Vida"];
}
function rvEtiqueta(d){ return d === "Calidad de Vida" ? "Calidad Vida" : d; }

var RV_PREGUNTAS = {
  "Espiritual": "¿Cómo te gustaría que puedas estar a nivel espiritual?",
  "Emocional": "¿Cómo te gustaría sentir la mayor parte del tiempo?",
  "Mental": "¿Qué tipo de conocimientos y pensamientos te gustaría tener?",
  "Cuerpo": "¿Cómo te gustaría que fuera tu salud y tu cuerpo físico?",
  "Personalidad": "¿Qué tipo de características de personalidad te gustaría tener?",
  "Familiar": "¿Cómo te gustaría que fuera la relación familiar y de pareja?",
  "Social": "¿Qué características deseas en tus amistades y qué tipo de amigos se gustan tener?",
  "Profesional": "¿Qué tipo de características y habilidades te gustaría desarrollar?",
  "Financiero": "¿Cuáles te gustaría ganar y cómo te gustaría iniciarlo?",
  "Calidad de Vida": "¿Dónde te gustaría vivir, viajar o qué te gustaría comprar?"
};

function rvCargar(){
  try{
    var j = JSON.parse(localStorage.getItem("sip_rueda_vida_v1") || "null");
    if (j && j.valores) return j.valores;
  }catch(e){}
  // si no hay rueda guardada, parte del último diagnóstico existente (integración no destructiva)
  if (typeof state !== "undefined" && state.diagnosticos && state.diagnosticos.length){
    var u = state.diagnosticos[state.diagnosticos.length-1].valores || {};
    var v = {}; rvDims().forEach(function(d){ v[d] = u[d] || 0; });
    return v;
  }
  var v0 = {}; rvDims().forEach(function(d){ v0[d] = 0; });
  return v0;
}
function rvPersistir(){
  localStorage.setItem("sip_rueda_vida_v1", JSON.stringify({ fecha: new Date().toLocaleDateString("sv-SE"), valores: RV.valores }));
  window.SIP_RUEDA = RV.valores; // disponible para otros talleres/módulos
}

// geometría: (x,y) en coordenadas del viewBox → {area, nivel} o null
function rvCalc(x, y){
  var dx = x - RV.c, dy = y - RV.c;
  var dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > RV.R + 6 || dist < 4) return null;
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;      // -180..180, 0 = derecha
  var a = (ang + 90 + 360) % 360;                     // 0 = arriba, horario
  var i = Math.floor(a / 36) % 10;
  var nivel = Math.max(1, Math.min(10, Math.ceil(dist / RV.R * 10)));
  return { area: rvDims()[i], nivel: nivel, i: i };
}

function rvPunto(i, r, offset){
  var a = -Math.PI/2 + (i + (offset||0)) * 2*Math.PI/10;
  return [RV.c + r*Math.cos(a), RV.c + r*Math.sin(a)];
}
function rvSector(i, r){
  var p0 = rvPunto(i, r), p1 = rvPunto(i, r, 1);
  return "M"+RV.c+","+RV.c+" L"+p0[0].toFixed(1)+","+p0[1].toFixed(1)+
         " A"+r+","+r+" 0 0 1 "+p1[0].toFixed(1)+","+p1[1].toFixed(1)+" Z";
}

function rvSvg(){
  var dims = rvDims(), v = RV.valores, s = "";
  s += '<svg id="sipRuedaSvg" viewBox="0 0 '+RV.size+' '+RV.size+'" style="width:100%;max-width:420px;display:block;margin:0 auto;cursor:pointer;touch-action:manipulation;" onclick="rvClick(event)">';
  // sectores calificados (relleno hasta el nivel)
  dims.forEach(function(d, i){
    if (v[d] > 0){
      s += '<path d="'+rvSector(i, RV.R * v[d] / 10)+'" fill="#1D9E75" fill-opacity="0.55" stroke="#0F6E56" stroke-width="1.5"/>';
    }
  });
  // anillos 1..10
  for (var g = 1; g <= 10; g++){
    s += '<circle cx="'+RV.c+'" cy="'+RV.c+'" r="'+(RV.R*g/10)+'" fill="none" stroke="#e8e2d6" stroke-width="'+(g===10?2:1)+'"/>';
  }
  // líneas divisorias y etiquetas
  dims.forEach(function(d, i){
    var p = rvPunto(i, RV.R);
    s += '<line x1="'+RV.c+'" y1="'+RV.c+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="#d8d2c4" stroke-width="1"/>';
    var m = rvPunto(i, RV.R + 16, 0.5);
    s += '<text x="'+m[0].toFixed(1)+'" y="'+m[1].toFixed(1)+'" font-size="9.5" fill="#6b665d" text-anchor="middle" dominant-baseline="middle">'+rvEtiqueta(d)+'</text>';
    // número del nivel dentro del sector
    if (v[d] > 0){
      var n = rvPunto(i, Math.max(RV.R * v[d] / 10 - 14, 20), 0.5);
      s += '<text x="'+n[0].toFixed(1)+'" y="'+n[1].toFixed(1)+'" font-size="13" font-weight="bold" fill="#0F6E56" text-anchor="middle" dominant-baseline="middle">'+v[d]+'</text>';
    }
  });
  s += '</svg>';
  return s;
}

function rvIndicadores(){
  var dims = rvDims(), v = RV.valores;
  var calif = dims.filter(function(d){ return v[d] > 0; });
  if (!calif.length) return '<p class="sub centro">Toca la rueda para calificar tu primera área.</p>';
  var suma = 0; calif.forEach(function(d){ suma += v[d]; });
  var prom = (suma / calif.length).toFixed(1);
  var baja = calif[0]; calif.forEach(function(d){ if (v[d] < v[baja]) baja = d; });
  return '<div class="grid">'+
    '<div class="kpi"><div class="num">'+prom+' / 10</div><div class="lbl">Promedio de vida'+(calif.length<10?' ('+calif.length+'/10 áreas)':'')+'</div></div>'+
    '<div class="kpi"><div class="num" style="font-size:1.05rem;">'+baja+'</div><div class="lbl">Área a fortalecer ('+v[baja]+')</div></div>'+
  '</div>';
}

function rvRefresh(){
  var w = document.getElementById("rvWheel"); if (w) w.innerHTML = rvSvg();
  var ind = document.getElementById("rvInd"); if (ind) ind.innerHTML = rvIndicadores();
}

function rvClick(evt){
  var svg = document.getElementById("sipRuedaSvg"); if (!svg) return;
  var r = svg.getBoundingClientRect();
  var x = (evt.clientX - r.left) * (RV.size / r.width);
  var y = (evt.clientY - r.top) * (RV.size / r.height);
  var hit = rvCalc(x, y); if (!hit) return;
  RV.valores[hit.area] = hit.nivel;
  rvPersistir();
  rvRefresh();
}

function rvGuardar(){
  var hist = [];
  try{ hist = JSON.parse(localStorage.getItem("sip_rueda_historial_v1") || "[]"); }catch(e){}
  hist.push({ fecha: new Date().toLocaleDateString("sv-SE"), valores: Object.assign({}, RV.valores) });
  localStorage.setItem("sip_rueda_historial_v1", JSON.stringify(hist));
  // integración con la app: alimenta el diagnóstico oficial (Fase 5 compara con esto)
  if (typeof state !== "undefined" && typeof save === "function"){
    var vals = {}; rvDims().forEach(function(d){ vals[d] = RV.valores[d] || 1; });
    state.diagnosticos.push({ fecha: new Date().toLocaleDateString("sv-SE"), valores: vals });
    save();
  }
  var b = document.getElementById("rvBtn");
  if (b){ b.textContent = "✓ Rueda guardada en tu historial"; b.disabled = true;
    setTimeout(function(){ if (typeof render === "function") render(); }, 900); }
}

function rvPreguntasHTML(){
  var dims = rvDims(), html = '<div style="margin-top:20px;"><div class="grupo-titulo">Tu Estado Ideal en cada Área</div>';
  dims.forEach(function(d){
    html += '<details class="area" style="margin-bottom:10px;"><summary><span><b>'+d+'</b><br><span class="objetivo">'+RV_PREGUNTAS[d]+'</span></span></summary>'+
            '<div class="cuerpo"><textarea placeholder="Describe tu estado ideal en '+d+'" id="rvEI_'+d.replace(/\s/g,'_')+'" onblur="rvGuardarEI(\''+d+'\',this.value)" style="min-height:80px;"></textarea></div></details>';
  });
  html += '</div>';
  return html;
}

function rvGuardarEI(dim, valor){
  var ei = {};
  try{ ei = JSON.parse(localStorage.getItem("sip_rueda_estado_ideal") || "{}"); }catch(e){}
  ei[dim] = valor;
  localStorage.setItem("sip_rueda_estado_ideal", JSON.stringify(ei));
}

function rvCargarEI(){
  try{ return JSON.parse(localStorage.getItem("sip_rueda_estado_ideal") || "{}"); }catch(e){ return {}; }
}

function vRuedaHTML(){
  if (!RV.valores) RV.valores = rvCargar();
  window.SIP_RUEDA = RV.valores;
  var ei = rvCargarEI();
  var preguntasHtml = rvPreguntasHTML();
  // llenar los textareas con valores guardados
  setTimeout(function(){
    Object.keys(ei).forEach(function(dim){
      var el = document.getElementById("rvEI_"+dim.replace(/\s/g,'_'));
      if(el) el.value = ei[dim];
    });
  }, 100);
  return '<div class="card">'+
    '<h2>Mi rueda de la vida hoy</h2>'+
    '<p class="sub">Toca cada sector en el nivel que sientes esa área hoy (1–10). Cerca del centro = 1, cerca del borde = 10.</p>'+
    '<div id="rvWheel">'+rvSvg()+'</div>'+
    '<div id="rvInd">'+rvIndicadores()+'</div>'+
    '<br><div class="centro"><button class="btn" id="rvBtn" onclick="rvGuardar()">Guardar mi rueda</button></div>'+
    '<br><p class="aviso centro">"Lo que no se mide, no se controla, y no se puede gestionar y mejorar." — Peter Drucker</p>'+
    preguntasHtml+
  '</div>';
}
