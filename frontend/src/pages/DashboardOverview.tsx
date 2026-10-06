import React, { useEffect, useState } from 'react';
import { DollarSign, FileCheck, School, Building, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardService } from '../services/api';

interface DashboardProps {
  ejercicio?: number;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ ejercicio }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardService.getSummary(ejercicio).then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setLoading(false);
    });
  }, [ejercicio]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { stats, gastos_mensuales, top_empresas, gastos_departamento } = data;

  const totalInv = Number(stats?.total_invertido || 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel Ejecutivo de Mantenimiento</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitoreo y análisis de ejecución presupuestaria provincial ({stats?.ejercicio_activo || 'Todos'})
          </p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inversión Total</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              ${totalInv.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Órdenes Provisión</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats?.cantidad_ordenes || 0} emitidas</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <School className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Escuelas Asistidas</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats?.escuelas_intervenidas || 0} edificios</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedores CUIT</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats?.empresas_adjudicadas || 0} empresas</p>
          </div>
        </div>
      </div>

      {/* Gráficos de Evolución y Territorio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inversión por Departamento */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Inversión por Departamento de Corrientes</span>
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastos_departamento || []} margin={{ top: 10, right: 10, left: 15, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="departamento" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value: any) => [`$${Number(value || 0).toLocaleString('es-AR')}`, 'Monto']} />
                <Bar dataKey="total_monto" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolución Temporal de Gasto */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Ritmo de Ejecución Presupuestaria</span>
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastos_mensuales || []} margin={{ top: 10, right: 10, left: 15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value: any) => [`$${Number(value || 0).toLocaleString('es-AR')}`, 'Gasto Trimestral']} />
                <Bar dataKey="monto" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Auditoría de Contratistas / Concentración */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Concentración de Proveedores (Top por Monto)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Empresas con mayor volumen de órdenes adjudicadas</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Empresa / Razón Social</th>
                <th className="px-6 py-3 font-semibold">CUIT</th>
                <th className="px-6 py-3 font-semibold text-center">Órdenes</th>
                <th className="px-6 py-3 font-semibold text-right">Monto Acumulado</th>
                <th className="px-6 py-3 font-semibold text-right">% Cuota Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(top_empresas || []).map((emp: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{emp.razon_social}</span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{String(emp.cuit || 'S/D')}</td>
                  <td className="px-6 py-3.5 text-center font-semibold text-slate-800">{emp.cantidad_ordenes}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-blue-600">
                    ${Number(emp.total_monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {Number(emp.porcentaje_del_total || 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
