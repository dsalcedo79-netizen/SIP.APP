# -*- coding: utf-8 -*-
"""
Capa social de SIP.MDV — perfiles, seguimientos, publicaciones y grupos.

Principio de diseno, no negociable:

    El plan de vida es PRIVADO. Nada de lo que la persona escribe en sus
    talleres llega aqui por si solo. Publicar es siempre un acto explicito,
    pieza por pieza, y lo publicado vive en estas tablas, nunca en `planes`.

Reutiliza la conexion de db.py: una sola configuracion (DATABASE_URL) y un
solo punto de fallo. Si la base no esta disponible, todas las funciones
devuelven vacio en vez de reventar.
"""

import re

import db

# Los grupos de apoyo son las 10 areas de vida del metodo. Existen desde el
# primer arranque: nunca hay un grupo vacio esperando a que alguien lo cree.
GRUPOS_AREA = [
    ("espiritual",   "Espiritual",      "Conectar con tu yo interior y tu entorno"),
    ("emocional",    "Emocional",       "Sentirte bien la mayor parte del tiempo"),
    ("mental",       "Mental",          "Aumentar el conocimiento y dominar la mente a tu favor"),
    ("salud",        "Salud",           "Tener un estilo de vida saludable"),
    ("personalidad", "Personalidad",    "Fuerza de caracter y valores constructivos"),
    ("familiar",     "Familiar",        "Tener una buena relacion familiar y de pareja"),
    ("social",       "Social",          "Tener buenas amistades"),
    ("ocupacional",  "Ocupacional",     "Desarrollar habilidades que te hagan mejor profesional"),
    ("economico",    "Económico",       "Tener multiples fuentes de ingreso"),
    ("calidad_vida", "Calidad de Vida", "Tener grandes experiencias de vida"),
]

# Que se puede publicar. El tipo cambia como se presenta, no quien lo ve.
TIPOS = {
    "mensaje": "compartio",
    "meta":    "se propuso una meta",
    "leccion": "aprendio algo",
    "mejora":  "quiere mejorar en",
}

LIMITE_TEXTO = 1500

ESQUEMA = """
-- Perfil publico. Deliberadamente separado de `usuarios`: el alias es lo que
-- ven los demas y no tiene por que ser el nombre real de la cuenta.
CREATE TABLE IF NOT EXISTS perfiles (
    usuario_id BIGINT      PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    alias      TEXT        NOT NULL,
    bio        TEXT        NOT NULL DEFAULT '',
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguimientos (
    seguidor_id BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    seguido_id  BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (seguidor_id, seguido_id),
    CHECK (seguidor_id <> seguido_id)
);

CREATE TABLE IF NOT EXISTS grupos (
    id       TEXT PRIMARY KEY,
    nombre   TEXT NOT NULL,
    objetivo TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS miembros_grupo (
    grupo_id   TEXT        NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (grupo_id, usuario_id)
);

-- grupo_id NULL significa "a quienes me siguen".
CREATE TABLE IF NOT EXISTS publicaciones (
    id         BIGSERIAL   PRIMARY KEY,
    usuario_id BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    grupo_id   TEXT        REFERENCES grupos(id) ON DELETE SET NULL,
    tipo       TEXT        NOT NULL DEFAULT 'mensaje',
    texto      TEXT        NOT NULL,
    area       TEXT,
    oculta     BOOLEAN     NOT NULL DEFAULT false,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pub_fecha_idx  ON publicaciones (creado_en DESC);
CREATE INDEX IF NOT EXISTS pub_grupo_idx  ON publicaciones (grupo_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS pub_autor_idx  ON publicaciones (usuario_id, creado_en DESC);

-- No es un "me gusta": es "te acompano". El nombre importa en un producto
-- de crecimiento personal.
CREATE TABLE IF NOT EXISTS apoyos (
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (publicacion_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS bloqueos (
    usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    bloqueado_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, bloqueado_id)
);

CREATE TABLE IF NOT EXISTS reportes (
    id             BIGSERIAL   PRIMARY KEY,
    publicacion_id BIGINT      REFERENCES publicaciones(id) ON DELETE CASCADE,
    usuario_id     BIGINT      REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo         TEXT        NOT NULL DEFAULT '',
    atendido       BOOLEAN     NOT NULL DEFAULT false,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def inicializar():
    """Crea las tablas y siembra los 10 grupos de area."""
    if not db.disponible():
        return False
    try:
        with db._conectar() as con, con.cursor() as cur:
            cur.execute(ESQUEMA)
            for gid, nombre, objetivo in GRUPOS_AREA:
                cur.execute(
                    "INSERT INTO grupos (id, nombre, objetivo) VALUES (%s,%s,%s) "
                    "ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, "
                    "objetivo=EXCLUDED.objetivo",
                    (gid, nombre, objetivo))
            con.commit()
        return True
    except Exception as e:
        print("  ! social.inicializar:", e)
        return False


def _uid(cur, email):
    cur.execute("SELECT id FROM usuarios WHERE email_norm = %s",
                (db.normalizar_email(email),))
    f = cur.fetchone()
    return f["id"] if f else None


def limpiar_texto(t):
    t = re.sub(r"\s+\n", "\n", str(t or "").strip())
    return t[:LIMITE_TEXTO]


# ---------------- Perfil ----------------

def mi_perfil(email):
    """Perfil publico propio, o None si todavia no lo ha creado."""
    if not db.disponible():
        return None
    try:
        with db._conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT p.usuario_id, p.alias, p.bio,
                       (SELECT count(*) FROM seguimientos s WHERE s.seguido_id  = p.usuario_id) AS seguidores,
                       (SELECT count(*) FROM seguimientos s WHERE s.seguidor_id = p.usuario_id) AS siguiendo,
                       (SELECT count(*) FROM publicaciones x WHERE x.usuario_id = p.usuario_id AND NOT x.oculta) AS publicaciones
                  FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id
                 WHERE u.email_norm = %s""", (db.normalizar_email(email),))
            return cur.fetchone()
    except Exception as e:
        print("  ! social.mi_perfil:", e)
        return None


def guardar_perfil(email, alias, bio):
    """Crea o actualiza el perfil publico. El alias es lo que veran los demas."""
    if not db.disponible():
        return False, "La comunidad no esta disponible."
    alias = limpiar_texto(alias)[:40]
    if len(alias) < 2:
        return False, "Escribe como quieres que te vean (minimo 2 caracteres)."
    try:
        with db._conectar() as con, con.cursor() as cur:
            uid = _uid(cur, email)
            if not uid:
                return False, "Cuenta no encontrada."
            cur.execute(
                "INSERT INTO perfiles (usuario_id, alias, bio) VALUES (%s,%s,%s) "
                "ON CONFLICT (usuario_id) DO UPDATE SET alias=EXCLUDED.alias, bio=EXCLUDED.bio",
                (uid, alias, limpiar_texto(bio)[:300]))
            con.commit()
        return True, None
    except Exception as e:
        print("  ! social.guardar_perfil:", e)
        return False, "No se pudo guardar el perfil."


# ---------------- Publicar ----------------

def publicar(email, texto, tipo="mensaje", area=None, grupo=None):
    if not db.disponible():
        return False, "La comunidad no esta disponible."
    texto = limpiar_texto(texto)
    if len(texto) < 2:
        return False, "Escribe algo antes de publicar."
    if tipo not in TIPOS:
        tipo = "mensaje"
    try:
        with db._conectar() as con, con.cursor() as cur:
            uid = _uid(cur, email)
            if not uid:
                return False, "Cuenta no encontrada."
            cur.execute("SELECT 1 FROM perfiles WHERE usuario_id = %s", (uid,))
            if not cur.fetchone():
                return False, "Antes de publicar, crea tu perfil de comunidad."
            cur.execute(
                "INSERT INTO publicaciones (usuario_id, grupo_id, tipo, texto, area) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (uid, grupo or None, tipo, texto, area or None))
            con.commit()
        return True, None
    except Exception as e:
        print("  ! social.publicar:", e)
        return False, "No se pudo publicar."


def borrar_publicacion(email, pub_id):
    """Solo el autor puede borrar la suya."""
    if not db.disponible():
        return False
    try:
        with db._conectar() as con, con.cursor() as cur:
            uid = _uid(cur, email)
            cur.execute("DELETE FROM publicaciones WHERE id = %s AND usuario_id = %s",
                        (int(pub_id), uid))
            con.commit()
            return cur.rowcount > 0
    except Exception as e:
        print("  ! social.borrar_publicacion:", e)
        return False


# ---------------- Leer ----------------

# Que ve cada quien: lo suyo, lo de quienes sigue, y lo de los grupos a los
# que pertenece. Nunca lo de alguien a quien bloqueo, ni lo oculto por
# moderacion.
_VISIBLE = """
  FROM publicaciones p
  JOIN perfiles pe ON pe.usuario_id = p.usuario_id
  LEFT JOIN grupos g ON g.id = p.grupo_id
 WHERE NOT p.oculta
   AND p.usuario_id NOT IN (SELECT bloqueado_id FROM bloqueos WHERE usuario_id = %(yo)s)
"""

_CAMPOS = """
SELECT p.id, p.tipo, p.texto, p.area, p.grupo_id, p.creado_en,
       p.usuario_id, pe.alias, g.nombre AS grupo_nombre,
       (SELECT count(*) FROM apoyos a WHERE a.publicacion_id = p.id) AS apoyos,
       EXISTS (SELECT 1 FROM apoyos a
                WHERE a.publicacion_id = p.id AND a.usuario_id = %(yo)s) AS apoyado,
       (p.usuario_id = %(yo)s) AS es_mia
"""


def _filas(cur):
    out = []
    for r in cur.fetchall():
        r = dict(r)
        r["creado_en"] = r["creado_en"].isoformat(sep=" ", timespec="minutes")
        out.append(r)
    return out


def muro(email, grupo=None, limite=60):
    """Muro personal, o el de un grupo si se indica."""
    if not db.disponible():
        return []
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            if not yo:
                return []
            if grupo:
                cur.execute(_CAMPOS + _VISIBLE + """
                   AND p.grupo_id = %(grupo)s
                 ORDER BY p.creado_en DESC LIMIT %(lim)s""",
                    {"yo": yo, "grupo": grupo, "lim": int(limite)})
            else:
                cur.execute(_CAMPOS + _VISIBLE + """
                   AND ( p.usuario_id = %(yo)s
                      OR (p.grupo_id IS NULL AND p.usuario_id IN
                            (SELECT seguido_id FROM seguimientos WHERE seguidor_id = %(yo)s))
                      OR (p.grupo_id IS NOT NULL AND p.grupo_id IN
                            (SELECT grupo_id FROM miembros_grupo WHERE usuario_id = %(yo)s)) )
                 ORDER BY p.creado_en DESC LIMIT %(lim)s""",
                    {"yo": yo, "lim": int(limite)})
            return _filas(cur)
    except Exception as e:
        print("  ! social.muro:", e)
        return []


def perfil_de(email, usuario_id):
    """Perfil publico de otra persona y sus publicaciones visibles."""
    if not db.disponible():
        return None
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            cur.execute("""
                SELECT pe.usuario_id, pe.alias, pe.bio,
                       (SELECT count(*) FROM seguimientos s WHERE s.seguido_id  = pe.usuario_id) AS seguidores,
                       (SELECT count(*) FROM seguimientos s WHERE s.seguidor_id = pe.usuario_id) AS siguiendo,
                       EXISTS (SELECT 1 FROM seguimientos s
                                WHERE s.seguidor_id = %s AND s.seguido_id = pe.usuario_id) AS lo_sigo,
                       EXISTS (SELECT 1 FROM bloqueos b
                                WHERE b.usuario_id = %s AND b.bloqueado_id = pe.usuario_id) AS bloqueado
                  FROM perfiles pe WHERE pe.usuario_id = %s""",
                (yo, yo, int(usuario_id)))
            p = cur.fetchone()
            if not p:
                return None
            p = dict(p)
            cur.execute(_CAMPOS + _VISIBLE + """
               AND p.usuario_id = %(otro)s
             ORDER BY p.creado_en DESC LIMIT 40""",
                {"yo": yo, "otro": int(usuario_id)})
            p["publicaciones"] = _filas(cur)
            return p
    except Exception as e:
        print("  ! social.perfil_de:", e)
        return None


def personas(email, limite=60):
    """Gente a la que se puede seguir. No aparece quien me bloqueo ni a quien bloquee."""
    if not db.disponible():
        return []
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            cur.execute("""
                SELECT pe.usuario_id, pe.alias, pe.bio,
                       (SELECT count(*) FROM seguimientos s WHERE s.seguido_id = pe.usuario_id) AS seguidores,
                       EXISTS (SELECT 1 FROM seguimientos s
                                WHERE s.seguidor_id = %(yo)s AND s.seguido_id = pe.usuario_id) AS lo_sigo
                  FROM perfiles pe
                 WHERE pe.usuario_id <> %(yo)s
                   AND pe.usuario_id NOT IN (SELECT bloqueado_id FROM bloqueos WHERE usuario_id = %(yo)s)
                   AND %(yo)s NOT IN (SELECT bloqueado_id FROM bloqueos WHERE usuario_id = pe.usuario_id)
                 ORDER BY seguidores DESC, pe.creado_en DESC LIMIT %(lim)s""",
                {"yo": yo, "lim": int(limite)})
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print("  ! social.personas:", e)
        return []


def grupos(email):
    """Los 10 grupos de area, con cuanta gente hay y si soy miembro."""
    if not db.disponible():
        return []
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            cur.execute("""
                SELECT g.id, g.nombre, g.objetivo,
                       (SELECT count(*) FROM miembros_grupo m WHERE m.grupo_id = g.id) AS miembros,
                       (SELECT count(*) FROM publicaciones p
                         WHERE p.grupo_id = g.id AND NOT p.oculta) AS publicaciones,
                       EXISTS (SELECT 1 FROM miembros_grupo m
                                WHERE m.grupo_id = g.id AND m.usuario_id = %s) AS soy_miembro
                  FROM grupos g ORDER BY g.nombre""", (yo,))
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print("  ! social.grupos:", e)
        return []


# ---------------- Acciones ----------------

def _accion(email, sql, extra, etiqueta):
    if not db.disponible():
        return False
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            if not yo:
                return False
            cur.execute(sql, (yo,) + tuple(extra))
            con.commit()
        return True
    except Exception as e:
        print("  ! social.%s:" % etiqueta, e)
        return False


def seguir(email, otro_id, seguir_si=True):
    if int(otro_id) <= 0:
        return False
    if seguir_si:
        return _accion(email,
            "INSERT INTO seguimientos (seguidor_id, seguido_id) VALUES (%s,%s) "
            "ON CONFLICT DO NOTHING", (int(otro_id),), "seguir")
    return _accion(email,
        "DELETE FROM seguimientos WHERE seguidor_id=%s AND seguido_id=%s",
        (int(otro_id),), "dejar de seguir")


def apoyar(email, pub_id, apoyar_si=True):
    if apoyar_si:
        return _accion(email,
            "INSERT INTO apoyos (usuario_id, publicacion_id) VALUES (%s,%s) "
            "ON CONFLICT DO NOTHING", (int(pub_id),), "apoyar")
    return _accion(email,
        "DELETE FROM apoyos WHERE usuario_id=%s AND publicacion_id=%s",
        (int(pub_id),), "quitar apoyo")


def unirse(email, grupo_id, entrar=True):
    if entrar:
        return _accion(email,
            "INSERT INTO miembros_grupo (usuario_id, grupo_id) VALUES (%s,%s) "
            "ON CONFLICT DO NOTHING", (str(grupo_id),), "unirse")
    return _accion(email,
        "DELETE FROM miembros_grupo WHERE usuario_id=%s AND grupo_id=%s",
        (str(grupo_id),), "salir del grupo")


def bloquear(email, otro_id, bloquear_si=True):
    """Bloquear tambien deshace el seguimiento en ambos sentidos."""
    if not db.disponible():
        return False
    try:
        with db._conectar() as con, con.cursor() as cur:
            yo = _uid(cur, email)
            if not yo or int(otro_id) == yo:
                return False
            if bloquear_si:
                cur.execute("INSERT INTO bloqueos (usuario_id, bloqueado_id) "
                            "VALUES (%s,%s) ON CONFLICT DO NOTHING", (yo, int(otro_id)))
                cur.execute("DELETE FROM seguimientos WHERE "
                            "(seguidor_id=%s AND seguido_id=%s) OR (seguidor_id=%s AND seguido_id=%s)",
                            (yo, int(otro_id), int(otro_id), yo))
            else:
                cur.execute("DELETE FROM bloqueos WHERE usuario_id=%s AND bloqueado_id=%s",
                            (yo, int(otro_id)))
            con.commit()
        return True
    except Exception as e:
        print("  ! social.bloquear:", e)
        return False


def reportar(email, pub_id, motivo):
    return _accion(email,
        "INSERT INTO reportes (usuario_id, publicacion_id, motivo) VALUES (%s,%s,%s)",
        (int(pub_id), limpiar_texto(motivo)[:300]), "reportar")


# ---------------- Moderacion ----------------

def reportes_pendientes(limite=100):
    if not db.disponible():
        return []
    try:
        with db._conectar() as con, con.cursor() as cur:
            cur.execute("""
                SELECT r.id, r.motivo, r.creado_en, r.publicacion_id,
                       p.texto, p.tipo, p.oculta, pe.alias AS autor,
                       COALESCE(qe.alias, 'cuenta borrada') AS reporta
                  FROM reportes r
                  LEFT JOIN publicaciones p ON p.id = r.publicacion_id
                  LEFT JOIN perfiles pe ON pe.usuario_id = p.usuario_id
                  LEFT JOIN perfiles qe ON qe.usuario_id = r.usuario_id
                 WHERE NOT r.atendido
                 ORDER BY r.creado_en DESC LIMIT %s""", (int(limite),))
            filas = []
            for r in cur.fetchall():
                r = dict(r)
                r["creado_en"] = r["creado_en"].isoformat(sep=" ", timespec="minutes")
                filas.append(r)
            return filas
    except Exception as e:
        print("  ! social.reportes_pendientes:", e)
        return []


def moderar(pub_id, ocultar=True, reporte_id=None):
    """Oculta o restaura una publicacion y marca el reporte como atendido."""
    if not db.disponible():
        return False
    try:
        with db._conectar() as con, con.cursor() as cur:
            cur.execute("UPDATE publicaciones SET oculta = %s WHERE id = %s",
                        (bool(ocultar), int(pub_id)))
            if reporte_id:
                cur.execute("UPDATE reportes SET atendido = true WHERE id = %s",
                            (int(reporte_id),))
            con.commit()
        return True
    except Exception as e:
        print("  ! social.moderar:", e)
        return False
