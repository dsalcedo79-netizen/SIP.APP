# -*- coding: utf-8 -*-
"""
Capa de datos de SIP.MDV — cuentas de usuario en Postgres.

Se configura con una sola variable de entorno:

    DATABASE_URL=postgresql://usuario:clave@host/basededatos?sslmode=require

La cadena la entrega Neon o Supabase al crear la base. Se pega en el panel de
Render (Environment), nunca en un archivo del repositorio.

Si DATABASE_URL no esta configurada, o si el driver no esta instalado, el
modulo queda inactivo: la app sigue funcionando con usuarios.json y el registro
de nuevas cuentas se deshabilita con un aviso claro. Nunca revienta el arranque.
"""

import os
import re
import threading

_LOCK = threading.Lock()
_ESTADO = {"listo": False, "motivo": "sin inicializar"}

DATABASE_URL = (os.environ.get("DATABASE_URL") or "").strip()

try:
    import psycopg
    from psycopg.rows import dict_row
    _DRIVER = True
except ImportError:
    psycopg = None
    dict_row = None
    _DRIVER = False


ESQUEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id           BIGSERIAL PRIMARY KEY,
    email        TEXT        NOT NULL,
    email_norm   TEXT        NOT NULL UNIQUE,
    nombre       TEXT        NOT NULL,
    whatsapp     TEXT,
    whatsapp_norm TEXT,
    salt         TEXT        NOT NULL,
    hash         TEXT        NOT NULL,
    rol          TEXT        NOT NULL DEFAULT 'usuario',
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_login TIMESTAMPTZ
);

-- Registro de actividad. A proposito NO se guarda la direccion IP:
-- con la cuenta y la fecha basta para saber quien usa el programa.
CREATE TABLE IF NOT EXISTS eventos (
    id         BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT      REFERENCES usuarios(id) ON DELETE CASCADE,
    email_norm TEXT,
    evento     TEXT        NOT NULL,
    detalle    TEXT,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eventos_usuario_idx ON eventos (usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS eventos_fecha_idx   ON eventos (creado_en DESC);

-- Por si la tabla se creo antes de que existiera el WhatsApp.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp      TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp_norm TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_whatsapp_uniq
    ON usuarios (whatsapp_norm) WHERE whatsapp_norm IS NOT NULL;
"""

# Eventos que el sistema reconoce. Cualquier otro nombre se descarta, para que
# nadie pueda llenar la tabla con basura desde el navegador.
EVENTOS = {
    "registro":       "Creo su cuenta",
    "login":          "Inicio sesion",
    "rueda_guardada": "Guardo su Rueda de la Vida",
    "fase1":          "Completo la Fase 1",
    "fase2":          "Completo la Fase 2",
    "plan_firmado":   "Firmo su plan de 90 dias",
    "dia_evaluado":   "Evaluo su dia",
    "coach":          "Converso con el Coach IA",
}


def _conectar():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10)


def inicializar():
    """Crea la tabla si no existe. Devuelve (listo, motivo)."""
    with _LOCK:
        if not DATABASE_URL:
            _ESTADO.update(listo=False, motivo="DATABASE_URL no esta configurada")
            return False, _ESTADO["motivo"]
        if not _DRIVER:
            _ESTADO.update(listo=False, motivo="falta el driver psycopg (pip install 'psycopg[binary]')")
            return False, _ESTADO["motivo"]
        try:
            with _conectar() as con, con.cursor() as cur:
                cur.execute(ESQUEMA)
                con.commit()
            _ESTADO.update(listo=True, motivo="ok")
            return True, "ok"
        except Exception as e:
            _ESTADO.update(listo=False, motivo="no se pudo conectar: %s" % e)
            return False, _ESTADO["motivo"]


def disponible():
    return _ESTADO["listo"]


def motivo():
    return _ESTADO["motivo"]


def normalizar_email(email):
    return str(email or "").strip().lower()


# Validacion deliberadamente amplia: el objetivo es descartar errores de dedo,
# no decidir que direcciones existen.
_RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$")


def email_valido(email):
    return bool(_RE_EMAIL.match(normalizar_email(email)))


def normalizar_whatsapp(numero):
    """Deja el numero en formato internacional: +57 300 123 4567 -> +573001234567.
    Un numero para WhatsApp necesita indicativo de pais; sin el no se puede
    agregar a un grupo, asi que se exige explicito."""
    n = re.sub(r"[^\d+]", "", str(numero or "").strip())
    if n.startswith("00"):
        n = "+" + n[2:]
    if not n.startswith("+"):
        n = "+" + n
    return n


def whatsapp_valido(numero):
    n = normalizar_whatsapp(numero)
    # E.164: indicativo de pais mas numero, entre 8 y 15 digitos en total.
    return bool(re.match(r"^\+\d{8,15}$", n))


def buscar_por_email(email):
    """Devuelve el usuario como dict, o None. None tambien ante error de conexion."""
    if not disponible():
        return None
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute(
                "SELECT id, email, nombre, salt, hash, rol FROM usuarios WHERE email_norm = %s",
                (normalizar_email(email),))
            return cur.fetchone()
    except Exception as e:
        print("  ! db.buscar_por_email:", e)
        return None


def crear_usuario(email, nombre, whatsapp, salt, hash_hex, rol="usuario"):
    """Crea una cuenta. Devuelve (ok, error)."""
    if not disponible():
        return False, "El registro no esta disponible en este momento."
    norm = normalizar_email(email)
    wa = normalizar_whatsapp(whatsapp)
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute(
                "INSERT INTO usuarios (email, email_norm, nombre, whatsapp, whatsapp_norm, salt, hash, rol) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (email_norm) DO NOTHING "
                "RETURNING id",
                (str(email).strip(), norm, str(nombre).strip(), wa, wa, salt, hash_hex, rol))
            fila = cur.fetchone()
            con.commit()
        if not fila:
            return False, "Ya existe una cuenta con ese correo."
        return True, None
    except Exception as e:
        # El indice unico de whatsapp_norm se queja con "duplicate key".
        if "whatsapp" in str(e).lower() or "duplicate key" in str(e).lower():
            return False, "Ese numero de WhatsApp ya esta registrado con otra cuenta."
        print("  ! db.crear_usuario:", e)
        return False, "No se pudo crear la cuenta. Intenta de nuevo."


def marcar_login(email):
    if not disponible():
        return
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("UPDATE usuarios SET ultimo_login = now() WHERE email_norm = %s",
                        (normalizar_email(email),))
            con.commit()
    except Exception as e:
        print("  ! db.marcar_login:", e)


def registrar_evento(email, evento, detalle=None):
    """Anota una accion del usuario. Silencioso ante error: nunca debe
    interrumpir lo que el usuario estaba haciendo."""
    if not disponible() or evento not in EVENTOS:
        return
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute(
                "INSERT INTO eventos (usuario_id, email_norm, evento, detalle) "
                "SELECT id, email_norm, %s, %s FROM usuarios WHERE email_norm = %s",
                (evento, (str(detalle)[:400] if detalle else None), normalizar_email(email)))
            con.commit()
    except Exception as e:
        print("  ! db.registrar_evento:", e)


def resumen_usuarios(limite=500):
    """Una fila por persona: cuando se registro, cuando entro por ultima vez,
    cuantos dias distintos la uso y hasta donde llego en el metodo."""
    if not disponible():
        return []
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT u.email, u.nombre, u.whatsapp, u.rol, u.creado_en, u.ultimo_login,
                       count(e.id)                                        AS eventos,
                       count(DISTINCT date(e.creado_en))                  AS dias_activos,
                       max(e.creado_en)                                   AS ultima_accion,
                       bool_or(e.evento = 'fase1')                        AS hizo_fase1,
                       bool_or(e.evento = 'fase2')                        AS hizo_fase2,
                       bool_or(e.evento = 'plan_firmado')                 AS firmo_plan
                  FROM usuarios u
                  LEFT JOIN eventos e ON e.usuario_id = u.id
                 GROUP BY u.id
                 ORDER BY COALESCE(u.ultimo_login, u.creado_en) DESC
                 LIMIT %s""", (int(limite),))
            return cur.fetchall()
    except Exception as e:
        print("  ! db.resumen_usuarios:", e)
        return []


def metricas():
    """Los numeros del MVP: activacion y retencion."""
    if not disponible():
        return {}
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT
                  (SELECT count(*) FROM usuarios)                                              AS usuarios,
                  (SELECT count(*) FROM usuarios WHERE creado_en > now() - interval '7 days')   AS nuevos_7d,
                  (SELECT count(DISTINCT usuario_id) FROM eventos
                     WHERE creado_en > now() - interval '7 days')                              AS activos_7d,
                  (SELECT count(DISTINCT usuario_id) FROM eventos
                     WHERE creado_en > now() - interval '28 days')                             AS activos_28d,
                  (SELECT count(DISTINCT usuario_id) FROM eventos WHERE evento = 'fase1')      AS con_fase1,
                  (SELECT count(DISTINCT usuario_id) FROM eventos WHERE evento = 'plan_firmado') AS firmaron
            """)
            return cur.fetchone() or {}
    except Exception as e:
        print("  ! db.metricas:", e)
        return {}


def eventos_recientes(limite=100):
    if not disponible():
        return []
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT e.creado_en, e.evento, e.detalle, u.email, u.nombre
                  FROM eventos e JOIN usuarios u ON u.id = e.usuario_id
                 ORDER BY e.creado_en DESC LIMIT %s""", (int(limite),))
            return cur.fetchall()
    except Exception as e:
        print("  ! db.eventos_recientes:", e)
        return []


def lista_whatsapp():
    """Numeros validos para armar el grupo de WhatsApp, del mas reciente al mas antiguo."""
    if not disponible():
        return []
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT nombre, email, whatsapp, creado_en
                  FROM usuarios
                 WHERE whatsapp_norm IS NOT NULL AND whatsapp_norm <> ''
                 ORDER BY creado_en DESC""")
            return cur.fetchall()
    except Exception as e:
        print("  ! db.lista_whatsapp:", e)
        return []


def contar_usuarios():
    if not disponible():
        return 0
    try:
        with _conectar() as con, con.cursor() as cur:
            cur.execute("SELECT count(*) AS n FROM usuarios")
            return cur.fetchone()["n"]
    except Exception:
        return 0
