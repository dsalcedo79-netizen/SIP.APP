# SIP.MDV · Maestría de Vida — MVP local v3

**VIVE • CRECE • CONTRIBUYE** — La app ES el viaje: 5 fases guiadas por las preguntas de la Metodología Oficial.

## Cómo iniciarlo

1. Doble clic en `INICIAR_SIP.bat`
2. Abre http://localhost:8000 en tu navegador

## El Plan de Vuelo ✈️ (metáfora oficial del ciclo de 90 días)

Días 1–15 **🗺 Preparación** (Fases 1 y 2) · 16–30 **🛫 Despegue** (compromiso + nuevas rutinas) · 31–45 **📈 Ascenso** (consolidar hábitos) · 46–60 **✈️ Vuelo crucero** (mantener rumbo) · 61–75 **🛬 Aterrizaje** (correcciones) · 76–90 **🏁 Llegada** (cierre y nuevo destino). En cada corte (15/30/45/60/75/90) la app genera el informe y un botón lleva la evaluación directamente al Coach IA.

## El viaje (con compuertas, decisión CEO)

1. **Tu Estado Actual** — Rueda de la Vida, Test de Temperamento (4 clásicos), FODA, Ikigai. *Obligatoria.*
2. **Tu Plan de Vida** — Vive•Crece•Contribuye, objetivos por área, afirmaciones/aformaciones, Declaración de Vida, Vision Board. *Obligatoria.*
3. **Tus 90 Días** — prioridades, metas con % de avance y Compromiso Personal firmado. Se desbloquea al completar 1 y 2.
4. **Mi Día** — progresivo, "Día X de 90": prioridades, rutinas de mañana/noche, hábitos, meditación 21 días, gratitud, evaluación con estrellas y frase del banco propio MV.
5. **Tu Evolución** — informes automáticos en los días 15/30/45/60/75/90, revisión semanal, y al día 90: nueva Rueda comparativa (radar superpuesto), lecciones y nuevo ciclo.

**Coach IA** (transversal): chat real multi-proveedor (config.txt: groq activo). Requiere iniciar sesión con un usuario del sistema (gestionar con `gestionar_usuarios.py`). El Coach recibe el contexto del usuario (fase, rueda, metas, racha) en cada conversación.

## Componentes de SIP.MDV

Motor: `app.py` (servidor probado: sesiones, login PBKDF2, chat multi-IA), `config.txt` (con clave groq activa), `usuarios.json`, `gestionar_usuarios.py`. Los módulos empresariales del software de origen fueron eliminados.

Los datos del usuario se guardan en el navegador (localStorage, origen localhost:8000).
