import api from "./axios";

// Salud
export const cajaHealth = () => api.get("/api/caja/health");

// Sesión activa (del usuario logueado)
export const obtenerSesionActiva = async () => {
  const { data } = await api.get("/api/caja/sesion-activa");
  return data?.data || null;
};

// Abrir caja
export const abrirCaja = async (monto_apertura) => {
  const { data } = await api.post("/api/caja/abrir", { monto_apertura });
  return data;
};

// Cerrar caja
export const cerrarCaja = async ({ sesion_id, monto_cierre }) => {
  const { data } = await api.post("/api/caja/cerrar", { sesion_id, monto_cierre });
  return data;
};

// Listado (admin/supervisor)
export const listarSesionesCaja = async (params = {}) => {
  const { data } = await api.get("/api/caja/sesiones", { params });
  return Array.isArray(data?.data) ? data.data : [];
};

// Resumen por sesión
export const obtenerResumenCaja = async (sesionId) => {
  const { data } = await api.get(`/api/caja/sesiones/${sesionId}/resumen`);
  return data?.data || null;
};
