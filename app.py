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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
AGENTS_DIR = os.path.join(BASE_DIR, "agents")
CONFIG_PATH = os.path.join(BASE_DIR, "config.txt")
USERS_PATH = os.path.join(BASE_DIR, "usuarios.json")

DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "anthropic": "claude-sonnet-4-6",
    "groq": "llama-3.3-70b-versatile",
}
ANTHROPIC_ALIAS = {
    "opus": "claude-opus-4-8",
    "sonnet": "claude-sonnet-4-6",
    "haiku": "claude-haiku-4-5-20251001",
}
PBKDF2_ITERS = 200000
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
    return {"roles": {"presidente": {"etiqueta": "Presidente", "directores": "*"}},
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


def role_allowed(rol):
    r = USERS.get("roles", {}).get(rol, {})
    dirs = r.get("directores", "*")
    if dirs == "*":
        return "*"
    return set(dirs or [])


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


def directors_for(allowed):
    dirs = discover_directors()
    if allowed == "*":
        return dirs
    return [d for d in dirs if d["name"] in allowed]


def get_director(name):
    safe = os.path.basename(str(name))
    path = os.path.join(AGENTS_DIR, safe + ".md")
    if not os.path.exists(path):
        return None
    return parse_agent(path)


AREA_LABELS = {
    "ceo": "Dirección Ejecutiva", "cfo": "Dirección Financiera",
    "cmo": "Dirección de Marketing", "cco": "Dirección Comercial",
    "coo": "Dirección de Operaciones", "chro": "Dirección de Talento Humano",
    "clo": "Dirección Jurídica y Cumplimiento", "cdo": "Dirección de Desarrollo Organizacional",
    "cino": "Dirección de Innovación", "cio": "Dirección de Inteligencia Organizacional",
}


def all_agents():
    """Todos los .md de agents/: directores (-ia-) y coordinadores."""
    res = []
    if not os.path.isdir(AGENTS_DIR):
        return res
    for fn in sorted(os.listdir(AGENTS_DIR)):
        if not fn.endswith(".md"):
            continue
        try:
            a = parse_agent(os.path.join(AGENTS_DIR, fn))
            a["grupo"] = a["name"].split("-")[0]
            a["es_director"] = "-ia-" in a["name"]
            res.append(a)
        except Exception:
            pass
    return res


def allowed_prefixes(allowed):
    if allowed == "*":
        return "*"
    return {a.split("-")[0] for a in allowed}


def grouped_agents(allowed):
    pref = allowed_prefixes(allowed)
    agents = all_agents()
    grupos = {}
    for a in agents:
        g = a["grupo"]
        if pref != "*" and g not in pref:
            continue
        grupos.setdefault(g, {"grupo": g, "etiqueta": AREA_LABELS.get(g, g.upper()),
                              "director": None, "coordinadores": []})
        item = {"name": a["name"], "title": a["title"]}
        if a["es_director"]:
            grupos[g]["director"] = item
        else:
            grupos[g]["coordinadores"].append(item)
    order = ["ceo", "cfo", "cmo", "cco", "coo", "chro", "clo", "cdo", "cino", "cio"]
    return [grupos[g] for g in order if g in grupos] + \
           [v for k, v in grupos.items() if k not in order]


def agent_allowed(allowed, name):
    if allowed == "*":
        return True
    return name.split("-")[0] in allowed_prefixes(allowed)


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
                     "menus": user.get("menus", "*"),
                     "allowed": role_allowed(user.get("rol"))}
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
            self._send(200, {"ok": True, "provider": CONFIG.get("PROVIDER")})
            return
        if path == "/api/directors":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            dirs = [{"name": d["name"], "title": d["title"]} for d in directors_for(s["allowed"])]
            self._send(200, {"directors": dirs})
            return
        if path == "/api/agents":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            self._send(200, {"grupos": grouped_agents(s["allowed"])})
            return
        if path == "/api/dominios":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            dominios = [
                {"id": "gobernanza", "nombre": "Gobierno Corporativo", "icono": "🏛️", "agentes": 0},
                {"id": "estrategia", "nombre": "Estrategia Empresarial", "icono": "🎯", "agentes": 0},
                {"id": "finanzas", "nombre": "Finanzas y Control", "icono": "💰", "agentes": 6},
                {"id": "marketing", "nombre": "Marketing y Posicionamiento", "icono": "📣", "agentes": 1},
                {"id": "comercial", "nombre": "Clientes e Ingresos", "icono": "📈", "agentes": 6},
                {"id": "operaciones", "nombre": "Operaciones", "icono": "⚙️", "agentes": 1},
                {"id": "talento", "nombre": "Talento y Cultura", "icono": "👥", "agentes": 3},
                {"id": "legal", "nombre": "Legal y Compliance", "icono": "⚖️", "agentes": 1},
                {"id": "calidad", "nombre": "Calidad y Gestión", "icono": "🏅", "agentes": 3},
                {"id": "innovacion", "nombre": "Innovación Digital", "icono": "⚡", "agentes": 1},
                {"id": "inteligencia", "nombre": "Inteligencia Organizacional", "icono": "🧠", "agentes": 1},
            ]
            self._send(200, {"dominios": dominios})
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
            u = find_user(usuario)
            if u and verify_password(pwd, u.get("salt", ""), u.get("hash", "")):
                tok = new_session(u)
                s = SESSIONS[tok]
                self._send(200, {"ok": True, "token": tok, "nombre": s["nombre"],
                                 "rol": s["rol"], "etiqueta": s["etiqueta"],
                                 "tipo": s["tipo"], "menus": s["menus"]})
            else:
                self._send(401, {"ok": False, "error": "Usuario o contrasena incorrectos"})
            return

        if self.path == "/api/directors":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            dirs = [{"name": d["name"], "title": d["title"]} for d in directors_for(s["allowed"])]
            self._send(200, {"directors": dirs})
            return

        if self.path == "/api/chat":
            s = self._session()
            if not s:
                self._send(401, {"error": "No autorizado"})
                return
            director_name = data.get("director", "")
            if not agent_allowed(s["allowed"], director_name):
                self._send(403, {"ok": False, "error": "No tienes acceso a este agente."})
                return
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
    print(" Agentes: %d | Usuarios: %d | Roles: %s" % (
        len(dirs), len(USERS.get("usuarios", [])), ", ".join(USERS.get("roles", {}).keys())))
    if not provider_key() or provider_key().startswith("pega-"):
        print("  AVISO: falta la clave de API; los directores no responderan.")
    print(" Escuchando en 0.0.0.0:%d" % port)
    print("=" * 60)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
