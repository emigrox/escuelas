import sys
from app.manage_users import change_password

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python app/change_password.py <email> <nueva_contraseña>")
        sys.exit(1)
    email_arg = sys.argv[1]
    pass_arg = sys.argv[2]
    change_password(email_arg, pass_arg)
