# -*- coding: utf-8 -*-
"""
SIP · Maestría de Vida - Servidor local (multiusuario, multi-proveedor de IA)
Motor de SIP.MDV (código probado). Sirve la app SIP (web/) y el
Coach IA (agents/coach-ia-maestria.md) con PROVIDER: gemini | anthropic | groq.
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
AGENTS_DIR = os.path.join(BASE_DIR, "agents")
CONFIG_PATH = os.path.join(BASE_DIR, "config.txt")
USERS_PATH = os.path.join(BASE_DIR, "usuarios.json")

DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "anthropic": "claude-sonnet-5",
    "groq": "openai/gpt-oss-120b",
}
ANTHROPIC_ALIAS = {
    "opus": "claude-opus-5",
    "sonnet": "claude-sonnet-5",
    "haiku": "claude-haiku-4-5-20251001",
}
PBKDF2_ITERS = 200000

# ---- Limite de intentos ----
# Cada PBKDF2 cuesta ~100 ms de CPU, asi que sin tope un atacante puede tanto
# adivinar claves como tumbar el servidor. Ventana deslizante en memoria.
INTENTOS = {}
LIMITES = {"login": (8, 900), "registro": (5, 3600)}  # (intentos, segundos)


def limite_excedido(clave, accion):
    tope, ventana = LIMITES.get(accion, (10, 900))
    ahora = time.time()
    k = accion + ":" + str(clave).lower()
    marcas = [t for t in INTENTOS.get(k, []) if t > ahora - ventana]
    if len(INTENTOS) > 5000:
        INTENTOS.clear()
    INTENTOS[k] = marcas
    return len(marcas) >= tope


def anotar_intento(clave, accion):
    k = accion + ":" + str(clave).lower()
    INTENTOS.setdefault(k, []).append(time.time())


def limpiar_intentos(clave, accion):
    INTENTOS.pop(accion + ":" + str(clave).lower(), None)
SESSIONS = {}
SESSION_TTL = 60 * 60 * 12


def load_config():
    cfg = {"API_KEY": "", "PASSWORD": "sigei", "MODEL": "", "PORT": "8000",
           "PROVIDER": "gemini", "GEMINI_API_KEY": "", "ANTHROPIC_API_KEY": "",
           "GROQ_API_KEY": ""}
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                cfg[k.strip().upper()] = v.strip()
    for key in list(cfg.keys()):
        env = os.environ.get(key)
        if env:
            cfg[key] = env.strip()
    cfg["PROVIDER"] = (cfg.get("PROVIDER") or "gemini").lower()
    return cfg


CONFIG = load_config()


def provider_key():
    p = CONFIG.get("PROVIDER", "gemini")
    specific = {"gemini": "GEMINI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
                "groq": "GROQ_API_KEY"}.get(p, "")
    return (CONFIG.get(specific, "").strip() or CONFIG.get("API_KEY", "").strip())


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                             bytes.fromhex(salt), PBKDF2_ITERS)
    return salt, dk.hex()


def verify_password(password, salt, expected_hex):
    try:
        _, h = hash_password(password, salt)
    except Exception:
        return False
    return hmac.compare_digest(h, expected_hex)


def default_users():
    salt, h = hash_password(CONFIG.get("PASSWORD", "sigei"))
    return {"roles": {"presidente": {"etiqueta": "Presidente"}},
            "usuarios": [{"usuario": "ceo", "nombre": "CEO", "rol": "presidente",
                          "salt": salt, "hash": h}]}


def load_users():
    if os.path.exists(USERS_PATH):
        try:
            with open(USERS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("usuarios"):
                return data
        except Exception as e:
            print("  ! usuarios.json no se pudo leer:", e)
    return default_users()


USERS = load_users()


def find_user(usuario):
    for u in USERS.get("usuarios", []):
        if u.get("usuario", "").lower() == str(usuario).lower():
            return u
    return None


def role_label(rol):
    return USERS.get("roles", {}).get(rol, {}).get("etiqueta", rol)


def parse_agent(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    frontmatter, body = "", raw
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if m:
        frontmatter, body = m.group(1), m.group(2)

    def fm(key):
        mm = re.search(r"^%s:\s*(.+)$" % key, frontmatter, re.M)
        return mm.group(1).strip() if mm else ""

    name = fm("name") or os.path.splitext(os.path.basename(path))[0]
    alias = fm("model").lower()
    title = name
    h1 = re.search(r"^#\s+(.+)$", body, re.M)
    if h1:
        title = h1.group(1).strip()
    return {"name": name, "title": title, "model_alias": alias, "system": body.strip()}


def discover_directors():
    result = []
    if not os.path.isdir(AGENTS_DIR):
        return result
    files = sorted(f for f in os.listdir(AGENTS_DIR) if re.search(r"-ia-.*\.md$", f))
    for fn in files:
        try:
            result.append(parse_agent(os.path.join(AGENTS_DIR, fn)))
        except Exception as e:
            print("  ! No se pudo leer", fn, "-", e)
    result.sort(key=lambda d: (0 if d["name"].startswith("ceo") else 1, d["name"]))
    return result


def get_director(name):
    safe = os.path.basename(str(name))
    path = os.path.join(AGENTS_DIR, safe + ".md")
    if not os.path.exists(path):
        return None
    return parse_agent(path)


def resolve_model(director):
    p = CONFIG.get("PROVIDER", "gemini")
    if CONFIG.get("MODEL"):
        return CONFIG["MODEL"]
    if p == "anthropic":
        alias = (director or {}).get("model_alias", "")
        if alias in ANTHROPIC_ALIAS:
            return ANTHROPIC_ALIAS[alias]
    return DEFAULT_MODELS.get(p, DEFAULT_MODELS["gemini"])


def _http_json(url, payload, headers):
    data = json.dumps(payload).encode("utf-8")
    hdrs = {"User-Agent": "Mozilla/5.0 (compatible; SIGEI/1.0)"}
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_ai(system_prompt, messages, model):
    p = CONFIG.get("PROVIDER", "gemini")
    key = provider_key()
    if not key or key.startswith("pega-"):
        return None, ("No hay clave de API configurada para el proveedor '%s'. "
                      "Revisa config.txt (linea API_KEY) o la variable de entorno." % p)
    try:
        if p == "gemini":
            return _call_gemini(system_prompt, messages, model, key)
        if p == "groq":
            return _call_openai_compat(system_prompt, messages, model, key,
                                       "https://api.groq.com/openai/v1/chat/completions")
        return _call_anthropic(system_prompt, messages, model, key)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")
        return None, "Error de la API %s (%s): %s" % (p, e.code, detail[:400])
    except Exception as e:
        return None, "No se pudo conectar con la API (%s): %s" % (p, e)


def _call_gemini(system_prompt, messages, model, key):
    contents = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
    payload = {"system_instruction": {"parts": [{"text": system_prompt}]},
               "contents": contents, "generationConfig": {"maxOutputTokens": 2000}}
    url = ("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model)
    body = _http_json(url, payload, {"content-type": "application/json", "x-goog-api-key": key})
    cands = body.get("candidates", [])
    if not cands:
        return None, "Gemini no devolvio respuesta (posible filtro o limite)."
    parts = cands[0].get("content", {}).get("parts", [])
    return "".join(pt.get("text", "") for pt in parts).strip(), None


def _call_openai_compat(system_prompt, messages, model, key, url):
    msgs = [{"role": "system", "content": system_prompt}]
    for m in messages:
        msgs.append({"role": m.get("role", "user"), "content": m.get("content", "")})
    payload = {"model": model, "messages": msgs, "max_tokens": 2000}
    body = _http_json(url, payload, {"content-type": "application/json",
                                     "authorization": "Bearer " + key})
    return body["choices"][0]["message"]["content"].strip(), None


def _call_anthropic(system_prompt, messages, model, key):
    payload = {"model": model, "max_tokens": 2000, "system": system_prompt, "messages": messages}
    body = _http_json("https://api.anthropic.com/v1/messages", payload,
                      {"content-type": "application/json", "x-api-key": key,
                       "anthropic-version": "2023-06-01"})
    parts = [b.get("text", "") for b in body.get("content", []) if b.get("type") == "text"]
    return "\n".join(parts).strip(), None


def new_session(user):
    tok = "tok-" + secrets.token_urlsafe(24)
    SESSIONS[tok] = {"ts": time.time(), "usuario": user.get("usuario"),
                     "nombre": user.get("nombre", user.get("usuario")),
                     "rol": user.get("rol"),
                     "etiqueta": user.get("cargo") or role_label(user.get("rol")),
                     "tipo": user.get("tipo", "editor"),
                     "menus": user.get("menus", "*")}
    cutoff = time.time() - SESSION_TTL
    for t in list(SESSIONS):
        if SESSIONS[t]["ts"] < cutoff:
            del SESSIONS[t]
    return tok


def get_session(tok):
    s = SESSIONS.get(tok)
    if not s:
        return None
    if s["ts"] < time.time() - SESSION_TTL:
        del SESSIONS[tok]
        return None
    return s


def save_users():
    try:
        with open(USERS_PATH, "w", encoding="utf-8") as f:
            json.dump(USERS, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print("  ! no se pudo guardar usuarios.json:", e)
        return False


def can_admin(s):
    return bool(s) and s.get("rol") in ("presidente", "vicepresidente")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False)
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _session(self):
        return get_session(self.headers.get("X-Session", ""))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/healthz":
            self._send(200, {"ok": True, "provider": CONFIG.get("PROVIDER"),
                             "db": db.disponible(), "registro": db.disponible()})
            return
        if path == "/api/admin/actividad":
            s = self._session()
            if not can_admin(s):
                self._send(403, {"error": "Solo un administrador puede ver la actividad"})
                return
            if not db.disponible():
                self._send(200, {"ok": False, "error": "Base de datos no conectada: " + db.motivo()})
                return
            def fecha(v):
                return v.isoformat(sep=" ", timespec="minutes") if v else None
            personas = [{
                "nombre": r["nombre"], "email": r["email"], "whatsapp": r.get("whatsapp"),
                "rol": r["rol"], "registro": fecha(r["creado_en"]),
                "ultimo_login": fecha(r["ultimo_login"]), "ultima_accion": fecha(r["ultima_accion"]),
                "eventos": r["eventos"], "dias_activos": r["dias_activos"],
                "fase1": r["hizo_fase1"], "fase2": r["hizo_fase2"], "firmo": r["firmo_plan"],
            } for r in db.resumen_usuarios()]
            recientes = [{"cuando": fecha(r["creado_en"]), "quien": r["nombre"],
                          "email": r["email"], "evento": r["evento"]}
                         for r in db.eventos_recientes(120)]
            self._send(200, {"ok": True, "metricas": db.metricas(),
                             "personas": personas, "recientes": recientes,
                             "whatsapp": [{"nombre": w["nombre"], "numero": w["whatsapp"]}
                                          for w in db.lista_whatsapp()]})
            return

        if path == "/api/users":
            s = self._session()
            if not can_admin(s):
                self._send(403, {"error": "Solo el creador puede ver usuarios"})
                return
            lst = [{"usuario": u.get("usuario"), "nombre": u.get("nombre"),
                    "cargo": u.get("cargo", ""), "tipo": u.get("tipo", "editor"),
                    "rol": u.get("rol"), "menus": u.get("menus", "*")}
                   for u in USERS.get("usuarios", [])]
            self._send(200, {"usuarios": lst})
            return
        if path == "/":
            path = "/index.html"
        safe = os.path.normpath(path).lstrip("/\\")
        full = os.path.join(WEB_DIR, safe)
        if os.path.isfile(full):
            ext = os.path.splitext(full)[1].lower()
            ctype = {".html": "text/html", ".js": "text/javascript",
                     ".css": "text/css"}.get(ext, "application/octet-stream")
            with open(full, "rb") as f:
                self._send(200, f.read(), ctype)
        else:
            self._send(404, {"error": "No encontrado"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            data = {}

        if self.path == "/api/login":
            usuario = data.get("usuario", "")
            pwd = str(data.get("password", ""))
            if limite_excedido(usuario, "login"):
                self._send(429, {"ok": False, "error":
                    "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo."})
                return
            # Primero las cuentas de la base de datos; si no, usuarios.json
            # (ahi viven las cuentas internas de siempre).
            u = None
            fila = db.buscar_por_email(usuario)
            if fila:
                u = {"usuario": fila["email"], "nombre": fila["nombre"],
                     "rol": fila["rol"], "salt": fila["salt"], "hash": fila["hash"]}
            if not u:
                u = find_user(usuario)
            if u and verify_password(pwd, u.get("salt", ""), u.get("hash", "")):
                limpiar_intentos(usuario, "login")
                if fila:
                    db.marcar_login(usuario)
                    db.registrar_evento(usuario, "login")
                tok = new_session(u)
                s = SESSIONS[tok]
                self._send(200, {"ok": True, "token": tok, "nombre": s["nombre"],
                                 "rol": s["rol"], "etiqueta": s["etiqueta"],
                                 "tipo": s["tipo"], "menus": s["menus"]})
            else:
                anotar_intento(usuario, "login")
                self._send(401, {"ok": False, "error": "Usuario o contrasena incorrectos"})
            return

        if self.path == "/api/registro":
            if not db.disponible():
                self._send(200, {"ok": False, "error":
                    "El registro no esta habilitado todavia. Escribenos para crearte una cuenta."})
                return
            email  = str(data.get("email", "")).strip()
            nombre = str(data.get("nombre", "")).strip()
            wa     = str(data.get("whatsapp", "")).strip()
            pwd    = str(data.get("password", ""))
            acepta = data.get("acepta")
            if limite_excedido(email or "anon", "registro"):
                self._send(429, {"ok": False, "error":
                    "Demasiados registros seguidos. Intenta de nuevo en una hora."})
                return
            if not nombre:
                self._send(200, {"ok": False, "error": "Escribe tu nombre."}); return
            if not db.email_valido(email):
                self._send(200, {"ok": False, "error": "Ese correo no parece valido."}); return
            if not db.whatsapp_valido(wa):
                self._send(200, {"ok": False, "error":
                    "El WhatsApp debe incluir el indicativo del pais. Ejemplo: +57 300 123 4567"}); return
            if len(pwd) < 8:
                self._send(200, {"ok": False, "error": "La contrasena necesita al menos 8 caracteres."}); return
            if not acepta:
                self._send(200, {"ok": False, "error":
                    "Necesitas aceptar el tratamiento de tus datos para crear la cuenta."}); return
            salt, h = hash_password(pwd)
            ok, err = db.crear_usuario(email, nombre, wa, salt, h)
            anotar_intento(email, "registro")
            if not ok:
                self._send(200, {"ok": False, "error": err}); return
            db.registrar_evento(email, "registro")
            db.marcar_login(email)
            db.registrar_evento(email, "login")
            tok = new_session({"usuario": email, "nombre": nombre, "rol": "usuario"})
            ses = SESSIONS[tok]
            self._send(200, {"ok": True, "token": tok, "nombre": ses["nombre"],
                             "rol": ses["rol"], "etiqueta": ses["etiqueta"],
                             "tipo": ses["tipo"], "menus": ses["menus"]})
            return

        if self.path == "/api/evento":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"}); return
            db.registrar_evento(s.get("usuario", ""), str(data.get("evento", "")))
            self._send(200, {"ok": True})
            return

        if self.path == "/api/chat":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            director_name = data.get("director", "")
            messages = data.get("messages", [])
            d = get_director(director_name)
            if not d:
                self._send(404, {"error": "Director no encontrado"})
                return
            text, err = call_ai(d["system"], messages, resolve_model(d))
            if err:
                self._send(200, {"ok": False, "error": err})
            else:
                self._send(200, {"ok": True, "reply": text})
            return

        if self.path == "/api/users":
            s = self._session()
            if not can_admin(s):
                self._send(403, {"ok": False, "error": "Solo el creador puede crear usuarios"})
                return
            usuario = str(data.get("usuario", "")).strip()
            clave = str(data.get("clave", ""))
            tipo = str(data.get("tipo", "editor")).lower()
            if not usuario or not clave:
                self._send(200, {"ok": False, "error": "Usuario y clave son obligatorios"})
                return
            if tipo not in ("editor", "lector"):
                tipo = "editor"
            if find_user(usuario):
                self._send(200, {"ok": False, "error": "Ese usuario ya existe"})
                return
            menus = data.get("menus", "*")
            salt, h = hash_password(clave)
            USERS.setdefault("usuarios", []).append({
                "usuario": usuario, "nombre": data.get("nombre", usuario),
                "cargo": data.get("cargo", ""), "tipo": tipo, "rol": tipo,
                "menus": menus, "salt": salt, "hash": h})
            save_users()
            self._send(200, {"ok": True})
            return

        self._send(404, {"error": "Ruta desconocida"})


def main():
    port = int(CONFIG.get("PORT", "8000") or "8000")
    dirs = discover_directors()
    p = CONFIG.get("PROVIDER", "gemini")
    print("=" * 60)
    print(" SIP - Maestria de Vida | VIVE - CRECE - CONTRIBUYE")
    print("=" * 60)
    print(" Proveedor IA: %s | Modelo: %s" % (p, CONFIG.get("MODEL") or DEFAULT_MODELS.get(p)))
    print(" Agentes: %d | Usuarios locales: %d" % (len(dirs), len(USERS.get("usuarios", []))))
    listo, porque = db.inicializar()
    if listo:
        print(" Base de datos: conectada | Cuentas registradas: %d" % db.contar_usuarios())
    else:
        print(" Base de datos: NO conectada (%s)" % porque)
        print("   -> el registro queda deshabilitado; el login sigue con usuarios.json")
    if not provider_key() or provider_key().startswith("pega-"):
        print("  AVISO: falta la clave de API; los directores no responderan.")
    print(" Escuchando en 0.0.0.0:%d" % port)
    print("=" * 60)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
