import os
import glob
import json
import math
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Escuela, Empresa, OrdenProvision, TrabajoDetalle, ResultadoElectoral, RenglonTrabajo

COLORES_PARTIDOS = {
    'LA LIBERTAD AVANZA': '#7c3aed',         # Violeta
    'UNION POR LA PATRIA': '#0284c7',        # Celeste / Azul
    'JUNTOS POR EL CAMBIO': '#eab308',       # Amarillo
    'HACEMOS POR NUESTRO PAIS': '#1e3a8a',   # Azul Marino
    'FRENTE DE IZQUIERDA': '#dc2626',        # Rojo
    'OTROS': '#94a3b8'                       # Gris
}

def get_color_partido(nombre: str) -> str:
    n_up = str(nombre).upper().strip()
    for k, col in COLORES_PARTIDOS.items():
        if k in n_up:
            return col
    return '#64748b'

def normalize_key(val) -> str:
    if val is None or pd.isna(val):
        return ""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return ""
        return str(int(f))
    except (ValueError, TypeError):
        s = str(val).strip().replace("-", "").replace(".", "").replace(" ", "")
        return s if s.lower() != 'nan' else ""

def find_file(directory: str, pattern: str):
    matches = glob.glob(os.path.join(directory, pattern))
    if matches:
        return matches[0]
    matches = glob.glob(pattern)
    if matches:
        return matches[0]
    return None

def load_all_data(db: Session, data_dir: str = "/app/data_source"):
    print(f"[*] Iniciando Pipeline ETL Definitivo desde: {data_dir}")

    # Limpiar tablas previas
    db.query(ResultadoElectoral).delete()
    db.query(RenglonTrabajo).delete()
    db.query(TrabajoDetalle).delete()
    db.query(OrdenProvision).delete()
    db.query(Empresa).delete()
    db.query(Escuela).delete()
    db.commit()

    # Diccionario para mapear CUEs a coordenadas oficiales
    # 1. Cargar coordenadas oficiales del MEC desde /app/app/data/escuelas_mec.json
    mec_coords = {}
    mec_coords_7 = {}
    mec_data_path = "/app/app/data/escuelas_mec.json"
    if os.path.exists(mec_data_path):
        try:
            with open(mec_data_path, "r", encoding="utf-8") as f:
                mec_list = json.load(f)
            for item in mec_list:
                est = item.get("establecimiento") or {}
                cue_9 = normalize_key(item.get("id"))
                cue_7 = normalize_key(est.get("cue"))
                dom = item.get("domicilio") or {}
                pos = dom.get("position")
                if pos and isinstance(pos, (list, tuple)) and len(pos) == 2:
                    lng_m, lat_m = float(pos[0]), float(pos[1])
                    if -31.5 <= lat_m <= -26.5 and -60.5 <= lng_m <= -55.0:
                        loc = dom.get("localidad") or {}
                        dep = loc.get("departamento") or {}
                        calle = str(dom.get("calle") or "").strip()
                        nro = str(dom.get("nro") or "").strip()
                        barrio = str(dom.get("barrio") or "").strip()
                        dom_txt = f"{calle} {nro} {barrio}".strip()
                        data_mec = {
                            "lat": round(lat_m, 6),
                            "lng": round(lng_m, 6),
                            "nombre": item.get("nombre") or est.get("nombre"),
                            "domicilio": dom_txt if dom_txt else None,
                            "localidad": loc.get("nombre"),
                            "departamento": dep.get("nombre")
                        }
                        if cue_9:
                            mec_coords[cue_9] = data_mec
                        if cue_7:
                            mec_coords_7[cue_7] = data_mec
            print(f"[+] Coordenadas oficiales MEC cargadas: {len(mec_coords)} escuelas con GPS verificado.")
        except Exception as e:
            print(f"[!] Error leyendo escuelas_mec.json: {e}")

    # 2. Cargar Escuelas y Centros Electorales de LISTADO ESTABLECIMIENTOS + MESAS ELECTORALES.xlsx
    f_esc = find_file(data_dir, "*LISTADO ESTABLECIMIENTOS*.xlsx")
    cues_electorales = {}
    cues_cargados = set()

    if f_esc:
        print("[*] Procesando LISTADO ESTABLECIMIENTOS + MESAS ELECTORALES...")
        try:
            # Hoja URNAS_CIRCUITOS: Identifica centros electorales reales
            df_urnas = pd.read_excel(f_esc, sheet_name='URNAS_CIRCUITOS')
            for _, r in df_urnas.iterrows():
                cue_u = normalize_key(r.get('cue anexo'))
                if cue_u:
                    cues_electorales[cue_u] = {
                        "circuito": str(r.get('circuito electoral', '1')).strip(),
                        "urna_desde": int(r.get('urna desde', 1)),
                        "urna_hasta": int(r.get('urna hasta', 1)),
                        "cantidad_urnas": int(r.get('cantidad urnas', 1)),
                        "seccion": str(r.get('seccion electoral', 'CAPITAL')).strip()
                    }

            # Hoja CAPITAL_SOLO: Catálogo de establecimientos de Capital
            df_cap = pd.read_excel(f_esc, sheet_name='CAPITAL_SOLO')
            for _, r in df_cap.iterrows():
                cue = normalize_key(r.get('cue anexo'))
                if not cue or cue in cues_cargados:
                    continue

                nom = str(r.get('nombre', 'Establecimiento')).strip()
                dep = str(r.get('departamento', 'CAPITAL')).strip()
                loc = str(r.get('localidad', 'CORRIENTES')).strip()
                dom = str(r.get('domicilio', '')).strip()

                # Usar coordenadas oficiales del MEC si existen
                lat, lng = -27.4692, -58.8306
                coords_info = mec_coords.get(cue) or mec_coords_7.get(cue[:7] if len(cue) >= 7 else "")
                if coords_info:
                    lat = coords_info["lat"]
                    lng = coords_info["lng"]
                    if not dom or dom.lower() == 'nan':
                        dom = coords_info.get("domicilio") or dom
                else:
                    lat, lng = -27.4720, -58.8340

                es_electoral = cue in cues_electorales
                circuito = cues_electorales[cue]["circuito"] if es_electoral else None

                esc = Escuela(
                    cue=cue,
                    nombre=nom,
                    departamento=dep,
                    localidad=loc,
                    domicilio=dom if dom and dom.lower() != 'nan' and dom != '' else None,
                    lat=lat,
                    lng=lng,
                    circuito_id=f"CIRC-{circuito}" if circuito else None,
                    es_centro_votacion=es_electoral
                )
                db.add(esc)
                cues_cargados.add(cue)

            db.commit()
            print(f"[+] {len(cues_cargados)} escuelas de Capital cargadas ({len(cues_electorales)} centros de votación).")
        except Exception as e:
            print(f"[!] Error procesando LISTADO ESTABLECIMIENTOS: {e}")

    # 3. Incorporar escuelas del interior del MEC que no estén en la base
    print("[*] Integrando escuelas del interior desde base oficial MEC...")
    count_interior = 0
    for cue_m, d in mec_coords.items():
        if cue_m not in cues_cargados:
            dep_m = d.get("departamento") or "INTERIOR"
            loc_m = d.get("localidad") or dep_m
            nom_m = d.get("nombre") or f"Escuela CUE {cue_m}"
            dom_m = d.get("domicilio")

            es_electoral = cue_m in cues_electorales
            circ = cues_electorales[cue_m]["circuito"] if es_electoral else None

            esc = Escuela(
                cue=cue_m,
                nombre=nom_m,
                departamento=dep_m,
                localidad=loc_m,
                domicilio=dom_m if dom_m and dom_m.lower() != 'nan' else None,
                lat=d["lat"],
                lng=d["lng"],
                circuito_id=f"CIRC-{circ}" if circ else None,
                es_centro_votacion=es_electoral
            )
            db.add(esc)
            cues_cargados.add(cue_m)
            count_interior += 1

    db.commit()
    print(f"[+] {count_interior} escuelas del interior integradas con coordenadas oficiales. Total en padrón: {len(cues_cargados)}.")

    # 4. Cargar Empresas Contratistas desde hoja EMPRESAS
    f_cons = find_file(data_dir, "*Ordenes_provision*consolidadas*.xlsx")
    cuits_cargados = set()
    empresa_id_map = {}

    if f_cons:
        print("[*] Procesando empresas contratistas...")
        try:
            df_emp = pd.read_excel(f_cons, sheet_name='EMPRESAS', header=5)
            for _, r in df_emp.iterrows():
                cuit = normalize_key(r.get('cuit'))
                id_emp = str(r.get('id empresa', '')).strip()
                nom_emp = str(r.get('nombre empresa', '')).strip()
                tipo = str(r.get('tipo proveedor', 'Responsable Inscripto')).strip()

                if not cuit:
                    cuit = f"SINCQUIT-{id_emp}"
                if id_emp:
                    empresa_id_map[id_emp] = cuit

                if cuit not in cuits_cargados and nom_emp and nom_emp.lower() != 'nan':
                    emp = Empresa(
                        cuit=cuit,
                        razon_social=nom_emp,
                        condicion_fiscal=tipo if tipo.lower() != 'nan' else 'Responsable Inscripto',
                        localidad="Corrientes"
                    )
                    db.add(emp)
                    cuits_cargados.add(cuit)
            db.commit()
            print(f"[+] {len(cuits_cargados)} empresas registradas.")
        except Exception as e:
            print(f"[!] Error leyendo empresas: {e}")

    # 5. Cargar Renglones Individuales y Órdenes de Provisión desde TODOS_LOS_TRABAJOS
    if f_cons:
        print("[*] Cargando 2.861 renglones individuales y consolidando Órdenes de Provisión...")
        try:
            df_trab = pd.read_excel(f_cons, sheet_name='TODOS_LOS_TRABAJOS', header=5)
            ordenes_map = {}

            for idx, r in df_trab.iterrows():
                id_trab = str(r.get('id_trabajo', f'TRAB-{idx+1:04d}')).strip()
                id_doc = str(r.get('id_documento', '')).strip()
                nro_ord = str(r.get('numero_orden', '')).strip()

                if not id_doc or id_doc.lower() == 'nan':
                    id_doc = f"DOC-{idx+1:04d}"

                cue_raw = normalize_key(r.get('cue_anexo'))
                cuit_raw = normalize_key(r.get('cuit_empresa'))
                id_emp = str(r.get('id_empresa', '')).strip()
                if not cuit_raw and id_emp in empresa_id_map:
                    cuit_raw = empresa_id_map[id_emp]

                if cuit_raw and cuit_raw not in cuits_cargados and nom_emp and nom_emp.lower() != 'nan':
                    emp = Empresa(
                        cuit=cuit_raw,
                        razon_social=nom_emp,
                        condicion_fiscal="Responsable Inscripto",
                        localidad=loc_est or "Corrientes"
                    )
                    db.add(emp)
                    db.flush()
                    cuits_cargados.add(cuit_raw)

                nom_est = str(r.get('establecimiento_o_dependencia', '')).strip()
                nom_emp = str(r.get('empresa', '')).strip()
                rubro = str(r.get('rubro', r.get('trabajo_detalle', 'Mantenimiento General'))).strip()
                tipo_dest = str(r.get('tipo_destino', 'Establecimiento escolar')).strip()
                dep_est = str(r.get('departamento', 'CAPITAL')).strip()
                loc_est = str(r.get('localidad', 'CORRIENTES')).strip()
                acta = str(r.get('acta_asociada', '')).strip()
                if acta.lower() == 'nan':
                    acta = None

                monto_renglon = 0.0
                try:
                    monto_renglon = float(r.get('importe_renglon', 0.0))
                    if math.isnan(monto_renglon) or math.isinf(monto_renglon):
                        monto_renglon = 0.0
                except:
                    monto_renglon = 0.0

                fecha_doc = None
                try:
                    f_raw = r.get('fecha_documento')
                    if pd.notna(f_raw):
                        fecha_doc = pd.to_datetime(f_raw).date()
                except:
                    fecha_doc = None

                ejercicio = fecha_doc.year if fecha_doc else 2026

                # Guardar renglón individual en renglones_trabajos para Validación y Calidad de Datos
                renglon_obj = RenglonTrabajo(
                    id_trabajo=id_trab,
                    id_documento=id_doc,
                    numero_orden=f"OP-{int(float(nro_ord))}" if (nro_ord and nro_ord.lower() != 'nan') else None,
                    fecha_documento=fecha_doc,
                    cue_anexo=cue_raw if cue_raw else None,
                    cuit_empresa=cuit_raw if cuit_raw in cuits_cargados else None,
                    establecimiento_o_dependencia=nom_est,
                    empresa=nom_emp,
                    trabajo_detalle=str(r.get('trabajo_detalle', ''))[:500],
                    rubro=rubro[:90],
                    importe_renglon=round(monto_renglon, 2),
                    tipo_destino=tipo_dest,
                    departamento=dep_est,
                    localidad=loc_est,
                    acta_asociada=acta
                )
                db.add(renglon_obj)

                # Acumular en la Orden de Provisión
                key_orden = id_doc
                if key_orden not in ordenes_map:
                    nro_mostrar = f"OP-{int(float(nro_ord))}" if (nro_ord and nro_ord.lower() != 'nan') else id_doc
                    ordenes_map[key_orden] = {
                        "nro_orden": nro_mostrar,
                        "ejercicio": ejercicio,
                        "fecha": fecha_doc,
                        "cue": cue_raw if cue_raw in cues_cargados else None,
                        "cuit_empresa": cuit_raw if cuit_raw in cuits_cargados else None,
                        "monto_total": monto_renglon,
                        "rubro": rubro[:90],
                        "tipo_destino": tipo_dest,
                        "descripcion": str(r.get('trabajo_detalle', ''))[:400]
                    }
                else:
                    ordenes_map[key_orden]["monto_total"] += monto_renglon
                    if not ordenes_map[key_orden]["cue"] and cue_raw in cues_cargados:
                        ordenes_map[key_orden]["cue"] = cue_raw
                    if not ordenes_map[key_orden]["cuit_empresa"] and cuit_raw in cuits_cargados:
                        ordenes_map[key_orden]["cuit_empresa"] = cuit_raw

            db.commit()

            # Insertar órdenes consolidadas
            monto_acum = 0.0
            for ord_data in ordenes_map.values():
                monto_acum += ord_data["monto_total"]
                op = OrdenProvision(
                    nro_orden=ord_data["nro_orden"],
                    ejercicio=ord_data["ejercicio"],
                    fecha=ord_data["fecha"],
                    cue=ord_data["cue"],
                    cuit_empresa=ord_data["cuit_empresa"],
                    monto_total=round(ord_data["monto_total"], 2),
                    rubro=ord_data["rubro"],
                    estado="Ejecutado",
                    tipo_destino=ord_data["tipo_destino"],
                    descripcion=ord_data["descripcion"]
                )
                db.add(op)
            db.commit()
            print(f"[+] {len(ordenes_map)} Órdenes consolidadas con monto acumulado: ${monto_acum:,.2f}.")
        except Exception as e:
            print(f"[!] Error procesando renglones y órdenes: {e}")

    # 6. Procesar Resultados Electorales Reales (Distrito Corrientes)
    # Únicamente para escuelas con es_centro_votacion = True
    print("[*] Procesando resultados electorales oficiales para escuelas habilitadas...")
    f_segunda = find_file(data_dir, "*segundaVuelta*.csv") or find_file("/app/app/data", "*segundaVuelta*.csv") or find_file("backend/app/data", "*segundaVuelta*.csv")
    f_primera = find_file(data_dir, "*primeraVuelta*.csv") or find_file("/app/app/data", "*primeraVuelta*.csv") or find_file("backend/app/data", "*primeraVuelta*.csv")

    # Mapeo de mesa (int) -> cue de la escuela (en Capital las urnas 1..905 no se solapan)
    mesa_to_cue = {}
    for cue_elec, info in cues_electorales.items():
        for m in range(info["urna_desde"], info["urna_hasta"] + 1):
            mesa_to_cue[m] = cue_elec

    # Cargar Ballotage (2ª Vuelta)
    if f_segunda:
        print("[*] Ingestando Ballotage Presidencial 2023 (Corrientes)...")
        try:
            votos_por_escuela_b = {} # cue -> {agrupacion: votos}
            for chunk in pd.read_csv(f_segunda, chunksize=50000, low_memory=False):
                ctes = chunk[chunk['distrito_id'].astype(str).isin(['5', '05']) | chunk['distrito_nombre'].astype(str).str.contains('Corrientes', case=False, na=False)]
                for _, row in ctes.iterrows():
                    agrup = str(row.get('agrupacion_nombre', '')).strip().upper()
                    if not agrup or agrup in ['UNDEFINED', 'NAN']:
                        continue
                    try:
                        mesa = int(row.get('mesa_id', 0))
                    except:
                        continue

                    cue_dest = mesa_to_cue.get(mesa)
                    if cue_dest:
                        votos = int(row.get('votos_cantidad', 0) or 0)
                        if cue_dest not in votos_por_escuela_b:
                            votos_por_escuela_b[cue_dest] = {}
                        votos_por_escuela_b[cue_dest][agrup] = votos_por_escuela_b[cue_dest].get(agrup, 0) + votos

            # Guardar en base de datos
            for cue_dest, agr_dict in votos_por_escuela_b.items():
                tot_v = sum(agr_dict.values()) or 1
                for agrup, cant in agr_dict.items():
                    pct = round((cant / tot_v) * 100, 2)
                    cand = "MILEI - VILLARRUEL" if "LIBERTAD" in agrup else ("MASSA - ROSSI" if "PATRIA" in agrup else "")
                    r_elec = ResultadoElectoral(
                        tipo_eleccion="ballotage_2da_vuelta",
                        circuito_id=cues_electorales.get(cue_dest, {}).get("circuito", "1"),
                        mesa=f"Urnas {cues_electorales.get(cue_dest, {}).get('urna_desde')}-{cues_electorales.get(cue_dest, {}).get('urna_hasta')}",
                        cue=cue_dest,
                        partido_agrupacion=agrup,
                        formula_candidato=cand,
                        color_partido=get_color_partido(agrup),
                        votos=cant,
                        porcentaje=pct
                    )
                    db.add(r_elec)
            db.commit()
            print(f"[+] Ballotage vinculado a {len(votos_por_escuela_b)} escuelas electorales.")
        except Exception as e:
            print(f"[!] Error procesando ballotage: {e}")

    # Cargar Primera Vuelta
    if f_primera:
        print("[*] Ingestando Elecciones Generales 1ª Vuelta 2023 (Corrientes)...")
        try:
            votos_por_escuela_g = {}
            for chunk in pd.read_csv(f_primera, chunksize=50000, low_memory=False):
                ctes = chunk[chunk['distrito_id'].astype(str).isin(['5', '05']) | chunk['distrito_nombre'].astype(str).str.contains('Corrientes', case=False, na=False)]
                for _, row in ctes.iterrows():
                    agrup = str(row.get('agrupacion_nombre', '')).strip().upper()
                    if not agrup or agrup in ['UNDEFINED', 'NAN']:
                        continue
                    try:
                        mesa = int(row.get('mesa_id', 0))
                    except:
                        continue

                    cue_dest = mesa_to_cue.get(mesa)
                    if cue_dest:
                        votos = int(row.get('votos_cantidad', 0) or 0)
                        if cue_dest not in votos_por_escuela_g:
                            votos_por_escuela_g[cue_dest] = {}
                        votos_por_escuela_g[cue_dest][agrup] = votos_por_escuela_g[cue_dest].get(agrup, 0) + votos

            for cue_dest, agr_dict in votos_por_escuela_g.items():
                tot_v = sum(agr_dict.values()) or 1
                for agrup, cant in agr_dict.items():
                    pct = round((cant / tot_v) * 100, 2)
                    cand = "MASSA - ROSSI" if "PATRIA" in agrup else ("MILEI - VILLARRUEL" if "LIBERTAD" in agrup else ("BULLRICH - PETRI" if "CAMBIO" in agrup else ""))
                    r_elec = ResultadoElectoral(
                        tipo_eleccion="generales_1ra_vuelta",
                        circuito_id=cues_electorales.get(cue_dest, {}).get("circuito", "1"),
                        mesa=f"Urnas {cues_electorales.get(cue_dest, {}).get('urna_desde')}-{cues_electorales.get(cue_dest, {}).get('urna_hasta')}",
                        cue=cue_dest,
                        partido_agrupacion=agrup,
                        formula_candidato=cand,
                        color_partido=get_color_partido(agrup),
                        votos=cant,
                        porcentaje=pct
                    )
                    db.add(r_elec)
            db.commit()
            print(f"[+] Generales 1ª Vuelta vinculadas a {len(votos_por_escuela_g)} escuelas electorales.")
        except Exception as e:
            print(f"[!] Error procesando primera vuelta: {e}")

    print("[*] Pipeline ETL Finalizado con Éxito.")
