import React from 'react';
import { Calendar, User, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  ejercicio: number | undefined;
  setEjercicio: (ej: number | undefined) => void;
  userEmail: string;
}

export const Navbar: React.FC<NavbarProps> = ({ ejercicio, setEjercicio, userEmail }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Sistema Oficial Activo
        </span>
        <h2 className="text-sm font-semibold text-slate-700 hidden md:block">
          Plataforma de Auditoría & Seguimiento Financiero-Electoral
        </h2>
      </div>

      <div className="flex items-center space-x-6">
        {/* Selector de Ejercicio */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          <span className="text-xs font-medium text-slate-600">Ejercicio:</span>
          <select
            value={ejercicio || ''}
            onChange={(e) => setEjercicio(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none pr-2 cursor-pointer"
          >
            <option value="">Consolidado (Todos)</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        {/* Perfil */}
        <div className="flex items-center space-x-2 text-slate-700 border-l pl-4 border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-900 leading-none">{userEmail}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Rol: Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
};
