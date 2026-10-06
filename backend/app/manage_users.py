import sys
import argparse
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.models import User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id).all()
        print("\n=== LISTADO DE USUARIOS ===")
        print(f"{'ID':<5} | {'EMAIL':<30} | {'NOMBRE':<25} | {'ROL':<10} | {'ACTIVO':<8}")
        print("-" * 85)
        for u in users:
            print(f"{u.id:<5} | {u.email:<30} | {(u.full_name or ''):<25} | {(u.role or 'admin'):<10} | {str(u.is_active):<8}")
        print("-" * 85 + "\n")
    finally:
        db.close()

def change_password(email: str, new_pass: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[!] Error: No se encontró ningún usuario con el correo: {email}")
            return False
        user.hashed_password = get_password_hash(new_pass)
        db.commit()
        print(f"[+] Contraseña actualizada exitosamente para el usuario: {email}")
        return True
    finally:
        db.close()

def add_user(email: str, password: str, full_name: str = "Usuario", role: str = "admin"):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"[!] Error: Ya existe un usuario con el correo: {email}")
            return False
        
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[+] Usuario '{email}' ({full_name}) creado exitosamente con rol '{role}' [ID: {user.id}].")
        return True
    except Exception as e:
        db.rollback()
        print(f"[!] Error al crear usuario: {e}")
        return False
    finally:
        db.close()

def delete_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[!] Error: No existe el usuario con correo: {email}")
            return False
        db.delete(user)
        db.commit()
        print(f"[+] Usuario '{email}' eliminado correctamente.")
        return True
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Gestor de Usuarios del Sistema de Escuelas")
    subparsers = parser.add_subparsers(dest="subcommand", help="Comandos disponibles")

    # Listar
    subparsers.add_parser("list", help="Listar todos los usuarios registrados")

    # Cambiar contraseña
    parser_pwd = subparsers.add_parser("passwd", help="Cambiar contraseña de un usuario")
    parser_pwd.add_argument("email", type=str, help="Email del usuario")
    parser_pwd.add_argument("password", type=str, help="Nueva contraseña")

    # Agregar usuario
    parser_add = subparsers.add_parser("add", help="Agregar un nuevo usuario")
    parser_add.add_argument("email", type=str, help="Email del nuevo usuario")
    parser_add.add_argument("password", type=str, help="Contraseña del nuevo usuario")
    parser_add.add_argument("--name", type=str, default="Usuario del Sistema", help="Nombre completo")
    parser_add.add_argument("--role", type=str, default="admin", choices=["admin", "analista", "operador"], help="Rol (admin, analista, operador)")

    # Eliminar usuario
    parser_del = subparsers.add_parser("delete", help="Eliminar un usuario")
    parser_del.add_argument("email", type=str, help="Email del usuario a eliminar")

    args = parser.parse_args()

    if args.subcommand == "list":
        list_users()
    elif args.subcommand == "passwd":
        change_password(args.email, args.password)
    elif args.subcommand == "add":
        add_user(args.email, args.password, full_name=args.name, role=args.role)
    elif args.subcommand == "delete":
        delete_user(args.email)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
