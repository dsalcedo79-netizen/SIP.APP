# -*- coding: utf-8 -*-
"""
Gestor de usuarios de SIGEI
---------------------------
Crea y administra el archivo usuarios.json (cuentas, roles y contrasenas).
Las contrasenas se guardan como HASH (nunca en texto plano).

Uso (doble clic en Windows o desde la terminal):
    python gestionar_usuarios.py

Menu:
    1) Listar usuarios
    2) Agregar / cambiar usuario
    3) Eliminar usuario
    4) Ver roles
    5) Salir

Despues de cambiar usuarios, vuelve a subir usuarios.json a GitHub para que
Render lo tome (o reinicia tu app local).
"""

import hashlib
import json
import os
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_PATH = os.path.join(BASE_DIR, "usuarios.json")
PBKDF2_ITERS = 200000

ROLES_BASE = {
    "presidente":     {"etiqueta": "Presidente"},
    "vicepresidente": {"etiqueta": "Vicepresidencia"},
    "cliente":        {"etiqueta": "Cliente externo"},
}


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                             bytes.fromhex(salt), PBKDF2_ITERS)
    return salt, dk.hex()


def load():
    if os.path.exists(USERS_PATH):
        with open(USERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"roles": dict(ROLES_BASE), "usuarios": []}


def save(data):
    with open(USERS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("\n  Guardado en usuarios.json")


def listar(data):
    us = data.get("usuarios", [])
    if not us:
        print("\n  (sin usuarios)")
        return
    print("\n  USUARIOS:")
    for u in us:
        print("   - %-14s | rol: %-14s | %s" % (
            u.get("usuario"), u.get("rol"), u.get("nombre", "")))


def agregar(data):
    print("\n  -- Agregar / cambiar usuario --")
    usuario = input("  Usuario (para iniciar sesion): ").strip()
    if not usuario:
        print("  Cancelado.")
        return
    nombre = input("  Nombre completo: ").strip()
    roles = list(data.get("roles", ROLES_BASE).keys())
    print("  Roles disponibles: " + ", ".join(roles))
    rol = input("  Rol: ").strip()
    if rol not in data.get("roles", {}):
        print("  Rol no valido. Usa uno de: " + ", ".join(roles))
        return
    pwd = input("  Contrasena: ").strip()
    if not pwd:
        print("  Contrasena vacia, cancelado.")
        return
    salt, h = hash_password(pwd)
    nuevos = [u for u in data.get("usuarios", []) if u.get("usuario", "").lower() != usuario.lower()]
    nuevos.append({"usuario": usuario, "nombre": nombre, "rol": rol, "salt": salt, "hash": h})
    data["usuarios"] = nuevos
    save(data)


def eliminar(data):
    listar(data)
    usuario = input("\n  Usuario a eliminar: ").strip()
    antes = len(data.get("usuarios", []))
    data["usuarios"] = [u for u in data.get("usuarios", []) if u.get("usuario", "").lower() != usuario.lower()]
    if len(data["usuarios"]) < antes:
        save(data)
    else:
        print("  No se encontro ese usuario.")


def roles(data):
    print("\n  ROLES:")
    for r, info in data.get("roles", {}).items():
        admin = "administra usuarios" if r in ("presidente", "vicepresidente") else "solo Coach IA"
        print("   - %-14s [%s] -> %s" % (r, info.get("etiqueta", r), admin))
    print("\n  Todos los usuarios, sea cual sea su rol, pueden conversar con el Coach IA.")
    print("  Solo 'presidente' y 'vicepresidente' pueden crear/ver usuarios (menu web).")
    print("  Para agregar un rol nuevo, edita usuarios.json en la seccion 'roles'.")


def main():
    data = load()
    if "roles" not in data or not data["roles"]:
        data["roles"] = dict(ROLES_BASE)
    while True:
        print("\n" + "=" * 50)
        print(" GESTOR DE USUARIOS SIGEI")
        print("=" * 50)
        print(" 1) Listar usuarios")
        print(" 2) Agregar / cambiar usuario")
        print(" 3) Eliminar usuario")
        print(" 4) Ver roles")
        print(" 5) Salir")
        op = input(" Opcion: ").strip()
        if op == "1":
            listar(data)
        elif op == "2":
            agregar(data); data = load()
        elif op == "3":
            eliminar(data); data = load()
        elif op == "4":
            roles(data)
        elif op == "5":
            print("  Listo.")
            break
        else:
            print("  Opcion no valida.")


if __name__ == "__main__":
    main()
