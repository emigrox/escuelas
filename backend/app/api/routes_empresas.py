from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Empresa, OrdenProvision, Escuela, RenglonTrabajo
from app.schemas.schemas import EmpresaList, EmpresaDetail, OrdenSummary

router = APIRouter(prefix="/empresas", tags=["Empresas Contratistas"])

@router.get("", response_model=List[EmpresaList])
def list_empresas(
    query: Optional[str] = Query(None, description="Buscar por Razón Social o CUIT"),
    db: Session = Depends(get_db)
):
    q = db.query(
        Empresa,
        func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).label("total_facturado"),
        func.count(OrdenProvision.id).label("cantidad_ordenes")
    ).outerjoin(OrdenProvision, Empresa.cuit == OrdenProvision.cuit_empresa)

    if query:
        term = f"%{query}%"
        q = q.filter((Empresa.razon_social.ilike(term)) | (Empresa.cuit.ilike(term)))

    results = (
        q.group_by(Empresa.cuit)
        .order_by(func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).desc())
        .all()
    )

    out = []
    for emp, tot_fac, cant_ord in results:
        out.append(EmpresaList(
            cuit=emp.cuit,
            razon_social=emp.razon_social,
            condicion_fiscal=emp.condicion_fiscal,
            total_facturado=float(tot_fac),
            cantidad_ordenes=cant_ord,
            localidad=emp.localidad
        ))
    return out

@router.get("/{cuit}", response_model=EmpresaDetail)
def get_empresa_detail(cuit: str, db: Session = Depends(get_db)):
    emp = db.query(Empresa).filter(Empresa.cuit == cuit).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    ordenes_query = (
        db.query(OrdenProvision, Escuela.nombre)
        .outerjoin(Escuela, OrdenProvision.cue == Escuela.cue)
        .filter(OrdenProvision.cuit_empresa == cuit)
        .order_by(OrdenProvision.fecha.desc().nullslast())
        .all()
    )

    total_fac = 0.0
    ordenes_list = []
    for ord_obj, esc_nombre in ordenes_query:
        total_fac += ord_obj.monto_total
        ordenes_list.append(OrdenSummary(
            id=ord_obj.id,
            nro_orden=ord_obj.nro_orden,
            ejercicio=ord_obj.ejercicio,
            fecha=ord_obj.fecha,
            monto_total=ord_obj.monto_total,
            rubro=ord_obj.rubro,
            empresa_razon_social=emp.razon_social,
            empresa_cuit=emp.cuit,
            estado=ord_obj.estado or "Ejecutado",
            tipo_destino=ord_obj.tipo_destino,
            expediente=ord_obj.expediente,
            descripcion=f"Escuela: {esc_nombre or ord_obj.cue} - {ord_obj.descripcion or ''}"
        ))

    return EmpresaDetail(
        cuit=emp.cuit,
        razon_social=emp.razon_social,
        condicion_fiscal=emp.condicion_fiscal,
        direccion=emp.direccion,
        localidad=emp.localidad,
        telefono=emp.telefono,
        total_facturado=total_fac,
        ordenes=ordenes_list
    )

@router.get("/{cuit}/trabajos")
def get_empresa_trabajos(cuit: str, db: Session = Depends(get_db)):
    """
    Retorna el listado completo y detallado de los últimos trabajos y renglones
    adjudicados a la empresa contratista seleccionada.
    """
    emp = db.query(Empresa).filter(Empresa.cuit == cuit).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    renglones = (
        db.query(RenglonTrabajo)
        .filter(RenglonTrabajo.cuit_empresa == cuit)
        .order_by(RenglonTrabajo.fecha_documento.desc().nullslast(), RenglonTrabajo.id.desc())
        .limit(200)
        .all()
    )

    ordenes = (
        db.query(OrdenProvision, Escuela.nombre.label("escuela_nombre"))
        .outerjoin(Escuela, OrdenProvision.cue == Escuela.cue)
        .filter(OrdenProvision.cuit_empresa == cuit)
        .order_by(OrdenProvision.fecha.desc().nullslast())
        .all()
    )

    return {
        "empresa": {
            "cuit": emp.cuit,
            "razon_social": emp.razon_social,
            "condicion_fiscal": emp.condicion_fiscal,
            "localidad": emp.localidad,
            "total_facturado": sum(o[0].monto_total for o in ordenes)
        },
        "cantidad_trabajos": len(renglones),
        "cantidad_ordenes": len(ordenes),
        "trabajos": [
            {
                "id": r.id,
                "id_trabajo": r.id_trabajo,
                "id_documento": r.id_documento,
                "numero_orden": r.numero_orden,
                "fecha_documento": r.fecha_documento,
                "cue_anexo": r.cue_anexo,
                "establecimiento_o_dependencia": r.establecimiento_o_dependencia,
                "trabajo_detalle": r.trabajo_detalle,
                "rubro": r.rubro,
                "importe_renglon": r.importe_renglon,
                "acta_asociada": r.acta_asociada,
                "departamento": r.departamento,
                "localidad": r.localidad
            }
            for r in renglones
        ],
        "ordenes": [
            {
                "id": o[0].id,
                "nro_orden": o[0].nro_orden,
                "fecha": o[0].fecha,
                "monto_total": o[0].monto_total,
                "rubro": o[0].rubro,
                "escuela_nombre": o[1] or o[0].cue,
                "descripcion": o[0].descripcion
            }
            for o in ordenes
        ]
    }

