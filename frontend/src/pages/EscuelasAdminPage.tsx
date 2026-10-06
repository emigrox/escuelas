import React, { useEffect, useState } from 'react';
import { School, Search, Plus, Edit, MapPin, CheckCircle, AlertTriangle, X, Save, RefreshCw } from 'lucide-react';
import { escuelasService } from '../services/api';

export const EscuelasAdminPage: React.FC = () => {
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);

  // Estados de modales
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [modalNewOpen, setModalNewOpen] = useState(false);
  const [selectedEscuela, setSelectedEscuela] = useState<any | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    cue: '',
    nombre: '',
    domicilio: '',
    departamento: 'CAPITAL',
    localidad: 'CORRIENTES',
    lat: -27.4692,
    lng: -58.8306,
    circuito_id: 'CIRC-01'
  });

  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEscuelas = () => {
    setLoading(true);
    escuelasService.getEscuelas().then((data) => {
      setEscuelas(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => {
      setEscuelas([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchEscuelas();
  }, []);

  const handleOpenEdit = (esc: any) => {
    setSelectedEscuela(esc);
    setFormData({
      cue: esc.cue,
      nombre: esc.nombre || '',
      domicilio: esc.domicilio || '',
      departamento: esc.departamento || 'CAPITAL',
      localidad: esc.localidad || 'CORRIENTES',
      lat: esc.lat || -27.4692,
      lng: esc.lng || -58.8306,
      circuito_id: esc.circuito_id || 'CIRC-01'
    });
    setGeocodingMsg(null);
    setModalEditOpen(true);
  };

  const handleOpenNew = () => {
    setFormData({
      cue: '',
      nombre: '',
      domicilio: '',
      departamento: 'CAPITAL',
      localidad: 'CORRIENTES',
      lat: -27.4692,
      lng: -58.8306,
      circuito_id: 'CIRC-01'
    });
    setGeocodingMsg(null);
    setModalNewOpen(true);
  };

  // Botón para geocodificar dirección automáticamente vía IGN Georef
  const handleAutoGeocode = async () => {
    if (!formData.domicilio) {
      setGeocodingMsg('Ingrese una calle y altura para geocodificar.');
      return;
    }
    setGeocodingLoading(true);
    setGeocodingMsg(null);
    try {
      const res = await escuelasService.geocodificarDireccion(formData.domicilio, formData.localidad);
      if (res.encontrado && res.lat && res.lng) {
        setFormData(prev => ({
          ...prev,
          lat: res.lat,
          lng: res.lng
        }));
        setGeocodingMsg(`Coordenadas encontradas: (${res.lat}, ${res.lng}) - ${res.nomenclatura || ''}`);
      } else {
        setGeocodingMsg('No se encontró coordenada exacta para esa dirección.');
      }
    } catch {
      setGeocodingMsg('Error al conectar con el servicio de geocodificación.');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await escuelasService.updateEscuela(formData.cue, {
        nombre: formData.nombre,
        domicilio: formData.domicilio,
        departamento: formData.departamento,
        localidad: formData.localidad,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        circuito_id: formData.circuito_id
      });
      setModalEditOpen(false);
      fetchEscuelas();
    } catch (err: any) {
      alert('Error al guardar cambios: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await escuelasService.createEscuela({
        cue: formData.cue,
        nombre: formData.nombre,
        domicilio: formData.domicilio,
        departamento: formData.departamento,
        localidad: formData.localidad,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        circuito_id: formData.circuito_id
      });
      setModalNewOpen(false);
      fetchEscuelas();
    } catch (err: any) {
      alert('Error al crear escuela: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const filtered = escuelas.filter((e) => {
    const term = search.toLowerCase();
    const matchSearch =
      (e.nombre || '').toLowerCase().includes(term) ||
      (e.cue || '').toLowerCase().includes(term) ||
      (e.domicilio || '').toLowerCase().includes(term);

    const matchDept = deptFilter === 'TODOS' || (e.departamento && e.departamento.toUpperCase().includes(deptFilter));
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Escuelas & Domicilios</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Padrón de establecimientos educativos, verificación de calles catastrales y edición de datos
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Escuela</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por CUE, nombre o calle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todos los Departamentos</option>
            <option value="CAPITAL">Capital</option>
            <option value="GOYA">Goya</option>
            <option value="PASO DE LOS LIBRES">Paso de los Libres</option>
            <option value="SALADAS">Saladas</option>
            <option value="MERCEDES">Mercedes</option>
            <option value="CURUZU CUATIA">Curuzú Cuatiá</option>
            <option value="SANTO TOME">Santo Tomé</option>
            <option value="ESQUINA">Esquina</option>
          </select>

          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {filtered.length} escuelas
          </span>
        </div>
      </div>

      {/* Tabla de Escuelas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">CUE</th>
                  <th className="px-5 py-3 font-semibold">Nombre del Establecimiento</th>
                  <th className="px-5 py-3 font-semibold">Domicilio Catastral</th>
                  <th className="px-5 py-3 font-semibold">Departamento / Localidad</th>
                  <th className="px-5 py-3 font-semibold text-center">Coordenadas</th>
                  <th className="px-5 py-3 font-semibold text-right">Inversión</th>
                  <th className="px-5 py-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((esc) => {
                  const hasAddress = esc.domicilio && esc.domicilio !== 'Sin domicilio registrado' && esc.domicilio.toLowerCase() !== 'nan';
                  return (
                    <tr key={esc.cue} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-semibold text-slate-900">{esc.cue}</td>
                      <td className="px-5 py-3 font-medium text-slate-900 max-w-xs truncate" title={esc.nombre}>
                        {esc.nombre}
                      </td>
                      <td className="px-5 py-3">
                        {hasAddress ? (
                          <span className="flex items-center space-x-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="truncate max-w-xs">{esc.domicilio}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Sin Domicilio</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium">
                        {esc.departamento} ({esc.localidad})
                      </td>
                      <td className="px-5 py-3 text-center font-mono text-[11px] text-slate-500">
                        {esc.lat ? `${esc.lat.toFixed(4)}, ${esc.lng.toFixed(4)}` : 'S/D'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-blue-600">
                        ${Number(esc.total_invertido || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(esc)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-blue-200"
                          title="Editar / Corregir Domicilio"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar Escuela */}
      {modalEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar Establecimiento</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">CUE: {formData.cue}</p>
              </div>
              <button onClick={() => setModalEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider">
                    Domicilio (Calle y Altura)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeocode}
                    disabled={geocodingLoading}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${geocodingLoading ? 'animate-spin' : ''}`} />
                    <span>Auto-Geocodificar (IGN)</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ej: Mendoza 1362, Pellegrini 1050..."
                  value={formData.domicilio}
                  onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {geocodingMsg && (
                  <p className="text-[10px] text-blue-600 font-medium mt-1">{geocodingMsg}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Departamento</label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Localidad</label>
                  <input
                    type="text"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase tracking-wider mb-1">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase tracking-wider mb-1">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Escuela */}
      {modalNewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Dar de Alta Nueva Escuela</h3>
              <button onClick={() => setModalNewOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">CUE Anexo</label>
                  <input
                    type="text"
                    required
                    placeholder="180123400"
                    value={formData.cue}
                    onChange={(e) => setFormData({ ...formData, cue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Escuela Primaria..."
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider">
                    Domicilio (Calle y Altura)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeocode}
                    disabled={geocodingLoading}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${geocodingLoading ? 'animate-spin' : ''}`} />
                    <span>Auto-Geocodificar (IGN)</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ej: Pellegrini 1050, 3 de Abril 1240..."
                  value={formData.domicilio}
                  onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {geocodingMsg && (
                  <p className="text-[10px] text-blue-600 font-medium mt-1">{geocodingMsg}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Departamento</label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Localidad</label>
                  <input
                    type="text"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase tracking-wider mb-1">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase tracking-wider mb-1">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalNewOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Creando...' : 'Crear Escuela'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
