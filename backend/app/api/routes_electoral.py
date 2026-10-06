import os
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from app.core.database import get_db
from app.models.models import ResultadoElectoral, Escuela, OrdenProvision
from app.schemas.schemas import ElectoralDashboardResponse, CorrelacionItem

router = APIRouter(prefix="/electoral", tags=["Análisis Político-Electoral"])

@router.get("/circuitos-geojson")
def get_circuitos_geojson():
    """
    Retorna la cartografía oficial GeoJSON de los 174 circuitos electorales
    de la Provincia de Corrientes (WFS GeoServer CNE).
    """
    candidates = [
        "/app/app/data/circuitos_corrientes.json",
        "backend/app/data/circuitos_corrientes.json",
        "app/data/circuitos_corrientes.json"
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    return {"type": "FeatureCollection", "features": []}

@router.get("/analisis", response_model=ElectoralDashboardResponse)
def get_analisis_electoral(
    tipo_eleccion: str = Query("ballotage_2da_vuelta", description="ballotage_2da_vuelta o generales_1ra_vuelta"),
    departamento: Optional[str] = Query(None, description="Filtrar por departamento"),
    db: Session = Depends(get_db)
):
    # Totales provinciales por partido en la elección seleccionada
    totales_query = (
        db.query(
            ResultadoElectoral.partido_agrupacion,
            ResultadoElectoral.formula_candidato,
            ResultadoElectoral.color_partido,
            func.sum(ResultadoElectoral.votos).label("total_votos")
        )
        .filter(ResultadoElectoral.tipo_eleccion == tipo_eleccion)
        .group_by(ResultadoElectoral.partido_agrupacion, ResultadoElectoral.formula_candidato, ResultadoElectoral.color_partido)
        .order_by(func.sum(ResultadoElectoral.votos).desc())
        .all()
    )

    suma_votos_total = sum(r.total_votos for r in totales_query) or 1
    partidos_totales = [
        {
            "partido": r.partido_agrupacion,
            "candidato": r.formula_candidato,
            "color": r.color_partido or ("#7c3aed" if "LIBERTAD" in r.partido_agrupacion else "#0284c7"),
            "votos": r.total_votos,
            "porcentaje": round((r.total_votos / suma_votos_total) * 100, 2)
        }
        for r in totales_query
    ]

    # Correlación Escuela por Escuela (Inversión vs Votos)
    escuelas_query = (
        db.query(
            Escuela.cue,
            Escuela.nombre,
            Escuela.departamento,
            Escuela.circuito_id,
            func.coalesce(func.sum(OrdenProvision.monto_total), 0.0).label("total_mantenimiento")
        )
        .outerjoin(OrdenProvision, Escuela.cue == OrdenProvision.cue)
        .filter(Escuela.es_centro_votacion == True)
    )

    if departamento:
        escuelas_query = escuelas_query.filter(Escuela.departamento.ilike(f"%{departamento}%"))

    escuelas_con_gasto = escuelas_query.group_by(Escuela.cue).limit(100).all()

    correlacion_list = []
    for esc in escuelas_con_gasto:
        # Buscar el partido ganador y porcentaje en esta escuela
        res = (
            db.query(ResultadoElectoral)
            .filter(
                ResultadoElectoral.cue == esc.cue,
                ResultadoElectoral.tipo_eleccion == tipo_eleccion
            )
            .order_by(ResultadoElectoral.votos.desc())
            .first()
        )

        votos_pct = res.porcentaje if res else 50.0
        partido_top = res.partido_agrupacion if res else "Oficialismo"

        correlacion_list.append(CorrelacionItem(
            cue=esc.cue,
            escuela_nombre=esc.nombre,
            departamento=esc.departamento or "Capital",
            circuito_id=esc.circuito_id,
            total_mantenimiento=float(esc.total_mantenimiento),
            votos_partido_oficial=round(votos_pct, 2),
            partido_ganador=partido_top,
            tipo_eleccion=tipo_eleccion
        ))

    return ElectoralDashboardResponse(
        tipo_eleccion=tipo_eleccion,
        partidos_totales=partidos_totales,
        correlacion_escuelas=correlacion_list
    )
