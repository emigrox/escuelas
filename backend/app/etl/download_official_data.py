import os
import json
import requests

DATA_DIR = "/app/app/data"
os.makedirs(DATA_DIR, exist_ok=True)

def download_cne():
    path = os.path.join(DATA_DIR, "circuitos_corrientes.json")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print("[i] Circuitos CNE ya descargados.")
        return

    print("[*] Descargando Circuitos Electorales Oficiales de Corrientes (CNE WFS)...")
    url = "https://mapa2.electoral.gov.ar/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&authkey=67b690ee05175d05121e9060a044da4f&typeName=descargas:circuito_05&maxFeatures=2000&outputFormat=application%2Fjson"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            data = r.json()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            print(f"[+] Circuitos guardados: {len(data.get('features', []))} polígonos.")
        else:
            print(f"[!] Error descargando CNE: {r.status_code}")
    except Exception as e:
        print(f"[!] Excepción CNE: {e}")

def download_mec():
    path = os.path.join(DATA_DIR, "escuelas_mec.json")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print("[i] Escuelas MEC ya descargadas.")
        return

    print("[*] Descargando Escuelas Oficiales del MEC Corrientes...")
    url = "http://mapa.mec.gob.ar:8082/api/localizacion"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            data = r.json()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            print(f"[+] Escuelas MEC guardadas: {len(data)} establecimientos.")
        else:
            print(f"[!] Error descargando MEC: {r.status_code}")
    except Exception as e:
        print(f"[!] Excepción MEC: {e}")

if __name__ == "__main__":
    download_cne()
    download_mec()
