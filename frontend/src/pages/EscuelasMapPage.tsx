import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { 
  Search, 
  School, 
  DollarSign, 
  Vote, 
  X, 
  Filter, 
  Map as MapIcon, 
  Layers, 
  CheckCircle2, 
  FileText, 
  Building2, 
  Calendar,
  AlertCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { escuelasService, electoralService } from '../services/api';

// Coordenadas para centrar el mapa según departamento seleccionado
const DEPT_CENTERS: Record<string, [number, number]> = {
  'TODOS': [-28.2, -58.0],
  'CAPITAL': [-27.4692, -58.8306],
  'GOYA': [-29.1410, -59.2630],
  'PASO DE LOS LIBRES': [-29.7120, -57.0880],
  'MERCEDES': [-29.1830, -58.0770],
  'CURUZU CUATIA': [-29.7915, -58.0553],
  'SANTO TOME': [-28.5494, -56.0425],
  'BELLA VISTA': [-28.5085, -59.0435],
  'ESQUINA': [-30.0144, -59.5312],
  'SALADAS': [-28.2539, -58.6258],
  'MONTE CASEROS': [-30.2533, -57.6366],
};

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
}

export const EscuelasMapPage: React.FC = () => {
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [deptFilter, setDeptFilter] = useState('TODOS');
  const [soloConObras, setSoloConObras] = useState(false);

  // Capa Circuitos GeoJSON CNE
  const [showCircuitos, setShowCircuitos] = useState(false);
  const [circuitosGeoJson, setCircuitosGeoJson] = useState<any | null>(null);
  const [loadingCircuitos, setLoadingCircuitos] = useState(false);

  // Escuela seleccionada
  const [selectedEscuela, setSelectedEscuela] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [escuelaDetail, setEscuelaDetail] = useState<any | null>(null);
  const [tabDetalle, setTabDetalle] = useState<'ordenes' | 'renglones' | 'electoral'>('ordenes');

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { defaultIcon, highInvestIcon, selectedIcon } = useMemo(() => {
    try {
      const def = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [22, 36],
        iconAnchor: [11, 36],
        popupAnchor: [1, -30],
        shadowSize: [36, 36]
      });

      const gold = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [26, 42],
        iconAnchor: [13, 42],
        popupAnchor: [1, -35],
        shadowSize: [42, 42]
      });

      const red = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [28, 44],
        iconAnchor: [14, 44],
        popupAnchor: [1, -38],
        shadowSize: [44, 44]
      });

      return { defaultIcon: def, highInvestIcon: gold, selectedIcon: red };
    } catch {
      return { defaultIcon: undefined, highInvestIcon: undefined, selectedIcon: undefined };
    }
  }, []);

  // Cargar escuelas iniciales
  useEffect(() => {
    escuelasService.getEscuelas().then(setEscuelas);
  }, []);

  // Autocomplete debounced
  useEffect(() => {
    if (search.trim().length >= 2) {
      const timer = setTimeout(() => {
        escuelasService.getSugerencias(search).then(res => {
          setSugerencias(res);
          setShowSugerencias(true);
        }).catch(() => {});
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSugerencias([]);
      setShowSugerencias(false);
    }
  }, [search]);

  // Click fuera de sugerencias
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar capa Circuitos cuando se active
  const handleToggleCircuitos = async () => {
    if (!showCircuitos && !circuitosGeoJson) {
      setLoadingCircuitos(true);
      try {
        const data = await electoralService.getCircuitosGeoJSON();
        setCircuitosGeoJson(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCircuitos(false);
      }
    }
    setShowCircuitos(!showCircuitos);
  };

  const handleSelectEscuela = async (cue: string, coords?: [number, number]) => {
    setShowSugerencias(false);
    setSelectedEscuela(cue);
    if (coords) {
      setSelectedCoords(coords);
    }
    setLoadingDetail(true);
    const detail = await escuelasService.getEscuelaDetail(cue);
    setEscuelaDetail(detail);
    if (detail && detail.lat && detail.lng) {
      setSelectedCoords([detail.lat, detail.lng]);
    }
    setLoadingDetail(false);
  };

  const onEachCircuitFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const p = feature.properties;
      const circ = p.circuito || p.gid || '';
      const depto = p.departamen || p.departamento || 'Corrientes';
      const cab = p.cabecera || '';
      layer.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; line-height: 1.4;">
          <p style="font-weight: bold; margin: 0 0 4px 0; color: #6d28d9; font-size: 12px;">🗳️ Circuito Electoral ${circ}</p>
          <p style="margin: 0; color: #334155;">Departamento: <b>${depto}</b></p>
          ${cab ? `<p style="margin: 0; color: #64748b;">Cabecera: ${cab}</p>` : ''}
          <p style="margin: 4px 0 0 0; color: #8b5cf6; font-size: 10px;">Cartografía Oficial CNE</p>
        </div>
      `);
    }
  };

  const filtered = escuelas.filter((e) => {
    const term = search.toLowerCase();
    const matchSearch = 
      (e.nombre || '').toLowerCase().includes(term) || 
      (e.cue || '').toLowerCase().includes(term) ||
      (e.departamento && e.departamento.toLowerCase().includes(term)) ||
      (e.domicilio && e.domicilio.toLowerCase().includes(term));
    
    const matchDept = deptFilter === 'TODOS' || 
      (e.departamento && e.departamento.toUpperCase().includes(deptFilter));

    const matchObras = !soloConObras || (e.cantidad_obras && e.cantidad_obras > 0);

    return matchSearch && matchDept && matchObras;
  });

  const currentCenter = selectedCoords || DEPT_CENTERS[deptFilter] || [-28.2, -58.0];
  const currentZoom = selectedCoords ? 15 : (deptFilter === 'TODOS' ? 8 : (deptFilter === 'CAPITAL' ? 12 : 11));

  return (
    <div className="flex flex-col space-y-4">
      {/* Barra de Filtros y Herramientas Superior */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Buscador con Sugerencias Desplegables */}
          <div ref={searchContainerRef} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar escuela por nombre, CUE o calle (despliega sugerencias)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => sugerencias.length > 0 && setShowSugerencias(true)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Dropdown de Sugerencias con CUE y Localidad */}
            {showSugerencias && sugerencias.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-[1000] divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Sugerencias encontradas ({sugerencias.length}) - Clic para ubicar
                </div>
                {sugerencias.map((sug) => (
                  <button
                    type="button"
                    key={sug.cue}
                    onClick={() => handleSelectEscuela(sug.cue, [sug.lat, sug.lng])}
                    className="w-full text-left p-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                          {sug.nombre}
                        </span>
                        {sug.es_centro_votacion && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">
                            Electoral
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        📍 {sug.domicilio && sug.domicilio !== 'Sin domicilio' ? sug.domicilio : 'Sin calle'} - {sug.departamento} ({sug.localidad})
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        CUE: {sug.cue}
                      </span>
                      {sug.total_invertido > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 mt-1">
                          ${Number(sug.total_invertido).toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector de Departamento */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setSelectedCoords(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TODOS">Toda la Provincia de Corrientes</option>
              <option value="CAPITAL">Capital (Corrientes)</option>
              <option value="GOYA">Goya</option>
              <option value="PASO DE LOS LIBRES">Paso de los Libres</option>
              <option value="MERCEDES">Mercedes</option>
              <option value="CURUZU CUATIA">Curuzú Cuatiá</option>
              <option value="SANTO TOME">Santo Tomé</option>
              <option value="SALADAS">Saladas</option>
              <option value="ESQUINA">Esquina</option>
              <option value="BELLA VISTA">Bella Vista</option>
              <option value="MONTE CASEROS">Monte Caseros</option>
            </select>
          </div>

          {/* Toggle Capa Circuitos GeoJSON CNE */}
          <button
            type="button"
            onClick={handleToggleCircuitos}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              showCircuitos
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{loadingCircuitos ? 'Cargando...' : showCircuitos ? '✓ Circuitos CNE Activos' : '🗳️ Capa Circuitos CNE (174)'}</span>
          </button>

          {/* Filtro: Solo con obras */}
          <button
            type="button"
            onClick={() => setSoloConObras(!soloConObras)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              soloConObras 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {soloConObras ? '✓ Con Mantenimiento' : 'Todas las Escuelas'}
          </button>
        </div>

        {/* Leyenda y Conteo */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
              <span>Escuela en Padrón Oficial MEC</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Inversión Mayor (&gt;$10M)</span>
            </span>
            {showCircuitos && (
              <span className="flex items-center space-x-1.5 text-purple-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40 border border-purple-700 inline-block"></span>
                <span>174 Polígonos de Circuitos Electorales</span>
              </span>
            )}
          </div>
          <span className="font-bold text-slate-900">
            {filtered.length} escuelas en vista
          </span>
        </div>
      </div>

      {/* Contenedor del Mapa */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative h-[520px]">
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <ChangeView center={currentCenter} zoom={currentZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Capa GeoJSON Circuitos Electorales CNE */}
          {showCircuitos && circuitosGeoJson && (
            <GeoJSON
              key="geojson-circuitos-cne"
              data={circuitosGeoJson}
              style={{
                color: '#7c3aed',
                weight: 1.5,
                fillColor: '#8b5cf6',
                fillOpacity: 0.08,
                dashArray: '3'
              }}
              onEachFeature={onEachCircuitFeature}
            />
          )}

          {/* Marcadores de Escuelas */}
          {filtered.map((esc) => {
            const isSelected = selectedEscuela === esc.cue;
            const isGold = (esc.total_invertido || 0) > 10000000;
            const markerIcon = isSelected ? selectedIcon : (isGold ? highInvestIcon : defaultIcon);

            return (
              <Marker
                key={esc.cue}
                position={[esc.lat || -27.4692, esc.lng || -58.8306]}
                {...(markerIcon ? { icon: markerIcon } : {})}
                eventHandlers={{
                  click: () => handleSelectEscuela(esc.cue, [esc.lat, esc.lng]),
                }}
              >
                <Popup>
                  <div className="p-1 max-w-xs text-xs space-y-1.5">
                    <p className="font-bold text-slate-900 text-sm leading-snug">{esc.nombre}</p>
                    <p className="text-slate-500">CUE: <span className="font-mono text-slate-700 font-semibold">{esc.cue}</span></p>
                    
                    {/* Visualización del Domicilio */}
                    {esc.domicilio && esc.domicilio !== 'Sin domicilio registrado' && esc.domicilio.toLowerCase() !== 'nan' ? (
                      <div className="p-1.5 bg-slate-100 rounded text-[11px] text-slate-700 flex items-start space-x-1">
                        <span className="font-bold text-slate-900">📍 Dir:</span>
                        <span>{esc.domicilio}</span>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 font-medium">
                        ⚠️ Domicilio no especificado en el padrón
                      </div>
                    )}

                    <p className="text-slate-500">
                      Ubicación: <span className="font-semibold text-slate-700">{esc.departamento}</span> ({esc.localidad})
                    </p>
                    <p className="text-blue-600 font-bold text-sm">
                      Total Invertido: ${Number(esc.total_invertido || 0).toLocaleString('es-AR')}
                    </p>
                    
                    {/* Badge Electoral Correcto */}
                    {esc.es_centro_votacion ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                        🗳️ Centro de Votación ({esc.circuito_id || 'Circuito'})
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        🏛️ Escuela No Electoral
                      </span>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleSelectEscuela(esc.cue, [esc.lat, esc.lng])}
                        className="w-full text-center py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold"
                      >
                        Ver Detalle de Obras Abajo 👇
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* SECCIÓN INFERIOR: DETALLE COMPLETO DE ÓRDENES DE PROVISIÓN (OP) Y TRABAJOS DE LA ESCUELA */}
      {selectedEscuela && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 space-y-4 animate-fade-in">
          {/* Header del Establecimiento */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <School className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-lg">
                  {escuelaDetail?.nombre || 'Cargando establecimiento...'}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span>CUE Anexo: <b className="font-mono text-slate-800">{selectedEscuela}</b></span>
                <span>•</span>
                <span>Departamento: <b className="text-slate-800">{escuelaDetail?.departamento || 'Corrientes'}</b></span>
                <span>•</span>
                <span>Localidad: <b className="text-slate-800">{escuelaDetail?.localidad || ''}</b></span>
                <span>•</span>
                <span>Dirección: <b className="text-slate-800">{escuelaDetail?.domicilio || 'Sin domicilio registrado'}</b></span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Total Fondos Invertidos</span>
                <span className="text-lg font-black text-blue-700">
                  ${Number(escuelaDetail?.total_invertido || 0).toLocaleString('es-AR')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedEscuela(null); setEscuelaDetail(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Cerrar detalle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loadingDetail ? (
            <div className="p-12 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span>Cargando historial de Órdenes de Provisión...</span>
            </div>
          ) : escuelaDetail ? (
            <div className="space-y-4">
              {/* Selector de sub-pestañas */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setTabDetalle('ordenes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tabDetalle === 'ordenes'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Órdenes de Provisión Consolidadas ({escuelaDetail.ordenes?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTabDetalle('renglones')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tabDetalle === 'renglones'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Desglose Técnico de Renglones ({escuelaDetail.renglones?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTabDetalle('electoral')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tabDetalle === 'electoral'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Resultados Electorales {escuelaDetail.es_centro_votacion ? '(Habilitada)' : '(No Electoral)'}
                </button>
              </div>

              {/* TAB 1: Órdenes de Provisión */}
              {tabDetalle === 'ordenes' && (
                <div className="overflow-x-auto">
                  {escuelaDetail.ordenes?.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">N° de Orden</th>
                          <th className="p-3">Ejercicio / Fecha</th>
                          <th className="p-3">Empresa Contratista</th>
                          <th className="p-3">Rubro de la Obra</th>
                          <th className="p-3">Tipo Destino</th>
                          <th className="p-3">Expediente</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-right">Monto Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {escuelaDetail.ordenes.map((ord: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-3 font-mono font-bold text-blue-700">{ord.nro_orden}</td>
                            <td className="p-3 text-slate-600">
                              <span className="block font-semibold">{ord.ejercicio}</span>
                              <span className="text-[10px] text-slate-400">{ord.fecha || 'Sin fecha'}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{ord.empresa_razon_social}</span>
                              <span className="text-[10px] text-slate-400 font-mono">CUIT: {ord.empresa_cuit || 'S/D'}</span>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{ord.rubro}</td>
                            <td className="p-3 text-slate-600">{ord.tipo_destino || 'Establecimiento escolar'}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">{ord.expediente || 'S/E'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {ord.estado || 'Ejecutado'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-blue-700 text-sm">
                              ${Number(ord.monto_total || 0).toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs italic">
                      Este establecimiento no tiene órdenes de provisión registradas en el período.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Desglose Técnico de Renglones */}
              {tabDetalle === 'renglones' && (
                <div className="overflow-x-auto">
                  {escuelaDetail.renglones?.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">ID Trabajo</th>
                          <th className="p-2.5">N° Orden</th>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">Rubro</th>
                          <th className="p-2.5">Detalle de la Tarea Realizada</th>
                          <th className="p-2.5">Empresa</th>
                          <th className="p-2.5">Acta</th>
                          <th className="p-2.5 text-right">Importe Renglón</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {escuelaDetail.renglones.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono text-purple-700 font-bold">{r.id_trabajo}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{r.numero_orden || r.id_documento}</td>
                            <td className="p-2.5 text-slate-500">{r.fecha_documento || 'S/F'}</td>
                            <td className="p-2.5 font-semibold text-slate-700">{r.rubro}</td>
                            <td className="p-2.5 max-w-sm text-slate-600">{r.trabajo_detalle}</td>
                            <td className="p-2.5 text-slate-700">{r.empresa || 'S/D'}</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">{r.acta_asociada || 'S/A'}</td>
                            <td className="p-2.5 text-right font-black text-blue-600">
                              ${Number(r.importe_renglon || 0).toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs italic">
                      No se encontraron renglones desglosados para este CUE.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Resultados Electorales (SOLO SI ES ELECTORAL) */}
              {tabDetalle === 'electoral' && (
                <div>
                  {!escuelaDetail.es_centro_votacion ? (
                    <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-xl text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                      <h4 className="font-bold text-amber-900 text-sm">
                        Establecimiento No Habilitado como Centro de Votación
                      </h4>
                      <p className="text-xs text-amber-800 max-w-lg mx-auto">
                        Esta escuela no figuró en el padrón electoral oficial con urnas o mesas habilitadas en los comicios 2023. Sus datos son exclusivamente de gestión educativa y de infraestructura.
                      </p>
                    </div>
                  ) : escuelaDetail.resultados_electorales?.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                        <span className="font-semibold text-purple-900">
                          🗳️ Centro Electoral Habilitado — Circuito: {escuelaDetail.circuito_id || 'Capital'}
                        </span>
                        <span>Mesas escrutadas oficialmente por el Correo / CNE</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {escuelaDetail.resultados_electorales.map((res: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between"
                            style={{ borderLeftWidth: 4, borderLeftColor: res.color_partido || '#7c3aed' }}
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {res.tipo_eleccion === 'ballotage_2da_vuelta' ? 'Ballotage Presidencial' : 'Generales 1ª Vuelta'}
                              </span>
                              <p className="font-black text-slate-900 text-sm mt-0.5">{res.partido_agrupacion}</p>
                              <p className="text-xs text-slate-600 font-medium">{res.formula_candidato}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black" style={{ color: res.color_partido || '#7c3aed' }}>
                                {res.porcentaje}%
                              </span>
                              <p className="text-xs text-slate-500 font-semibold">{Number(res.votos).toLocaleString('es-AR')} votos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No se encontraron cómputos electorales registrados para esta escuela.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
