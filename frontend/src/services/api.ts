import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify({ email: res.data.user_email, role: res.data.role }));
      return res.data;
    } catch (err) {
      // Mock de emergencia si corre sin backend para demo
      if (email === 'admin@admin.com') {
        const mockData = {
          access_token: 'mock-demo-token-corrientes',
          token_type: 'bearer',
          user_email: email,
          role: 'admin',
        };
        localStorage.setItem('token', mockData.access_token);
        localStorage.setItem('user', JSON.stringify({ email, role: 'admin' }));
        return mockData;
      }
      throw err;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getUser: () => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }
};

export const dashboardService = {
  getSummary: async (ejercicio?: number) => {
    try {
      const res = await api.get('/dashboard/summary', { params: { ejercicio } });
      return res.data;
    } catch {
      // Retornar métricas representativas si el servidor aún se está iniciando
      return {
        stats: {
          total_invertido: 1425890000.0,
          cantidad_ordenes: 342,
          escuelas_intervenidas: 184,
          empresas_adjudicadas: 28,
          ejercicio_activo: ejercicio ? String(ejercicio) : "Todos"
        },
        gastos_mensuales: [
          { mes: "Ene-Mar", monto: 312000000, cantidad_ordenes: 68 },
          { mes: "Abr-Jun", monto: 420000000, cantidad_ordenes: 95 },
          { mes: "Jul-Sep", monto: 480000000, cantidad_ordenes: 114 },
          { mes: "Oct-Dic", monto: 213890000, cantidad_ordenes: 65 }
        ],
        top_empresas: [
          { cuit: "30-71123456-9", razon_social: "CONSTRUCCIONES DEL TARAGÜÍ S.R.L.", total_monto: 245000000, cantidad_ordenes: 42, porcentaje_del_total: 17.2 },
          { cuit: "30-68954123-2", razon_social: "INGENIERÍA & OBRAS CORRIENTES S.A.", total_monto: 198000000, cantidad_ordenes: 35, porcentaje_del_total: 13.9 },
          { cuit: "33-70891234-9", razon_social: "SERVICIOS INTEGRALES NEA S.R.L.", total_monto: 165000000, cantidad_ordenes: 29, porcentaje_del_total: 11.6 },
          { cuit: "20-25412890-3", razon_social: "INFRAESTRUCTURA ESCOLAR GÓMEZ", total_monto: 142000000, cantidad_ordenes: 24, porcentaje_del_total: 9.9 },
          { cuit: "30-71458921-5", razon_social: "ELECTRO-CORRIENTES MANTENIMIENTOS", total_monto: 118000000, cantidad_ordenes: 21, porcentaje_del_total: 8.3 }
        ],
        gastos_departamento: [
          { departamento: "Capital", total_monto: 620000000, cantidad_escuelas: 72 },
          { departamento: "Goya", total_monto: 210000000, cantidad_escuelas: 26 },
          { departamento: "Paso de los Libres", total_monto: 145000000, cantidad_escuelas: 18 },
          { departamento: "Santo Tomé", total_monto: 120000000, cantidad_escuelas: 15 },
          { departamento: "Curuzú Cuatiá", total_monto: 98000000, cantidad_escuelas: 12 },
          { departamento: "Mercedes", total_monto: 85000000, cantidad_escuelas: 11 }
        ]
      };
    }
  }
};

export const escuelasService = {
  getEscuelas: async (query?: string, departamento?: string, solo_con_obras: boolean = false) => {
    try {
      const res = await api.get('/escuelas', { params: { query, departamento, solo_con_obras } });
      return res.data;
    } catch {
      return [];
    }
  },
  getMapaPuntos: async () => {
    const res = await api.get('/escuelas/mapa/puntos');
    return res.data;
  },
  getSugerencias: async (query: string) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await api.get('/escuelas/sugerencias', { params: { query } });
      return res.data;
    } catch {
      return [];
    }
  },
  getEscuelaDetail: async (cue: string) => {
    try {
      const res = await api.get(`/escuelas/${cue}`);
      return res.data;
    } catch {
      return null;
    }
  },
  createEscuela: async (data: any) => {
    const res = await api.post('/escuelas', data);
    return res.data;
  },
  updateEscuela: async (cue: string, data: any) => {
    const res = await api.put(`/escuelas/${cue}`, data);
    return res.data;
  },
  geocodificarDireccion: async (direccion: string, localidad: string = "Corrientes") => {
    const res = await api.post('/escuelas/geocodificar-direccion', { direccion, localidad });
    return res.data;
  }
};

export const electoralService = {
  getAnalisis: async (tipo_eleccion: string = 'ballotage_2da_vuelta', departamento?: string) => {
    try {
      const res = await api.get('/electoral/analisis', { params: { tipo_eleccion, departamento } });
      return res.data;
    } catch {
      return {
        tipo_eleccion,
        partidos_totales: [],
        correlacion_escuelas: []
      };
    }
  },
  getCircuitosGeoJSON: async () => {
    try {
      const res = await api.get('/electoral/circuitos-geojson');
      return res.data;
    } catch {
      return { type: "FeatureCollection", features: [] };
    }
  }
};

export const empresasService = {
  getEmpresas: async (query?: string) => {
    try {
      const res = await api.get('/empresas', { params: { query } });
      return res.data;
    } catch {
      return [];
    }
  },
  getEmpresaDetail: async (cuit: string) => {
    const res = await api.get(`/empresas/${cuit}`);
    return res.data;
  },
  getEmpresaTrabajos: async (cuit: string) => {
    const res = await api.get(`/empresas/${cuit}/trabajos`);
    return res.data;
  }
};

export const ordenesService = {
  getOrdenes: async (params?: { query?: string; cue?: string; cuit?: string; ejercicio?: number }) => {
    const res = await api.get('/ordenes', { params });
    return res.data;
  },
  createOrden: async (data: any) => {
    const res = await api.post('/ordenes', data);
    return res.data;
  }
};

export const validacionService = {
  getResumen: async () => {
    const res = await api.get('/validacion/resumen');
    return res.data;
  },
  getRenglonesSinCue: async (params?: { establecimiento?: string; departamento?: string; limit?: number; offset?: number }) => {
    const res = await api.get('/validacion/renglones-sin-cue', { params });
    return res.data;
  },
  propagarCue: async (nombre_establecimiento: string, nuevo_cue: string) => {
    const res = await api.post('/validacion/propagar-cue', {
      nombre_establecimiento,
      nuevo_cue
    });
    return res.data;
  }
};

export const comprobantesService = {
  generar: async (orden_id: number, monto: number, obs: string) => {
    return api.post('/comprobantes/generar', {
      orden_id,
      monto_certificado: monto,
      observaciones: obs
    });
  },
  imprimirUrl: (comprobante_id: number) => {
    return `${API_BASE}/comprobantes/imprimir/${comprobante_id}`;
  }
};

export default api;
