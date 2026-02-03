// src/api/modificadores.js
import api from "./axios";

// ===== Modificadores =====
export const obtenerModificadores = async ({ todos = true } = {}) => {
  // si después quieres filtrar solo activos, lo hacemos con query
  const { data } = await api.get(`/modificadores${todos ? "" : "?activos=1"}`);
  return data;
};

export const crearModificador = async (payload) => {
  const { data } = await api.post("/modificadores", payload);
  return data;
};

export const actualizarModificador = async (id, payload) => {
  const { data } = await api.put(`/modificadores/${id}`, payload);
  return data;
};

export const cambiarActivoModificador = async (id, activo) => {
  const { data } = await api.patch(`/modificadores/${id}/activo`, { activo });
  return data;
};

export const eliminarModificador = async (id) => {
  const { data } = await api.delete(`/modificadores/${id}`);
  return data;
};

// ===== Opciones =====
export const obtenerOpciones = async (modificadorId) => {
  const { data } = await api.get(`/modificadores/${modificadorId}/opciones`);
  return data;
};

export const crearOpcion = async (modificadorId, payload) => {
  const { data } = await api.post(
    `/modificadores/${modificadorId}/opciones`,
    payload,
  );
  return data;
};

export const actualizarOpcion = async (opcionId, payload) => {
  const { data } = await api.put(
    `/modificadores/opciones/${opcionId}`,
    payload,
  );
  return data;
};

export const cambiarActivoOpcion = async (opcionId, activo) => {
  const { data } = await api.patch(
    `/modificadores/opciones/${opcionId}/activo`,
    { activo },
  );
  return data;
};

export const eliminarOpcion = async (opcionId) => {
  const { data } = await api.delete(`/modificadores/opciones/${opcionId}`);
  return data;
};


export const obtenerModificadoresDeProducto = async (productoId) => {
  const { data } = await api.get(`/modificadores/producto/${productoId}`);
  return data; // [modificador_id, ...]
};

export const guardarModificadoresDeProducto = async (
  productoId,
  modificadores,
) => {
  const { data } = await api.put(`/modificadores/producto/${productoId}`, {
    modificadores,
  });
  return data;
};
