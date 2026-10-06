from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# Token & Auth
class Token(BaseModel):
    access_token: str
    token_type: str
    user_email: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Usuario del Sistema"
    role: Optional[str] = "admin"

# Dashboard Stats
class StatCard(BaseModel):
    total_invertido: float
    cantidad_ordenes: int
    escuelas_intervenidas: int
    empresas_adjudicadas: int
    ejercicio_activo: Optional[str] = "Todos"

class GastoMensual(BaseModel):
    mes: str
    monto: float
    cantidad_ordenes: int

class TopEmpresaGasto(BaseModel):
    cuit: str
    razon_social: str
    total_monto: float
    cantidad_ordenes: int
    porcentaje_del_total: float

class GastoDepartamento(BaseModel):
    departamento: str
    total_monto: float
    cantidad_escuelas: int

class DashboardSummaryResponse(BaseModel):
    stats: StatCard
    gastos_mensuales: List[GastoMensual]
    top_empresas: List[TopEmpresaGasto]
    gastos_departamento: List[GastoDepartamento]

# Escuelas
class EscuelaCreate(BaseModel):
    cue: str
    nombre: str
    departamento: Optional[str] = "Capital"
    localidad: Optional[str] = "Corrientes"
    domicilio: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    circuito_id: Optional[str] = None
    es_centro_votacion: bool = True

class EscuelaUpdate(BaseModel):
    nombre: Optional[str] = None
    departamento: Optional[str] = None
    localidad: Optional[str] = None
    domicilio: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    circuito_id: Optional[str] = None
    es_centro_votacion: Optional[bool] = None

class EscuelaList(BaseModel):
    cue: str
    nombre: str
    departamento: Optional[str] = None
    localidad: Optional[str] = None
    domicilio: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    total_invertido: float = 0.0
    cantidad_obras: int = 0
    es_centro_votacion: bool = False
    circuito_id: Optional[str] = None

    class Config:
        from_attributes = True


class OrdenSummary(BaseModel):
    id: Optional[int] = None
    nro_orden: str
    ejercicio: int
    fecha: Optional[date] = None
    monto_total: float
    rubro: str
    empresa_razon_social: Optional[str] = None
    empresa_cuit: Optional[str] = None
    estado: Optional[str] = "Ejecutado"
    tipo_destino: Optional[str] = "Establecimiento escolar"
    expediente: Optional[str] = None
    descripcion: Optional[str] = None

class RenglonTrabajoItem(BaseModel):
    id: int
    id_trabajo: Optional[str] = None
    id_documento: Optional[str] = None
    numero_orden: Optional[str] = None
    fecha_documento: Optional[date] = None
    cue_anexo: Optional[str] = None
    cuit_empresa: Optional[str] = None
    establecimiento_o_dependencia: str
    empresa: Optional[str] = None
    trabajo_detalle: Optional[str] = None
    rubro: Optional[str] = None
    importe_renglon: float = 0.0
    tipo_destino: Optional[str] = None
    departamento: Optional[str] = None
    localidad: Optional[str] = None
    acta_asociada: Optional[str] = None

    class Config:
        from_attributes = True

class ResultadoElectoralItem(BaseModel):
    tipo_eleccion: str
    partido_agrupacion: str
    formula_candidato: str
    color_partido: Optional[str] = "#7c3aed"
    votos: int
    porcentaje: float

class EscuelaDetail(BaseModel):
    cue: str
    nombre: str
    departamento: Optional[str] = None
    localidad: Optional[str] = None
    domicilio: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    es_centro_votacion: bool = False
    circuito_id: Optional[str] = None
    total_invertido: float = 0.0
    ordenes: List[OrdenSummary] = []
    renglones: List[RenglonTrabajoItem] = []
    resultados_electorales: List[ResultadoElectoralItem] = []

class TrabajoDetalleCreate(BaseModel):
    rubro: Optional[str] = "Mantenimiento General"
    descripcion_tarea: str
    monto: float

class OrdenProvisionCreate(BaseModel):
    nro_orden: str
    ejercicio: Optional[int] = 2026
    fecha: Optional[date] = None
    cue: Optional[str] = None
    cuit_empresa: Optional[str] = None
    monto_total: float
    rubro: Optional[str] = "Mantenimiento General"
    estado: Optional[str] = "Ejecutado"
    tipo_destino: Optional[str] = "Establecimiento escolar"
    expediente: Optional[str] = None
    descripcion: Optional[str] = None
    trabajos: Optional[List[TrabajoDetalleCreate]] = []

class OrdenProvisionResponse(BaseModel):
    id: int
    nro_orden: str
    ejercicio: int
    fecha: Optional[date] = None
    cue: Optional[str] = None
    cuit_empresa: Optional[str] = None
    monto_total: float
    rubro: str
    estado: str
    tipo_destino: Optional[str] = None
    expediente: Optional[str] = None
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True

# Validación y Calidad de Datos
class EstablecimientoSinCueItem(BaseModel):
    establecimiento_o_dependencia: str
    departamento: Optional[str] = None
    localidad: Optional[str] = None
    cantidad_renglones: int
    total_monto: float
    ejemplo_id_trabajo: Optional[str] = None
    sugerencia_cue: Optional[str] = None
    sugerencia_nombre: Optional[str] = None

class ValidacionResumenResponse(BaseModel):
    total_renglones: int
    renglones_con_cue: int
    renglones_sin_cue: int
    porcentaje_completitud: float
    monto_sin_cue: float
    top_establecimientos_sin_cue: List[EstablecimientoSinCueItem]

class PropagarCueRequest(BaseModel):
    nombre_establecimiento: str
    nuevo_cue: str

class PropagarCueResponse(BaseModel):
    mensaje: str
    renglones_actualizados: int
    ordenes_actualizadas: int
    cue: str
    nombre_establecimiento: str

# Empresas
class EmpresaList(BaseModel):
    cuit: str
    razon_social: str
    condicion_fiscal: Optional[str] = None
    total_facturado: float = 0.0
    cantidad_ordenes: int = 0
    localidad: Optional[str] = None

class EmpresaDetail(BaseModel):
    cuit: str
    razon_social: str
    condicion_fiscal: Optional[str] = None
    direccion: Optional[str] = None
    localidad: Optional[str] = None
    telefono: Optional[str] = None
    total_facturado: float = 0.0
    ordenes: List[OrdenSummary] = []

# Análisis Electoral
class CorrelacionItem(BaseModel):
    cue: str
    escuela_nombre: str
    departamento: str
    circuito_id: Optional[str] = None
    total_mantenimiento: float
    votos_partido_oficial: float # porcentaje
    partido_ganador: str
    tipo_eleccion: str

class ElectoralDashboardResponse(BaseModel):
    tipo_eleccion: str
    partidos_totales: List[dict]
    correlacion_escuelas: List[CorrelacionItem]

# Comprobantes (Fase 2)
class ComprobanteCreate(BaseModel):
    orden_id: int
    monto_certificado: float
    observaciones: Optional[str] = None

class ComprobanteResponse(BaseModel):
    id: int
    nro_comprobante: str
    orden_id: int
    fecha_emision: date
    monto_certificado: float
    estado: str
    observaciones: Optional[str] = None

    class Config:
        from_attributes = True
