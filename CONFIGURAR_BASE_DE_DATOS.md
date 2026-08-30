# Configurar la base de datos de SIP.MDV

El registro de usuarios necesita una base de datos Postgres. Mientras no esté
configurada, la app **sigue funcionando igual que siempre**: el Coach IA entra
con las cuentas de `usuarios.json` y la pantalla de registro muestra un aviso
en vez de crear cuentas. No hay riesgo en desplegar sin ella.

Son tres pasos y toma unos diez minutos.

---

## Paso 1 · Crear la base en Neon (gratis)

1. Entra a **https://neon.com** y crea una cuenta.
2. Crea un proyecto. Ponle un nombre como `sip-mdv`.
3. Elige la región más cercana a tus usuarios (para Colombia, `AWS us-east-1`).
4. Al terminar, Neon muestra una **connection string** parecida a esta:

   ```
   postgresql://NOMBRE:CLAVE@ep-algo-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   Cópiala completa. **Es una credencial: no la pegues en ningún archivo del
   proyecto, ni la compartas por chat o correo.**

> La capa gratuita de Neon suspende la base tras un rato sin uso y la despierta
> sola en la siguiente consulta. La primera petición después de una pausa puede
> tardar un par de segundos.

---

## Paso 2 · Pegarla en Render

1. Entra a **https://dashboard.render.com** y abre el servicio `sip-app-1`.
2. Ve a **Environment**.
3. **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: la cadena que copiaste de Neon
4. **Save Changes**. Render reinicia el servicio solo.

Las tablas se crean automáticamente en el primer arranque. No hay que ejecutar
ningún script.

---

## Paso 3 · Verificar

Abre en el navegador:

```
https://sip-app-1.onrender.com/healthz
```

- `{"ok": true, ..., "db": true, "registro": true}` → **listo**, el registro está activo.
- `{"ok": true, ..., "db": false, "registro": false}` → todavía no conecta. Revisa
  los logs del servicio en Render: la línea `Base de datos: NO conectada (...)`
  dice exactamente por qué.

Después, crea una cuenta de prueba desde la pantalla del Coach IA y confirma que
aparece en el panel **Actividad**.

---

## El panel de Actividad

Aparece como una pestaña más en el menú superior, **solo** para quien entre con
una cuenta de rol `presidente` o `vicepresidente` (las de `usuarios.json`).
Muestra:

- Personas registradas, nuevas en la semana, y activas a 7 y 28 días.
- **Activación** (cuántos completaron la Fase 1) contra la meta del 60%.
- **Retención a 4 semanas** contra la meta del 40%.
- Cada persona: hasta dónde llegó y cuándo entró por última vez.
- **Los números de WhatsApp**, con un botón para copiarlos y armar el grupo.

---

## Qué se guarda de cada persona

Solo esto: nombre, correo, WhatsApp, contraseña (como hash PBKDF2 con 200 000
iteraciones y salt único, nunca en texto plano), rol y fechas de registro y
último acceso. Más una tabla de eventos con qué hito del método alcanzó y
cuándo.

**No se guardan direcciones IP.** Con la cuenta y la fecha basta para saber
quién usa el programa, y recolectar lo mínimo es lo que pide el propio
documento de definición del MVP.

El plan de vida de cada usuario (rueda, metas, hábitos, diario) **sigue
guardándose solo en su navegador**. Si limpia los datos del sitio o cambia de
teléfono, lo pierde. Subirlo al servidor es un trabajo aparte.

---

## Borrado de datos

Si alguien pide que borren su cuenta, en la consola SQL de Neon:

```sql
DELETE FROM usuarios WHERE email_norm = 'sucorreo@ejemplo.com';
```

Los eventos de esa persona se borran solos (`ON DELETE CASCADE`).

---

## Si algo falla

La app está hecha para no caerse: si la base no responde, el registro se
deshabilita con un aviso y todo lo demás sigue funcionando. Los errores de
base de datos se imprimen en los logs de Render con el prefijo `! db.`.
