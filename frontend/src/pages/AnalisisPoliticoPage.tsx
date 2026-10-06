import React, { useEffect, useState } from 'react';
import { Vote, TrendingUp, Search, School } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { electoralService } from '../services/api';

const PARTY_COLORS: Record<string, string> = {
  'LA LIBERTAD AVANZA': '#7c3aed',
  'UNION POR LA PATRIA': '#0284c7',
  'JUNTOS POR EL CAMBIO': '#eab308',
  'HACEMOS POR NUESTRO PAIS': '#1e3a8a',
  'FRENTE DE IZQUIERDA Y DE TRABAJADORES - UNIDAD': '#dc2626',
  'OTROS': '#94a3b8'
};

const getPartyColor = (name: string, fallback?: string): string => {
  const up = (name || '').toUpperCase();
  for (const [k, v] of Object.entries(PARTY_COLORS)) {
    if (up.includes(k)) return v;
  }
  return fallback || '#7c3aed';
};

export const AnalisisPoliticoPage: React.FC = () => {
  const [eleccion, setEleccion] = useState<'ballotage_2da_vuelta' | 'generales_1ra_vuelta'>('ballotage_2da_vuelta');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTable, setSearchTable] = useState('');

  useEffect(() => {
    setLoading(true);
    electoralService.getAnalisis(eleccion).then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setLoading(false);
    });
  }, [eleccion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const partidos_totales = data?.partidos_totales || [];
  const correlacion_escuelas = data?.correlacion_escuelas || [];

  const filteredEscuelas = correlacion_escuelas.filter((esc: any) => {
    const term = searchTable.toLowerCase();
    return (esc.escuela_nombre || '').toLowerCase().includes(term) ||
           (esc.cue || '').toLowerCase().includes(term) ||
           (esc.circuito_id || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Análisis Político-Presupuestario</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cruce de resultados electorales presidenciales y asignación de fondos de mantenimiento en Corrientes (Distrito 05)
          </p>
        </div>

        {/* Selector de Instancia Electoral */}
        <div className="inline-flex bg-slate-200 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setEleccion('ballotage_2da_vuelta')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              eleccion === 'ballotage_2da_vuelta'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ballotage Presidencial (2ª Vuelta)
          </button>
          <button
            onClick={() => setEleccion('generales_1ra_vuelta')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              eleccion === 'generales_1ra_vuelta'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Elecciones Generales (1ª Vuelta)
          </button>
        </div>
      </div>

      {/* Resultados Oficiales de Corrientes por Partido con Color Identificatorio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {partidos_totales.map((p: any, idx: number) => {
          const color = p.color || getPartyColor(p.partido);
          return (
            <div 
              key={idx} 
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden"
              style={{ borderTopWidth: 4, borderTopColor: color }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate" title={p.partido}>
                {p.partido || 'Agrupación'}
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">{p.candidato || 'Fórmula'}</h3>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black" style={{ color }}>
                  {Number(p.porcentaje || 0).toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">{Number(p.votos || 0).toLocaleString('es-AR')} votos</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, Number(p.porcentaje || 0))}%`, backgroundColor: color }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de Correlación: Inversión en Escuela vs % de Votos */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Inversión en Edificios Escolares vs. Desempeño Electoral Oficial</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparación directa de fondos ejecutados y porcentaje obtenido en las mesas de votación del establecimiento
            </p>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={correlacion_escuelas.slice(0, 20)} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="escuela_nombre" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis yAxisId="left" orientation="left" stroke="#0284c7" tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
              <YAxis yAxisId="right" orientation="right" stroke="#7c3aed" tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value: any, name: string) => [
                name === 'total_mantenimiento' ? `$${Number(value).toLocaleString('es-AR')}` : `${value}%`,
                name === 'total_mantenimiento' ? 'Mantenimiento Invertido' : '% Votos Ganador'
              ]} />
              <Legend verticalAlign="top" height={36} />
              <Bar yAxisId="left" dataKey="total_mantenimiento" name="total_mantenimiento" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="votos_partido_oficial" name="votos_partido_oficial" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla Detallada por Circuito */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Padrón Electoral Oficial por Escuela — Circuito y Gasto
            </h2>
            <p className="text-xs text-slate-500">
              Solo se listan escuelas habilitadas como centro de votación oficial en Corrientes
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar escuela o circuito..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="px-4 py-3">Establecimiento Escolar</th>
                <th className="px-4 py-3">CUE</th>
                <th className="px-4 py-3">Circuito Electoral</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3 text-right">Inversión Edilicia</th>
                <th className="px-4 py-3 text-center">Fuerza con Mayor Voto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEscuelas.map((esc: any, idx: number) => {
                const colorGanador = getPartyColor(esc.partido_ganador);
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <School className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="font-bold text-slate-900">{esc.escuela_nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-600">{esc.cue}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100">
                        {esc.circuito_id || 'Capital'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{esc.departamento || 'Capital'}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-600 text-sm">
                      ${Number(esc.total_mantenimiento || 0).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span 
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs inline-block"
                        style={{ backgroundColor: colorGanador }}
                      >
                        {esc.partido_ganador} ({Number(esc.votos_partido_oficial).toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
