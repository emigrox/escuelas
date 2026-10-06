import math
import requests
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Escuela, OrdenProvision, Empresa, ResultadoElectoral
from app.schemas.schemas import EscuelaList, EscuelaDetail, OrdenSummary, ResultadoElectoralItem, EscuelaCreate, EscuelaUpdate
from app.etl.geocoder_service import clean_address

router = APIRouter(prefix="/escuelas", tags=["Escuelas & Mapa"])

def clean_num(val, default=0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def clean_txt(val, default="") -> str:
    if val is None:
        return default
    s = str(val).strip()
    return default if s.lower() == 'nan' else s

class GeocodeRequest(BaseModel):
    direccion: str
    localidad: Optional[str] = "Corrientes"
    provincia: Optional[str] = "Corrientes"

@router.get("", response_model=List[EscuelaList])
def list_escuelas(
    query: Optional[str] = Query(None, description="Buscar por nombre o CUE"),
    departamento: Optional[str] = Query(None, description="Filtrar por departamento"),
    solo_con_obras: bool = Query(False, description="Mostrar solo escuelas que recibieron mantenimiento"),
    db: Session = Depends(get_db)
):
    q = db.query(
        Escuela,
        func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).label("total_invertido"),
        func.count(OrdenProvision.id).label("cantidad_obras")
    ).outerjoin(OrdenProvision, Escuela.cue == OrdenProvision.cue)

    if query:
        term = f"%{query}%"
        q = q.filter((Escuela.nombre.ilike(term)) | (Escuela.cue.ilike(term)) | (Escuela.domicilio.ilike(term)))

    if departamento:
        q = q.filter(Escuela.departamento.ilike(f"%{departamento}%"))

    q = q.group_by(
        Escuela.cue,
        Escuela.nombre,
        Escuela.departamento,
        Escuela.localidad,
        Escuela.domicilio,
        Escuela.nivel_modalidad,
        Escuela.lat,
        Escuela.lng,
        Escuela.circuito_id,
        Escuela.es_centro_votacion
    )

    if solo_con_obras:
        q = q.having(func.count(OrdenProvision.id) > 0)

    results = q.order_by(func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).desc()).all()

    escuelas_out = []
    for esc, total_inv, cant_obras in results:
        escuelas_out.append(EscuelaList(
            cue=clean_txt(esc.cue),
            nombre=clean_txt(esc.nombre, "Establecimiento Escolar"),
            departamento=clean_txt(esc.departamento, "Corrientes"),
            localidad=clean_txt(esc.localidad, "Corrientes"),
            domicilio=clean_txt(esc.domicilio, ""),
            lat=clean_num(esc.lat, -27.4692),
            lng=clean_num(esc.lng, -58.8306),
            total_invertido=clean_num(total_inv),
            cantidad_obras=int(cant_obras or 0),
            es_centro_votacion=bool(esc.es_centro_votacion),
            circuito_id=clean_txt(esc.circuito_id, "CIRC-01")
        ))
    return escuelas_out

@router.get("/mapa/puntos")
def get_mapa_puntos(db: Session = Depends(get_db)):
    """
    Retorna los puntos geolocalizados de las escuelas de Corrientes (GeoJSON),
    incluyendo domicilio para verificar en el tooltip si está vacío o no.
    """
    q = db.query(
        Escuela.cue,
        Escuela.nombre,
        Escuela.departamento,
        Escuela.localidad,
        Escuela.domicilio,
        Escuela.lat,
        Escuela.lng,
        Escuela.es_centro_votacion,
        func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).label("total_invertido"),
        func.count(OrdenProvision.id).label("cantidad_obras")
    ).outerjoin(OrdenProvision, Escuela.cue == OrdenProvision.cue)\
     .group_by(
         Escuela.cue,
         Escuela.nombre,
         Escuela.departamento,
         Escuela.localidad,
         Escuela.domicilio,
         Escuela.lat,
         Escuela.lng,
         Escuela.es_centro_votacion
     ).all()

    features = []
    for item in q:
        lat = clean_num(item.lat, -27.4692)
        lng = clean_num(item.lng, -58.8306)
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": {
                "cue": clean_txt(item.cue),
                "nombre": clean_txt(item.nombre, "Establecimiento"),
                "departamento": clean_txt(item.departamento, "Corrientes"),
                "localidad": clean_txt(item.localidad, ""),
                "domicilio": clean_txt(item.domicilio, "Sin domicilio registrado"),
                "total_invertido": clean_num(item.total_invertido),
                "cantidad_obras": int(item.cantidad_obras or 0),
                "es_centro_votacion": bool(item.es_centro_votacion)
            }
        })
    return {"type": "FeatureCollection", "features": features}

@router.post("", response_model=EscuelaList, status_code=status.HTTP_201_CREATED)
def create_escuela(datos: EscuelaCreate, db: Session = Depends(get_db)):
    """Permite dar de alta una nueva escuela en la base de datos."""
    existing = db.query(Escuela).filter(Escuela.cue == datos.cue).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una escuela registrada con este CUE.")

    esc = Escuela(
        cue=datos.cue,
        nombre=datos.nombre,
        departamento=datos.departamento or "Capital",
        localidad=datos.localidad or "Corrientes",
        domicilio=datos.domicilio,
        lat=clean_num(datos.lat, -27.4692),
        lng=clean_num(datos.lng, -58.8306),
        circuito_id=datos.circuito_id or "CIRC-01",
        es_centro_votacion=datos.es_centro_votacion
    )
    db.add(esc)
    db.commit()
    db.refresh(esc)

    return EscuelaList(
        cue=esc.cue,
        nombre=esc.nombre,
        departamento=esc.departamento,
        localidad=esc.localidad,
        domicilio=esc.domicilio,
        lat=esc.lat,
        lng=esc.lng,
        total_invertido=0.0,
        cantidad_obras=0,
        es_centro_votacion=esc.es_centro_votacion,
        circuito_id=esc.circuito_id
    )

@router.put("/{cue}", response_model=EscuelaList)
def update_escuela(cue: str, datos: EscuelaUpdate, db: Session = Depends(get_db)):
    """Permite editar y corregir datos, domicilio o coordenadas de una escuela."""
    esc = db.query(Escuela).filter(Escuela.cue == cue).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escuela no encontrada")

    if datos.nombre is not None:
        esc.nombre = datos.nombre
    if datos.departamento is not None:
        esc.departamento = datos.departamento
    if datos.localidad is not None:
        esc.localidad = datos.localidad
    if datos.domicilio is not None:
        esc.domicilio = datos.domicilio
    if datos.lat is not None:
        esc.lat = clean_num(datos.lat, esc.lat)
    if datos.lng is not None:
        esc.lng = clean_num(datos.lng, esc.lng)
    if datos.circuito_id is not None:
        esc.circuito_id = datos.circuito_id
    if datos.es_centro_votacion is not None:
        esc.es_centro_votacion = datos.es_centro_votacion

    db.commit()
    db.refresh(esc)

    total_inv = db.query(func.coalesce(func.sum(OrdenProvision.monto_total), 0.0))\
                  .filter(OrdenProvision.cue == cue).scalar() or 0.0
    cant_obras = db.query(func.count(OrdenProvision.id))\
                   .filter(OrdenProvision.cue == cue).scalar() or 0

    return EscuelaList(
        cue=esc.cue,
        nombre=esc.nombre,
        departamento=esc.departamento,
        localidad=esc.localidad,
        domicilio=esc.domicilio,
        lat=esc.lat,
        lng=esc.lng,
        total_invertido=clean_num(total_inv),
        cantidad_obras=cant_obras,
        es_centro_votacion=esc.es_centro_votacion,
        circuito_id=esc.circuito_id
    )

@router.post("/geocodificar-direccion")
def geocodificar_direccion(req: GeocodeRequest):
    """
    Geocodifica una dirección al vuelo usando la API Oficial Georef del IGN.
    """
    clean_dir = clean_address(req.direccion)
    if not clean_dir:
        clean_dir = req.direccion.strip()

    try:
        url = "https://apis.datos.gob.ar/georef/api/direcciones"
        params = {
            "direccion": clean_dir,
            "provincia": req.provincia or "Corrientes",
            "max": 1
        }
        resp = requests.get(url, params=params, timeout=4)
        if resp.status_code == 200:
            dirs = resp.json().get("direcciones", [])
            if dirs:
                u = dirs[0].get("ubicacion", {})
                lat = u.get("lat")
                lon = u.get("lon")
                if lat and lon:
                    return {
                        "encontrado": True,
                        "lat": round(lat, 5),
                        "lng": round(lon, 5),
                        "nomenclatura": dirs[0].get("nomenclatura")
                    }
    except Exception as e:
        pass

    return {
        "encontrado": False,
        "lat": None,
        "lng": None,
        "mensaje": "No se encontraron coordenadas exactas para la dirección ingresada."
    }

from app.models.models import Escuela, OrdenProvision, Empresa, ResultadoElectoral, RenglonTrabajo
from app.schemas.schemas import EscuelaList, EscuelaDetail, OrdenSummary, ResultadoElectoralItem, EscuelaCreate, EscuelaUpdate, RenglonTrabajoItem

@router.get("/sugerencias")
def sugerencias_escuelas(
    query: str = Query(..., min_length=2, description="Texto de búsqueda para autocompletado"),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Endpoint para alimentar el buscador con sugerencias desplegables inmediatas,
    distinguiendo escuelas con el mismo nombre según su CUE, departamento, localidad o domicilio.
    """
    term = f"%{query}%"
    results = (
        db.query(
            Escuela.cue,
            Escuela.nombre,
            Escuela.departamento,
            Escuela.localidad,
            Escuela.domicilio,
            Escuela.lat,
            Escuela.lng,
            Escuela.es_centro_votacion,
            func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).label("total_invertido"),
            func.count(OrdenProvision.id).label("cantidad_obras")
        )
        .outerjoin(OrdenProvision, Escuela.cue == OrdenProvision.cue)
        .filter((Escuela.nombre.ilike(term)) | (Escuela.cue.ilike(term)) | (Escuela.domicilio.ilike(term)))
        .group_by(
            Escuela.cue,
            Escuela.nombre,
            Escuela.departamento,
            Escuela.localidad,
            Escuela.domicilio,
            Escuela.lat,
            Escuela.lng,
            Escuela.es_centro_votacion
        )
        .order_by(
            func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).desc(),
            Escuela.nombre.asc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "cue": clean_txt(r.cue),
            "nombre": clean_txt(r.nombre),
            "departamento": clean_txt(r.departamento, "Corrientes"),
            "localidad": clean_txt(r.localidad, ""),
            "domicilio": clean_txt(r.domicilio, "Sin domicilio"),
            "lat": clean_num(r.lat, -27.4692),
            "lng": clean_num(r.lng, -58.8306),
            "es_centro_votacion": bool(r.es_centro_votacion),
            "total_invertido": clean_num(r.total_invertido),
            "cantidad_obras": int(r.cantidad_obras or 0)
        }
        for r in results
    ]

@router.get("/{cue}", response_model=EscuelaDetail)
def get_escuela_detail(cue: str, db: Session = Depends(get_db)):
    esc = db.query(Escuela).filter(Escuela.cue == cue).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escuela no encontrada")

    # Órdenes de Provisión
    ordenes_query = (
        db.query(OrdenProvision, Empresa.razon_social)
        .outerjoin(Empresa, OrdenProvision.cuit_empresa == Empresa.cuit)
        .filter(OrdenProvision.cue == cue)
        .order_by(OrdenProvision.fecha.desc().nullslast(), OrdenProvision.id.desc())
        .all()
    )

    ordenes_list = []
    total_inv = 0.0
    for ord_obj, razon in ordenes_query:
        monto = clean_num(ord_obj.monto_total)
        total_inv += monto
        ordenes_list.append(OrdenSummary(
            id=ord_obj.id,
            nro_orden=clean_txt(ord_obj.nro_orden, "ORD-S/N"),
            ejercicio=int(ord_obj.ejercicio or 2026),
            fecha=ord_obj.fecha,
            monto_total=monto,
            rubro=clean_txt(ord_obj.rubro, "Mantenimiento"),
            empresa_razon_social=clean_txt(razon or ord_obj.cuit_empresa, "Proveedor"),
            empresa_cuit=clean_txt(ord_obj.cuit_empresa),
            estado=clean_txt(ord_obj.estado, "Ejecutado"),
            tipo_destino=clean_txt(ord_obj.tipo_destino, "Establecimiento escolar"),
            expediente=clean_txt(ord_obj.expediente),
            descripcion=clean_txt(ord_obj.descripcion)
        ))

    # Renglones detallados individuales para auditoría técnica
    renglones_query = (
        db.query(RenglonTrabajo)
        .filter(RenglonTrabajo.cue_anexo == cue)
        .order_by(RenglonTrabajo.fecha_documento.desc().nullslast(), RenglonTrabajo.id.desc())
        .all()
    )

    renglones_list = [
        RenglonTrabajoItem(
            id=r.id,
            id_trabajo=r.id_trabajo,
            id_documento=r.id_documento,
            numero_orden=r.numero_orden,
            fecha_documento=r.fecha_documento,
            cue_anexo=r.cue_anexo,
            cuit_empresa=r.cuit_empresa,
            establecimiento_o_dependencia=r.establecimiento_o_dependencia,
            empresa=r.empresa,
            trabajo_detalle=r.trabajo_detalle,
            rubro=r.rubro,
            importe_renglon=clean_num(r.importe_renglon),
            tipo_destino=r.tipo_destino,
            departamento=r.departamento,
            localidad=r.localidad,
            acta_asociada=r.acta_asociada
        )
        for r in renglones_query
    ]

    # Resultados Electorales (SOLO SI ES CENTRO DE VOTACIÓN)
    electoral_list = []
    if esc.es_centro_votacion:
        resultados_query = (
            db.query(ResultadoElectoral)
            .filter(ResultadoElectoral.cue == cue)
            .order_by(ResultadoElectoral.votos.desc())
            .all()
        )
        electoral_list = [
            ResultadoElectoralItem(
                tipo_eleccion=clean_txt(r.tipo_eleccion),
                partido_agrupacion=clean_txt(r.partido_agrupacion),
                formula_candidato=clean_txt(r.formula_candidato),
                color_partido=clean_txt(r.color_partido, "#7c3aed"),
                votos=int(r.votos or 0),
                porcentaje=clean_num(r.porcentaje)
            )
            for r in resultados_query
        ]

    return EscuelaDetail(
        cue=clean_txt(esc.cue),
        nombre=clean_txt(esc.nombre),
        departamento=clean_txt(esc.departamento),
        localidad=clean_txt(esc.localidad),
        domicilio=clean_txt(esc.domicilio),
        lat=clean_num(esc.lat, -27.4692),
        lng=clean_num(esc.lng, -58.8306),
        es_centro_votacion=bool(esc.es_centro_votacion),
        circuito_id=clean_txt(esc.circuito_id),
        total_invertido=clean_num(total_inv),
        ordenes=ordenes_list,
        renglones=renglones_list,
        resultados_electorales=electoral_list
    )
