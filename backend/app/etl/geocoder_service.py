import os
import re
import json
import time
import requests
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Escuela

CACHE_FILE = "/app/geocoded_cache.json"


def clean_address(raw_domicilio: str) -> str:
    """Limpia el texto del domicilio para dejar nombre de calle y altura numérica."""
    if not raw_domicilio or str(raw_domicilio).lower() == 'nan':
        return ""

    s = str(raw_domicilio).upper().strip()
    # Remover barrio y texto adicional posterior
    s = re.split(r'\b(Bº|BO\.|BARRIO|BO|ESQ\.|ESQ|ENTRE)\b', s)[0].strip()
    # Remover prefijos comunes
    s = re.sub(r'^(AVDA\.|AVDA|AV\.|AV|CALLE|PJE\.|PASAJE|PEATONAL)\s*', '', s).strip()
    # Reemplazar abreviaturas comunes
    s = s.replace("TTE.", "TENIENTE ").replace("GRAL.", "GENERAL ")
    s = s.replace("C/N", "").replace("S/N", "").strip()

    # Verificar que contenga al menos un número de altura
    if not re.search(r'\d+', s):
        return ""
    return s

def load_cache() -> dict:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache: dict):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[!] No se pudo guardar caché de geocodificación: {e}")

def geocode_schools(db: Session, max_queries: int = 150):
    """
    Geocodifica escuelas consultando la API Oficial Georef del IGN para Corrientes.
    Actualiza latitud y longitud exactas en la base de datos.
    """
    print("[*] Iniciando Geocodificador Oficial de Calles (IGN Georef)...")
    cache = load_cache()
    escuelas = db.query(Escuela).filter(Escuela.domicilio.isnot(None)).all()

    geocoded_count = 0
    queries_done = 0

    for esc in escuelas:
        dom = str(esc.domicilio).strip()
        cue = str(esc.cue)
        cleaned = clean_address(dom)

        if not cleaned:
            continue

        # Si ya está en caché
        if cleaned in cache:
            coords = cache[cleaned]
            if coords:
                esc.lat = coords["lat"]
                esc.lng = coords["lng"]
                geocoded_count += 1
            continue

        # Si no está en caché, consultar API Georef
        if queries_done >= max_queries:
            break

        dept_val = esc.departamento if esc.departamento else "Capital"
        try:
            url = "https://apis.datos.gob.ar/georef/api/direcciones"
            params = {
                "direccion": cleaned,
                "provincia": "Corrientes",
                "max": 1
            }
            resp = requests.get(url, params=params, timeout=4)
            queries_done += 1

            if resp.status_code == 200:
                data = resp.json()
                direcciones = data.get("direcciones", [])
                if direcciones:
                    ubicacion = direcciones[0].get("ubicacion", {})
                    lat = ubicacion.get("lat")
                    lon = ubicacion.get("lon")
                    if lat and lon:
                        cache[cleaned] = {"lat": round(lat, 5), "lng": round(lon, 5)}
                        esc.lat = round(lat, 5)
                        esc.lng = round(lon, 5)
                        geocoded_count += 1
                        print(f" [+] Geocodificado exacto: {esc.nombre[:30]} | {cleaned} -> ({lat:.4f}, {lon:.4f})")
                    else:
                        cache[cleaned] = None
                else:
                    cache[cleaned] = None
            else:
                cache[cleaned] = None
            time.sleep(0.08) # Respetar rate limits
        except Exception:
            pass

    db.commit()
    save_cache(cache)
    print(f"[*] Geocodificación finalizada: {geocoded_count} escuelas ubicadas exactamente en su calle catastral.")

if __name__ == "__main__":
    db = SessionLocal()
    geocode_schools(db)
    db.close()
