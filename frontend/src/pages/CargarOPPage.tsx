import React, { useState, useEffect } from 'react';
import { 
  FilePlus2, 
  School, 
  Building2, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2,
  Search,
  FileText
} from 'lucide-react';
import { ordenesService, escuelasService, empresasService } from '../services/api';

const RUBROS = [
  'Mantenimiento General',
  'Instalación Eléctrica e Iluminación',
  'Instalaciones Sanitarias y Red Cloacal',
  'Cubiertas, Techos y Zinguería',
  'Pintura General y Tratamiento de Muros',
  'Carpintería y Cerrajería de Seguridad',
  'Obras Civiles y Refacciones Varias',
  'Mobiliario y Equipamiento Escolar',
  'Climatización y Ventilación'
];

const TIPOS_DESTINO = [
  'Establecimiento escolar',
  'Extensión Áulica / Anexo',
  'Colegio Secundario',
  'Escuela Primaria',
  'Jardín de Infantes (JIN / EJI)',
  'Escuela Técnica',
  'Dependencia Administrativa'
];

const ESTADOS = [
  'Ejecutado',
  'En Ejecución',
  'Certificado',
  'Pendiente'
];

export const CargarOPPage: React.FC = () => {
  const [nroOrden, setNroOrden] = useState('');
  const [ejercicio, setEjercicio] = useState(2026);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [montoTotal, setMontoTotal] = useState<number | ''>('');
  const [rubro, setRubro] = useState(RUBROS[0]);
  const [estado, setEstado] = useState(ESTADOS[0]);
  const [tipoDestino, setTipoDestino] = useState(TIPOS_DESTINO[0]);
  const [expediente, setExpediente] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Selector Escuela con Autocomplete
  const [cue, setCue] = useState('');
  const [escuelaNombre, setEscuelaNombre] = useState('');
  const [busquedaEscuela, setBusquedaEscuela] = useState('');
  const [sugerenciasEscuelas, setSugerenciasEscuelas] = useState<any[]>([]);
  const [mostrandoSugerencias, setMostrandoSugerencias] = useState(false);

  // Selector Empresa
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [cuitEmpresa, setCuitEmpresa] = useState('');

  // Tareas / Renglones desglosados (Opcional)
  const [tareas, setTareas] = useState<{ rubro: string; descripcion_tarea: string; monto: number }[]>([]);

  // Estados de carga y alerta
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar lista de empresas
  useEffect(() => {
    empresasService.getEmpresas().then(setEmpresas).catch(() => {});
  }, []);

  // Autocomplete de escuelas al tipear
  useEffect(() => {
    if (busquedaEscuela.trim().length >= 2) {
      escuelasService.getSugerencias(busquedaEscuela).then(res => {
        setSugerenciasEscuelas(res);
        setMostrandoSugerencias(true);
      }).catch(() => {});
    } else {
      setSugerenciasEscuelas([]);
      setMostrandoSugerencias(false);
    }
  }, [busquedaEscuela]);

  const handleSelectEscuela = (esc: any) => {
    setCue(esc.cue);
    setEscuelaNombre(esc.nombre);
    setBusquedaEscuela(`${esc.nombre} (CUE: ${esc.cue})`);
    setMostrandoSugerencias(false);
  };

  const handleAddTarea = () => {
    setTareas([...tareas, { rubro, descripcion_tarea: '', monto: 0 }]);
  };

  const handleRemoveTarea = (idx: number) => {
    setTareas(tareas.filter((_, i) => i !== idx));
  };

  const handleTareaChange = (idx: number, field: string, value: any) => {
    const copy = [...tareas];
    copy[idx] = { ...copy[idx], [field]: value };
    setTareas(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nroOrden.trim()) {
      setErrorMsg('Debe ingresar un Número de Orden de Provisión.');
      return;
    }
    if (!montoTotal || Number(montoTotal) <= 0) {
      setErrorMsg('El Monto Total debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nro_orden: nroOrden.trim().toUpperCase(),
        ejercicio: Number(ejercicio),
        fecha: fecha || null,
        cue: cue || null,
        cuit_empresa: cuitEmpresa || null,
        monto_total: Number(montoTotal),
        rubro,
        estado,
        tipo_destino: tipoDestino,
        expediente: expediente.trim() || null,
        descripcion: descripcion.trim() || null,
        trabajos: tareas.filter(t => t.descripcion_tarea.trim() !== '')
      };

      await ordenesService.createOrden(payload);
      setSuccessMsg(`Orden de Provisión ${payload.nro_orden} registrada correctamente en el sistema.`);
      
      // Limpiar campos principales
      setNroOrden('');
      setMontoTotal('');
      setExpediente('');
      setDescripcion('');
      setTareas([]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar la Orden de Provisión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <FilePlus2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Registrar Orden de Provisión (OP)</h2>
            <p className="text-xs text-slate-500">
              Formulario de carga y validación de mantenimiento de infraestructura escolar de Corrientes
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
          Ejercicio Activo: {ejercicio}
        </span>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-800 text-sm shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Sección 1: Identificación de la OP */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Datos Principales del Documento</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                N° de Orden de Provisión *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: OP-0145 o D0042"
                value={nroOrden}
                onChange={(e) => setNroOrden(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ejercicio Presupuestario
              </label>
              <select
                value={ejercicio}
                onChange={(e) => setEjercicio(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2026}>2026 (En Curso)</option>
                <option value={2025}>2025 (Histórico)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Fecha Documento</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monto Total ($) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Escuela y Empresa */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <School className="w-4 h-4 text-blue-600" />
            <span>Destino y Contratista Adjudicado</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buscador de Escuela con Sugerencias */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Escuela / Establecimiento (Buscar por nombre o CUE)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Escriba para buscar escuela..."
                  value={busquedaEscuela}
                  onChange={(e) => setBusquedaEscuela(e.target.value)}
                  onFocus={() => sugerenciasEscuelas.length > 0 && setMostrandoSugerencias(true)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lista desplegable de sugerencias */}
              {mostrandoSugerencias && sugerenciasEscuelas.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                  {sugerenciasEscuelas.map((sug) => (
                    <button
                      type="button"
                      key={sug.cue}
                      onClick={() => handleSelectEscuela(sug)}
                      className="w-full text-left p-2.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-xs text-slate-900">{sug.nombre}</p>
                        <p className="text-[11px] text-slate-500">
                          {sug.departamento} ({sug.localidad}) - {sug.domicilio}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold ml-2">
                        {sug.cue}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {cue && (
                <p className="text-[11px] text-blue-700 font-medium mt-1">
                  ✓ Seleccionado: <b>{escuelaNombre}</b> (CUE: {cue})
                </p>
              )}
            </div>

            {/* Selector de Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Empresa Contratista</span>
              </label>
              <select
                value={cuitEmpresa}
                onChange={(e) => setCuitEmpresa(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {empresas.map((emp) => (
                  <option key={emp.cuit} value={emp.cuit}>
                    {emp.razon_social} (CUIT: {emp.cuit})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección 3: Categorización de la Obra */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            Categorización y Expediente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rubro de la Obra</label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RUBROS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Ejecución</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ESTADOS.map((est) => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Destino</label>
              <select
                value={tipoDestino}
                onChange={(e) => setTipoDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_DESTINO.map((td) => (
                  <option key={td} value={td}>{td}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">N° de Expediente (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: EXP-2026-003891"
                value={expediente}
                onChange={(e) => setExpediente(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción General de los Trabajos (Memoria Técnica)
            </label>
            <textarea
              rows={2}
              placeholder="Detalle de trabajos a realizar o realizados en el establecimiento..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sección 4: Desglose de Renglones / Tareas (Opcional) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Desglose Opcional de Renglones o Tareas Específicas
              </h4>
              <p className="text-[11px] text-slate-500">
                Permite auditar ítems individuales que componen el monto total
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddTarea}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Tarea</span>
            </button>
          </div>

          {tareas.length > 0 ? (
            <div className="space-y-2">
              {tareas.map((tarea, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="w-1/4">
                    <select
                      value={tarea.rubro}
                      onChange={(e) => handleTareaChange(idx, 'rubro', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    >
                      {RUBROS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Descripción de la tarea o renglón..."
                      value={tarea.descripcion_tarea}
                      onChange={(e) => handleTareaChange(idx, 'descripcion_tarea', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Importe ($)"
                      value={tarea.monto || ''}
                      onChange={(e) => handleTareaChange(idx, 'monto', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-right"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTarea(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No se han agregado renglones individuales (opcional).
            </p>
          )}
        </div>

        {/* Botón de Enviar */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span>Guardando en Base de Datos...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Guardar Orden de Provisión</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
