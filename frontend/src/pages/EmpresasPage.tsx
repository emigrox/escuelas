import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  CheckCircle2, 
  X, 
  Calendar, 
  DollarSign, 
  School, 
  FileText,
  Filter,
  Briefcase
} from 'lucide-react';
import { empresasService } from '../services/api';

export const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);

  // Empresa seleccionada y sus trabajos
  const [selectedEmpresa, setSelectedEmpresa] = useState<any | null>(null);
  const [empresaTrabajos, setEmpresaTrabajos] = useState<any | null>(null);
  const [loadingTrabajos, setLoadingTrabajos] = useState(false);
  const [searchTrabajo, setSearchTrabajo] = useState('');

  useEffect(() => {
    empresasService.getEmpresas().then((res) => {
      setEmpresas(Array.isArray(res) ? res : []);
      setLoading(false);
    }).catch(() => {
      setEmpresas([]);
      setLoading(false);
    });
  }, []);

  const handleSelectEmpresa = async (emp: any) => {
    setSelectedEmpresa(emp);
    setLoadingTrabajos(true);
    try {
      const data = await empresasService.getEmpresaTrabajos(emp.cuit);
      setEmpresaTrabajos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrabajos(false);
    }
  };

  const filtered = (empresas || []).filter((e) => {
    const razon = (e.razon_social || '').toLowerCase();
    const cuit = String(e.cuit || '');
    const loc = (e.localidad || '').toLowerCase();
    const term = (search || '').toLowerCase();
    
    const matchSearch = razon.includes(term) || cuit.includes(term) || loc.includes(term);
    const matchTipo = tipoFilter === 'TODOS' || (e.condicion_fiscal || '').toUpperCase().includes(tipoFilter);

    return matchSearch && matchTipo;
  });

  const filteredTrabajos = (empresaTrabajos?.trabajos || []).filter((t: any) => {
    const term = searchTrabajo.toLowerCase();
    return (t.establecimiento_o_dependencia || '').toLowerCase().includes(term) ||
           (t.rubro || '').toLowerCase().includes(term) ||
           (t.trabajo_detalle || '').toLowerCase().includes(term) ||
           (t.id_trabajo || '').toLowerCase().includes(term) ||
           (t.numero_orden || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registro de Contratistas & Proveedores</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Auditoría de empresas adjudicatarias de órdenes de provisión y desglose de trabajos técnicos
        </p>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por CUIT, Razón Social o Localidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todas las Condiciones Fiscales</option>
            <option value="RESPONSABLE">Responsable Inscripto</option>
            <option value="MONOTRIBUTO">Monotributo</option>
          </select>
          <span className="text-xs text-slate-500 font-bold">
            {filtered.length} contratistas
          </span>
        </div>
      </div>

      {/* Tarjetas de Empresas */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp, idx) => (
            <div 
              key={idx} 
              onClick={() => handleSelectEmpresa(emp)}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Proveedor Oficial
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-3 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {emp.razon_social || 'Empresa sin razón social'}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-1">CUIT: {String(emp.cuit || 'S/D')}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {emp.condicion_fiscal || 'Responsable Inscripto'} • {emp.localidad || 'Corrientes'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Órdenes Asignadas</span>
                  <span className="font-bold text-slate-800 text-sm">{emp.cantidad_ordenes || 0}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Facturado</span>
                  <span className="font-black text-blue-600 text-sm">
                    ${Number(emp.total_facturado || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL / DRAWER CON EL LISTADO DE ÚLTIMOS TRABAJOS DE LA EMPRESA SELECCIONADA */}
      {selectedEmpresa && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {selectedEmpresa.razon_social}
                  </h2>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span>CUIT: <b className="font-mono text-slate-700">{selectedEmpresa.cuit}</b></span>
                    <span>•</span>
                    <span>Condición: <b>{selectedEmpresa.condicion_fiscal || 'Resp. Inscripto'}</b></span>
                    <span>•</span>
                    <span>Localidad: <b>{selectedEmpresa.localidad || 'Corrientes'}</b></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSelectedEmpresa(null); setEmpresaTrabajos(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPIs de la Empresa */}
            <div className="grid grid-cols-3 gap-4 p-5 bg-white border-b border-slate-100">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-blue-700 block">Total Facturado</span>
                <span className="text-xl font-black text-blue-700">
                  ${Number(empresaTrabajos?.empresa?.total_facturado || selectedEmpresa.total_facturado || 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Órdenes Consolidadas</span>
                <span className="text-xl font-black text-slate-800">
                  {empresaTrabajos?.cantidad_ordenes || selectedEmpresa.cantidad_ordenes || 0}
                </span>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-purple-700 block">Renglones de Trabajo Registrados</span>
                <span className="text-xl font-black text-purple-700">
                  {empresaTrabajos?.cantidad_trabajos || 0}
                </span>
              </div>
            </div>

            {/* Listado de Últimos Trabajos */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Historial de Trabajos Adjudicados ({filteredTrabajos.length})</span>
                </h3>
                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por colegio, rubro o tarea..."
                    value={searchTrabajo}
                    onChange={(e) => setSearchTrabajo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loadingTrabajos ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <span>Cargando detalle de obras realizadas...</span>
                </div>
              ) : filteredTrabajos.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">ID Trabajo / OP</th>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Establecimiento Destino</th>
                        <th className="p-2.5">Rubro</th>
                        <th className="p-2.5">Detalle Técnico de la Tarea</th>
                        <th className="p-2.5">Acta</th>
                        <th className="p-2.5 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTrabajos.map((trab: any) => (
                        <tr key={trab.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5">
                            <span className="font-mono text-purple-700 font-bold block">{trab.id_trabajo}</span>
                            <span className="text-[10px] text-slate-500">{trab.numero_orden || trab.id_documento}</span>
                          </td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">
                            {trab.fecha_documento || 'Sin fecha'}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{trab.establecimiento_o_dependencia}</span>
                            <span className="text-[10px] text-slate-500">{trab.departamento} ({trab.localidad})</span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700">{trab.rubro}</td>
                          <td className="p-2.5 max-w-xs text-slate-600">{trab.trabajo_detalle}</td>
                          <td className="p-2.5 font-mono text-[10px] text-slate-500">{trab.acta_asociada || 'S/A'}</td>
                          <td className="p-2.5 text-right font-black text-blue-700 text-sm whitespace-nowrap">
                            ${Number(trab.importe_renglon || 0).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs italic">
                  No se encontraron trabajos registrados para los filtros aplicados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
