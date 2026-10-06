import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Building2, 
  Vote, 
  FileText, 
  LogOut, 
  School,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel Ejecutivo', icon: LayoutDashboard },
    { id: 'mapa', label: 'Mapa de Escuelas', icon: MapPin },
    { id: 'cargar-op', label: 'Cargar OP', icon: PlusCircle },
    { id: 'validacion', label: 'Calidad de Datos', icon: ShieldCheck },
    { id: 'escuelas', label: 'Gestión Escuelas', icon: School },
    { id: 'empresas', label: 'Contratistas (CUIT)', icon: Building2 },
    { id: 'electoral', label: 'Análisis Político', icon: Vote },
    { id: 'comprobantes', label: 'Comprobantes (Fase 2)', icon: FileText },
  ];


  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 shadow-xl border-r border-slate-800 z-30">
      {/* Header institucional */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
          <School className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-wide text-white">Mantenimiento Escolar</h1>
          <p className="text-xs text-blue-400 font-medium">Gobierno de Corrientes</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
          Módulos Principales
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer usuario */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-colors border border-red-900/30"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
