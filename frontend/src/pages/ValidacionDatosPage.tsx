import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  ArrowRight, 
  RefreshCw,
  Database,
  Building,
  School
} from 'lucide-react';
import { validacionService } from '../services/api';

export const ValidacionDatosPage: React.FC = () => {
  const [resumen, setResumen] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Estados para propagación manual o asistida
  const [customCues, setCustomCues] = useState<Record<string, string>>({});
  const [propagatingMap, setPropagatingMap] = useState<Record<string, boolean>>({});
  const [alertStatus, setAlertStatus] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  // Tab activo: 1 = Agrupados prioritarios, 2 = Auditoría Renglón x Renglón
  const [activeTab, setActiveTab] = useState<'prioritarios' | 'renglones'>('prioritarios');
  const [renglonesSinCue, setRenglonesSinCue] = useState<any[]>([]);
  const [loadingRenglones, setLoadingRenglones] = useState(false);

  const fetchResumen = async () => {
    setLoading(true);
    try {
      const data = await validacionService.getResumen();
      setResumen(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenglones = async () => {
    setLoadingRenglones(true);
    try {
      const data = await validacionService.getRenglonesSinCue({ establecimiento: searchFilter, limit: 150 });
      setRenglonesSinCue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRenglones(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  useEffect(() => {
    if (activeTab === 'renglones') {
      fetchRenglones();
    }
  }, [activeTab, searchFilter]);

  const handlePropagar = async (nombreEstablecimiento: string, cueToUse: string) => {
    if (!cueToUse || !cueToUse.trim()) {
      setAlertStatus({ tipo: 'error', mensaje: 'Debe ingresar un CUE válido de 9 dígitos.' });
      return;
    }

    setPropagatingMap(prev => ({ ...prev, [nombreEstablecimiento]: true }));
    try {
      const res = await validacionService.propagarCue(nombreEstablecimiento, cueToUse.trim());
      setAlertStatus({
        tipo: 'success',
        mensaje: `✓ Éxito: CUE ${res.cue} propagado a ${res.renglones_actualizados} renglones y ${res.ordenes_actualizadas} órdenes de provisión.`
      });
      // Recargar datos
      await fetchResumen();
      if (activeTab === 'renglones') {
        await fetchRenglones();
      }
    } catch (err: any) {
      setAlertStatus({
        tipo: 'error',
        mensaje: err.response?.data?.detail || 'Error al propagar CUE.'
      });
    } finally {
      setPropagatingMap(prev => ({ ...prev, [nombreEstablecimiento]: false }));
    }
  };

  const filteredEstablecimientos = (resumen?.top_establecimientos_sin_cue || []).filter((item: any) => {
    return (item.establecimiento_o_dependencia || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
           (item.departamento || '').toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Validación y Calidad de Datos</h2>
            <p className="text-xs text-slate-500">
              Auditoría de registros sin CUE Anexo y motor de propagación masiva inteligente
            </p>
          </div>
        </div>

        <button
          onClick={fetchResumen}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Métricas</span>
        </button>
      </div>

      {/* Alerta de notificación */}
      {alertStatus && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm animate-fade-in ${
          alertStatus.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {alertStatus.tipo === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{alertStatus.mensaje}</span>
          </div>
          <button 
            onClick={() => setAlertStatus(null)}
            className="text-xs underline hover:opacity-75"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* KPI Cards de Calidad de Datos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Renglones</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {resumen ? Number(resumen.total_renglones).toLocaleString('es-AR') : '...'}
          </p>
          <span className="text-[11px] text-slate-500">Dataset TODOS_LOS_TRABAJOS</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Con CUE Asignado</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {resumen ? Number(resumen.renglones_con_cue).toLocaleString('es-AR') : '...'}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Completitud:</span>
            <span className="font-bold text-emerald-600">{resumen?.porcentaje_completitud}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase">Renglones Sin CUE</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {resumen ? Number(resumen.renglones_sin_cue).toLocaleString('es-AR') : '...'}
          </p>
          <span className="text-[11px] text-amber-800 font-medium">Requieren validación</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase">Monto Invertido Sin CUE</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">
            ${resumen ? Number(resumen.monto_sin_cue).toLocaleString('es-AR') : '...'}
          </p>
          <span className="text-[11px] text-slate-500">Pendiente de georreferenciar</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('prioritarios')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'prioritarios'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ✨ Establecimientos Prioritarios & Propagación Automática
        </button>
        <button
          onClick={() => setActiveTab('renglones')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'renglones'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          📋 Auditoría Renglón por Renglón (Detalle Completo)
        </button>
      </div>

      {/* Tab 1: Prioritarios con Propagación Inteligente */}
      {activeTab === 'prioritarios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Establecimientos Consistentes Sin CUE (Agrupados por Nombre)
              </h3>
              <p className="text-xs text-slate-500">
                Al asignar el CUE a uno, se propagará automáticamente a todos los registros que compartan el mismo nombre.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar establecimiento..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Nombre del Establecimiento / Dependencia</th>
                  <th className="p-3">Ubicación</th>
                  <th className="p-3 text-center">Renglones</th>
                  <th className="p-3 text-right">Inversión Acumulada</th>
                  <th className="p-3">Sugerencia Inteligente</th>
                  <th className="p-3 text-right">Asignar & Propagar CUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEstablecimientos.map((item: any, idx: number) => {
                  const estName = item.establecimiento_o_dependencia;
                  const isPropagating = propagatingMap[estName];
                  const currentCustomCue = customCues[estName] || '';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="flex items-start space-x-2">
                          <School className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 block">{estName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Ej: {item.ejemplo_id_trabajo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 font-medium block">{item.departamento || 'Sin Depto'}</span>
                        <span className="text-[11px] text-slate-500">{item.localidad || ''}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                          {item.cantidad_renglones} ops
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-blue-600">
                        ${Number(item.total_monto || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="p-3">
                        {item.sugerencia_cue ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handlePropagar(estName, item.sugerencia_cue)}
                              disabled={isPropagating}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-all"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>{item.sugerencia_cue}</span>
                            </button>
                            <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={item.sugerencia_nombre}>
                              {item.sugerencia_nombre}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin sugerencia automática</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <input
                            type="text"
                            placeholder="CUE (9 dígitos)"
                            value={currentCustomCue}
                            onChange={(e) => setCustomCues({ ...customCues, [estName]: e.target.value })}
                            className="w-32 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            disabled={isPropagating || !currentCustomCue.trim()}
                            onClick={() => handlePropagar(estName, currentCustomCue)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold disabled:opacity-40 transition-all flex items-center space-x-1 shadow cursor-pointer"
                          >
                            <span>Propagar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Auditoría Renglón x Renglón */}
      {activeTab === 'renglones' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Auditoría Renglón por Renglón</h3>
              <p className="text-xs text-slate-500">
                Visualización de cada línea técnica individual proveniente de la hoja TODOS_LOS_TRABAJOS
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Mostrando {renglonesSinCue.length} renglones
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 shadow-sm">
                <tr>
                  <th className="p-2.5">ID Trabajo</th>
                  <th className="p-2.5">Orden / Doc</th>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Establecimiento</th>
                  <th className="p-2.5">Rubro / Tarea</th>
                  <th className="p-2.5">Empresa</th>
                  <th className="p-2.5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {loadingRenglones ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Cargando renglones...
                    </td>
                  </tr>
                ) : renglonesSinCue.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="p-2.5 font-mono text-[11px] text-purple-700 font-semibold">{r.id_trabajo}</td>
                    <td className="p-2.5 font-semibold text-slate-800">{r.numero_orden || r.id_documento}</td>
                    <td className="p-2.5 text-slate-500">{r.fecha_documento || 'S/F'}</td>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-900 block">{r.establecimiento_o_dependencia}</span>
                      <span className="text-[10px] text-slate-500">{r.departamento} ({r.localidad})</span>
                    </td>
                    <td className="p-2.5 max-w-xs">
                      <span className="font-semibold text-slate-800 block text-[11px]">{r.rubro}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{r.trabajo_detalle}</span>
                    </td>
                    <td className="p-2.5 text-slate-700">{r.empresa || 'S/D'}</td>
                    <td className="p-2.5 text-right font-bold text-blue-600">
                      ${Number(r.importe_renglon || 0).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
