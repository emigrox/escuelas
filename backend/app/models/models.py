from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="Administrador Provincial")
    role = Column(String(50), default="admin") # admin, analista, operador
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    comprobantes_creados = relationship("ComprobanteMantenimiento", back_populates="creado_por")

class Escuela(Base):
    __tablename__ = "escuelas"

    cue = Column(String(50), primary_key=True, index=True)
    nombre = Column(String(255), nullable=False, index=True)
    departamento = Column(String(100), index=True)
    localidad = Column(String(100), index=True)
    domicilio = Column(String(255))
    nivel_modalidad = Column(String(100))
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    circuito_id = Column(String(50), index=True, nullable=True)
    es_centro_votacion = Column(Boolean, default=False)

    ordenes = relationship("OrdenProvision", back_populates="escuela")
    resultados_electorales = relationship("ResultadoElectoral", back_populates="escuela")

class Empresa(Base):
    __tablename__ = "empresas"

    cuit = Column(String(30), primary_key=True, index=True)
    razon_social = Column(String(255), nullable=False, index=True)
    condicion_fiscal = Column(String(100), nullable=True)
    direccion = Column(String(255), nullable=True)
    localidad = Column(String(100), nullable=True)
    telefono = Column(String(100), nullable=True)

    ordenes = relationship("OrdenProvision", back_populates="empresa")

class OrdenProvision(Base):
    __tablename__ = "ordenes_provision"

    id = Column(Integer, primary_key=True, index=True)
    nro_orden = Column(String(100), index=True, nullable=False)
    ejercicio = Column(Integer, index=True, default=2026) # 2025 o 2026
    fecha = Column(Date, nullable=True)
    cue = Column(String(50), ForeignKey("escuelas.cue"), nullable=True, index=True)
    cuit_empresa = Column(String(30), ForeignKey("empresas.cuit"), nullable=True, index=True)
    monto_total = Column(Float, default=0.0)
    rubro = Column(String(100), default="Mantenimiento General")
    estado = Column(String(50), default="Ejecutado") # Pendiente, En Ejecución, Ejecutado, Certificado
    tipo_destino = Column(String(100), default="Establecimiento escolar")
    expediente = Column(String(100), nullable=True)
    descripcion = Column(Text, nullable=True)

    escuela = relationship("Escuela", back_populates="ordenes")
    empresa = relationship("Empresa", back_populates="ordenes")
    trabajos = relationship("TrabajoDetalle", back_populates="orden")
    comprobantes = relationship("ComprobanteMantenimiento", back_populates="orden")

class TrabajoDetalle(Base):
    __tablename__ = "trabajos_detalle"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_provision.id"), nullable=False)
    rubro = Column(String(100))
    descripcion_tarea = Column(Text)
    monto = Column(Float, default=0.0)

    orden = relationship("OrdenProvision", back_populates="trabajos")

# Tabla de Renglones Individuales para Auditoría y Validación de Calidad de Datos
class RenglonTrabajo(Base):
    __tablename__ = "renglones_trabajos"

    id = Column(Integer, primary_key=True, index=True)
    id_trabajo = Column(String(50), index=True) # Ej: D0001-R017
    id_documento = Column(String(50), index=True) # Ej: D0001
    numero_orden = Column(String(50), index=True, nullable=True) # Ej: 128
    fecha_documento = Column(Date, nullable=True)
    cue_anexo = Column(String(50), index=True, nullable=True)
    cuit_empresa = Column(String(30), index=True, nullable=True)
    establecimiento_o_dependencia = Column(String(255), index=True, nullable=False)
    empresa = Column(String(255), nullable=True)
    trabajo_detalle = Column(Text, nullable=True)
    rubro = Column(String(100), nullable=True)
    importe_renglon = Column(Float, default=0.0)
    tipo_destino = Column(String(100), nullable=True)
    departamento = Column(String(100), nullable=True)
    localidad = Column(String(100), nullable=True)
    acta_asociada = Column(String(100), nullable=True)

class ResultadoElectoral(Base):
    __tablename__ = "resultados_electorales"

    id = Column(Integer, primary_key=True, index=True)
    tipo_eleccion = Column(String(50), index=True) # "generales_1ra_vuelta" o "ballotage_2da_vuelta"
    circuito_id = Column(String(50), index=True)
    mesa = Column(String(50), index=True)
    cue = Column(String(50), ForeignKey("escuelas.cue"), nullable=True, index=True)
    partido_agrupacion = Column(String(200), index=True)
    formula_candidato = Column(String(200))
    color_partido = Column(String(20), default="#7c3aed")
    votos = Column(Integer, default=0)
    porcentaje = Column(Float, default=0.0)

    escuela = relationship("Escuela", back_populates="resultados_electorales")

# Módulo de Comprobantes (Fase 2)
class ComprobanteMantenimiento(Base):
    __tablename__ = "comprobantes_mantenimiento"

    id = Column(Integer, primary_key=True, index=True)
    nro_comprobante = Column(String(100), unique=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_provision.id"), nullable=False)
    fecha_emision = Column(Date, default=datetime.utcnow)
    monto_certificado = Column(Float, default=0.0)
    estado = Column(String(50), default="Certificado") # Borrador, Certificado, Liquidado, Anulado
    observaciones = Column(Text, nullable=True)
    creado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orden = relationship("OrdenProvision", back_populates="comprobantes")
    creado_por = relationship("User", back_populates="comprobantes_creados")
