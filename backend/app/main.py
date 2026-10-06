from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models.models
from app.api.routes_auth import router as auth_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_escuelas import router as escuelas_router
from app.api.routes_empresas import router as empresas_router
from app.api.routes_electoral import router as electoral_router
from app.api.routes_comprobantes import router as comprobantes_router
from app.api.routes_ordenes import router as ordenes_router
from app.api.routes_validacion import router as validacion_router

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API de Análisis, Monitoreo y Gestión de Mantenimiento Escolar - Provincia de Corrientes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir Rutas
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(escuelas_router, prefix=settings.API_V1_STR)
app.include_router(empresas_router, prefix=settings.API_V1_STR)
app.include_router(electoral_router, prefix=settings.API_V1_STR)
app.include_router(comprobantes_router, prefix=settings.API_V1_STR)
app.include_router(ordenes_router, prefix=settings.API_V1_STR)
app.include_router(validacion_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "proyecto": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_version": "v1"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
