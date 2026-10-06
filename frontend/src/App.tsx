import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { EscuelasMapPage } from './pages/EscuelasMapPage';
import { EscuelasAdminPage } from './pages/EscuelasAdminPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { AnalisisPoliticoPage } from './pages/AnalisisPoliticoPage';
import { ComprobantesPage } from './pages/ComprobantesPage';
import { CargarOPPage } from './pages/CargarOPPage';
import { ValidacionDatosPage } from './pages/ValidacionDatosPage';
import { authService } from './services/api';

export function App() {
  const [user, setUser] = useState<any | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [ejercicio, setEjercicio] = useState<number | undefined>(undefined);

  useEffect(() => {
    const existingUser = authService.getUser();
    if (existingUser) {
      setUser(existingUser);
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser({ email: userData.user_email, role: userData.role });
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar fijo */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar
          ejercicio={ejercicio}
          setEjercicio={setEjercicio}
          userEmail={user.email}
        />

        <main className="flex-1 p-8 mt-16 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardOverview ejercicio={ejercicio} />}
          {currentTab === 'mapa' && <EscuelasMapPage />}
          {currentTab === 'cargar-op' && <CargarOPPage />}
          {currentTab === 'validacion' && <ValidacionDatosPage />}
          {currentTab === 'escuelas' && <EscuelasAdminPage />}
          {currentTab === 'empresas' && <EmpresasPage />}
          {currentTab === 'electoral' && <AnalisisPoliticoPage />}
          {currentTab === 'comprobantes' && <ComprobantesPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
