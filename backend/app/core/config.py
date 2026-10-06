import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema de Gestión y Análisis de Mantenimiento Escolar - Corrientes"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_jwt_key_corrientes_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 horas
    
    # Soporta PostgreSQL o fallback a SQLite local si no está levantado Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./escuelas_local.db")
    
    # Credenciales iniciales de administrador
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@admin.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # Directorio de datos
    DATA_PATH: str = os.getenv("DATA_PATH", "./data_source")

    class Config:
        case_sensitive = True

settings = Settings()
