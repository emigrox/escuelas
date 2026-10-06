# Sistema Integral de Mantenimiento Escolar y Monitoreo Político-Electoral
### Gobierno de la Provincia de Corrientes

Plataforma unificada para la auditoría, análisis presupuestario, georreferenciación y monitoreo político-electoral del mantenimiento edilicio en escuelas de Corrientes.

---

## 🚀 Puesta en Marcha Rápida (Docker)

El sistema está completamente dockerizado. Para iniciar toda la infraestructura (Base de Datos PostgreSQL + PostGIS, Backend FastAPI y Frontend Nginx):

```bash
docker compose up --build
```

Una vez finalizado el build y arranque:
- **Frontend / Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API REST / Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Base de Datos PostgreSQL:** `localhost:5432` (`escuelas_corrientes`)

---

## 🔑 Credenciales de Acceso Inicial (MVP)

- **Usuario:** `admin@admin.com`
- **Contraseña:** `admin123`

*(Estas credenciales pueden modificarse en el archivo `.env`).*

---

## 📊 Módulos Incluidos en el MVP

1. **Panel Ejecutivo de Mantenimiento:**
   - KPIs de inversión acumulada, órdenes ejecutadas, escuelas intervenidas y contratistas activos.
   - Filtro por ejercicio presupuestario (2025 vs 2026).
   - Análisis de ritmo de ejecución trimestral y distribución por departamentos de Corrientes.
   - Concentración de proveedores (Top 5 empresas por CUIT y porcentaje de acaparamiento de fondos).

2. **Mapa Interactivo de Escuelas (GIS Corrientes):**
   - Mapa centrado en la Provincia de Corrientes (OpenStreetMap + Leaflet).
   - Marcadores de escuelas con diferenciación cromática según el monto de inversión recibido.
   - Panel lateral desplegable con la ficha técnica del colegio: órdenes de provisión realizadas, empresas intervinientes y resultados de mesas electorales.

3. **Registro de Contratistas & Auditoría por CUIT:**
   - Padrón de empresas y proveedores de obras.
   - Búsqueda en vivo por CUIT o Razón Social.
   - Desglose de facturación acumulada y cantidad de órdenes adjudicadas.

4. **Análisis Político-Presupuestario:**
   - Conmutador entre:
     - **Ballotage Presidencial (2ª Vuelta):** Última elección con balotaje definitivo.
     - **Elecciones Generales Presidenciales (1ª Vuelta):** Múltiples fórmulas y fuerzas.
   - Gráfico de correlación entre inversión edilicia por escuela/circuito y porcentaje de votos de cada fuerza política.

5. **Emisión de Comprobantes Oficiales (Fase 2):**
   - Formulario de certificación de obras finalizadas.
   - Generación de comprobante con numeración correlativa oficial.
   - **Descarga e impresión directa en PDF** con membrete oficial del Gobierno de Corrientes y espacios para firma técnica.

---

## 🏗️ Arquitectura Técnica

```text
/Escuelas
│
├── docker-compose.yml          # Orquestación de contenedores
├── .env.example                # Variables de entorno de referencia
├── README.md                   # Documentación técnica
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # Entrada FastAPI con CORS y rutas
│   │   ├── core/               # Base de datos, JWT y configuración
│   │   ├── models/             # Modelos relacionales SQLAlchemy
│   │   ├── schemas/            # Validación con Pydantic
│   │   ├── api/                # Endpoints (auth, dashboard, escuelas, empresas, electoral, comprobantes)
│   │   ├── etl/                # Pipeline de ingesta de Excel y CSV
│   │   └── seed_data.py        # Inicialización de usuario admin y carga
│
└── frontend/
    ├── Dockerfile              # Multi-stage build con Nginx
    ├── nginx.conf              # Servidor web y proxy reverso
    ├── package.json
    ├── src/
    │   ├── App.tsx             # Aplicación principal y gestión de vistas
    │   ├── services/api.ts     # Cliente Axios con JWT y fallback offline
    │   ├── pages/              # Vistas: Login, Dashboard, Mapa, Empresas, Político, Comprobantes
    │   └── components/         # Barra lateral, navegación y controles
```

---

## 🛠️ Desarrollo Local (Sin Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app/seed_data.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
