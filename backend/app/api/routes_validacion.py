from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from app.core.database import get_db
from app.models.models import RenglonTrabajo, OrdenProvision, Escuela
from app.schemas.schemas import (
    ValidacionResumenResponse,
    EstablecimientoSinCueItem,
    RenglonTrabajoItem,
    PropagarCueRequest,
    PropagarCueResponse
)

router = APIRouter(prefix="/validacion", tags=["Validación y Calidad de Datos"])

@router.get("/resumen", response_model=ValidacionResumenResponse)
def get_resumen_validacion(db: Session = Depends(get_db)):
    """
    Retorna métricas globales de calidad de datos y los establecimientos prioritarios
    sin CUE para propagación masiva e inteligente.
    """
    total = db.query(func.count(RenglonTrabajo.id)).scalar() or 0
    sin_cue_count = db.query(func.count(RenglonTrabajo.id)).filter(
        (RenglonTrabajo.cue_anexo.is_(None)) | (RenglonTrabajo.cue_anexo == "")
    ).scalar() or 0
    con_cue_count = total - sin_cue_count

    monto_sin_cue = db.query(func.coalesce(func.sum(RenglonTrabajo.importe_renglon), 0.0)).filter(
        (RenglonTrabajo.cue_anexo.is_(None)) | (RenglonTrabajo.cue_anexo == "")
    ).scalar() or 0.0

    pct = round((con_cue_count / total * 100), 2) if total > 0 else 100.0

    # Agrupar establecimientos sin CUE por nombre, frecuencia e importe acumulado
    top_estab_raw = (
        db.query(
            RenglonTrabajo.establecimiento_o_dependencia,
            RenglonTrabajo.departamento,
            RenglonTrabajo.localidad,
            func.count(RenglonTrabajo.id).label("cant"),
            func.sum(RenglonTrabajo.importe_renglon).label("monto"),
            func.max(RenglonTrabajo.id_trabajo).label("ejemplo_id")
        )
        .filter((RenglonTrabajo.cue_anexo.is_(None)) | (RenglonTrabajo.cue_anexo == ""))
        .group_by(
            RenglonTrabajo.establecimiento_o_dependencia,
            RenglonTrabajo.departamento,
            RenglonTrabajo.localidad
        )
        .order_by(func.sum(RenglonTrabajo.importe_renglon).desc())
        .limit(30)
        .all()
    )

    top_estab = []
    for r in top_estab_raw:
        nom = r.establecimiento_o_dependencia.strip()
        # Intentar sugerencia automática en el padrón de escuelas
        sug_cue = None
        sug_nom = None
        # Búsqueda por coincidencia
        palabras = [p for p in nom.replace("N°", "").replace("№", "").replace("°", "").split() if len(p) >= 3 and not p.isdigit()]
        if palabras:
            termino = f"%{palabras[0]}%"
            match = db.query(Escuela).filter(Escuela.nombre.ilike(termino)).first()
            if match:
                sug_cue = match.cue
                sug_nom = f"{match.nombre} ({match.localidad or match.departamento})"

        top_estab.append(EstablecimientoSinCueItem(
            establecimiento_o_dependencia=nom,
            departamento=r.departamento,
            localidad=r.localidad,
            cantidad_renglones=int(r.cant or 0),
            total_monto=round(float(r.monto or 0.0), 2),
            ejemplo_id_trabajo=r.ejemplo_id,
            sugerencia_cue=sug_cue,
            sugerencia_nombre=sug_nom
        ))

    return ValidacionResumenResponse(
        total_renglones=total,
        renglones_con_cue=con_cue_count,
        renglones_sin_cue=sin_cue_count,
        porcentaje_completitud=pct,
        monto_sin_cue=round(float(monto_sin_cue), 2),
        top_establecimientos_sin_cue=top_estab
    )

@router.get("/renglones-sin-cue", response_model=List[RenglonTrabajoItem])
def get_renglones_sin_cue(
    establecimiento: Optional[str] = Query(None, description="Filtrar por nombre de establecimiento"),
    departamento: Optional[str] = Query(None, description="Filtrar por departamento"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista detallada renglón por renglón de los registros que carecen de CUE.
    """
    q = db.query(RenglonTrabajo).filter(
        (RenglonTrabajo.cue_anexo.is_(None)) | (RenglonTrabajo.cue_anexo == "")
    )
    if establecimiento:
        q = q.filter(RenglonTrabajo.establecimiento_o_dependencia.ilike(f"%{establecimiento}%"))
    if departamento:
        q = q.filter(RenglonTrabajo.departamento.ilike(f"%{departamento}%"))

    return q.order_by(RenglonTrabajo.importe_renglon.desc()).offset(offset).limit(limit).all()

@router.post("/propagar-cue", response_model=PropagarCueResponse)
def propagar_cue(payload: PropagarCueRequest, db: Session = Depends(get_db)):
    """
    Propagación Masiva Inteligente:
    Asigna el CUE especificado a TODOS los renglones que coincidan con el nombre
    del establecimiento, y actualiza las órdenes de provisión consolidadas asociadas.
    """
    nom = payload.nombre_establecimiento.strip()
    cue_dest = payload.nuevo_cue.strip()

    if not nom or not cue_dest:
        raise HTTPException(status_code=400, detail="Debe indicar el nombre del establecimiento y el CUE a propagar.")

    # Verificar que el CUE exista en escuelas (o darlo de alta si es nuevo)
    escuela = db.query(Escuela).filter(Escuela.cue == cue_dest).first()
    if not escuela:
        # Dar de alta la escuela con el nombre y CUE provisto
        escuela = Escuela(
            cue=cue_dest,
            nombre=nom,
            departamento="Corrientes",
            localidad="Corrientes",
            lat=-27.4692,
            lng=-58.8306,
            es_centro_votacion=False
        )
        db.add(escuela)
        db.flush()

    # 1. Actualizar renglones_trabajos
    renglones_coincidentes = (
        db.query(RenglonTrabajo)
        .filter(RenglonTrabajo.establecimiento_o_dependencia.ilike(nom))
        .all()
    )

    ids_documentos = set()
    for r in renglones_coincidentes:
        r.cue_anexo = cue_dest
        if r.id_documento:
            ids_documentos.add(r.id_documento)
        if r.numero_orden:
            ids_documentos.add(r.numero_orden)

    cant_renglones = len(renglones_coincidentes)

    # 2. Actualizar OrdenesProvision asociadas
    cant_ordenes = 0
    if ids_documentos:
        ordenes = db.query(OrdenProvision).filter(
            (OrdenProvision.nro_orden.in_(ids_documentos)) |
            (OrdenProvision.descripcion.ilike(f"%{nom}%"))
        ).all()
        for op in ordenes:
            if not op.cue or op.cue != cue_dest:
                op.cue = cue_dest
                cant_ordenes += 1

    db.commit()

    return PropagarCueResponse(
        mensaje=f"Se propagó exitosamente el CUE {cue_dest} a todos los registros coincidentes con '{nom}'.",
        renglones_actualizados=cant_renglones,
        ordenes_actualizadas=cant_ordenes,
        cue=cue_dest,
        nombre_establecimiento=nom
    )
