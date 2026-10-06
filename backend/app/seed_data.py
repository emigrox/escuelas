import os
from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.models import User, Escuela
from app.etl.etl_loader import load_all_data

def init_db():
    print("[*] Verificando esquema de base de datos...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Crear usuario admin inicial
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            print(f"[*] Creando usuario administrador inicial: {settings.ADMIN_EMAIL}")
            new_admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="Administrador General de Escuelas",
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print(f"[+] Usuario {settings.ADMIN_EMAIL} creado correctamente.")
        else:
            print(f"[i] El usuario {settings.ADMIN_EMAIL} ya existe.")

        # 2. Cargar datos si está vacía
        escuelas_count = db.query(Escuela).count()
        if escuelas_count == 0:
            print("[*] Base de datos sin escuelas registradas. Ejecutando ETL inicial...")
            # Buscar en data_source (dentro de Docker) o en la raíz local
            possible_dirs = [
                "/app/data_source",
                settings.DATA_PATH,
                "c:/Proyectos/Escuelas",
                "."
            ]
            chosen_dir = "."
            for d in possible_dirs:
                if os.path.exists(d):
                    chosen_dir = d
                    break
            load_all_data(db, data_dir=chosen_dir)
        else:
            print(f"[i] Base de datos ya cuenta con {escuelas_count} escuelas registradas.")

    except Exception as e:
        print(f"[!] Error durante el seed inicial: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
