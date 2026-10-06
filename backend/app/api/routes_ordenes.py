from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.models import OrdenProvision, TrabajoDetalle, Escuela, Empresa
from app.schemas.schemas import OrdenProvisionCreate, OrdenProvisionResponse, OrdenSummary

router = APIRouter(prefix="/ordenes", tags=["Órdenes de Provisión"])

@router.get("", response_model=List[OrdenSummary])
def list_ordenes(
    query: Optional[str] = Query(None, description="Buscar por Nro Orden o descripción"),
    cue: Optional[str] = Query(None, description="Filtrar por CUE"),
    cuit: Optional[str] = Query(None, description="Filtrar por CUIT de Empresa"),
    ejercicio: Optional[int] = Query(None, description="Año ejercicio"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    q = db.query(OrdenProvision, Empresa.razon_social.label("empresa_nombre"))\
          .outerjoin(Empresa, OrdenProvision.cuit_empresa == Empresa.cuit)

    if query:
        term = f"%{query}%"
        q = q.filter((OrdenProvision.nro_orden.ilike(term)) | (OrdenProvision.descripcion.ilike(term)))
    if cue:
        q = q.filter(OrdenProvision.cue == cue)
    if cuit:
        q = q.filter(OrdenProvision.cuit_empresa == cuit)
    if ejercicio:
        q = q.filter(OrdenProvision.ejercicio == ejercicio)

    results = q.order_by(OrdenProvision.fecha.desc().nullslast(), OrdenProvision.id.desc()).limit(limit).all()

    out = []
    for ord_obj, emp_name in results:
        out.append(OrdenSummary(
            id=ord_obj.id,
            nro_orden=ord_obj.nro_orden,
            ejercicio=ord_obj.ejercicio,
            fecha=ord_obj.fecha,
            monto_total=ord_obj.monto_total,
            rubro=ord_obj.rubro or "Mantenimiento General",
            empresa_razon_social=emp_name or ord_obj.cuit_empresa,
            empresa_cuit=ord_obj.cuit_empresa,
            estado=ord_obj.estado or "Ejecutado",
            tipo_destino=ord_obj.tipo_destino or "Establecimiento escolar",
            expediente=ord_obj.expediente,
            descripcion=ord_obj.descripcion
        ))
    return out

@router.post("", response_model=OrdenProvisionResponse, status_code=status.HTTP_201_CREATED)
def create_orden(datos: OrdenProvisionCreate, db: Session = Depends(get_db)):
    """
    Carga de nueva Orden de Provisión de mantenimiento escolar con validaciones de negocio.
    """
    # Validar CUE de escuela si se proporcionó
    if datos.cue:
        escuela = db.query(Escuela).filter(Escuela.cue == datos.cue).first()
        if not escuela:
            raise HTTPException(status_code=400, detail=f"No se encontró la escuela con CUE {datos.cue}")

    # Validar Empresa si se proporcionó CUIT
    if datos.cuit_empresa:
        empresa = db.query(Empresa).filter(Empresa.cuit == datos.cuit_empresa).first()
        if not empresa:
            # Si no existe, crear proveedor básico
            empresa = Empresa(
                cuit=datos.cuit_empresa,
                razon_social=f"Proveedor CUIT {datos.cuit_empresa}",
                condicion_fiscal="Responsable Inscripto",
                localidad="Corrientes"
            )
            db.add(empresa)
            db.flush()

    nueva_op = OrdenProvision(
        nro_orden=datos.nro_orden,
        ejercicio=datos.ejercicio or 2026,
        fecha=datos.fecha,
        cue=datos.cue,
        cuit_empresa=datos.cuit_empresa,
        monto_total=round(datos.monto_total, 2),
        rubro=datos.rubro or "Mantenimiento General",
        estado=datos.estado or "Ejecutado",
        tipo_destino=datos.tipo_destino or "Establecimiento escolar",
        expediente=datos.expediente,
        descripcion=datos.descripcion
    )
    db.add(nueva_op)
    db.flush()

    # Si se detallan tareas individuales
    if datos.trabajos:
        for t in datos.trabajos:
            td = TrabajoDetalle(
                orden_id=nueva_op.id,
                rubro=t.rubro or datos.rubro,
                descripcion_tarea=t.descripcion_tarea,
                monto=round(t.monto, 2)
            )
            db.add(td)

    db.commit()
    db.refresh(nueva_op)
    return nueva_op
