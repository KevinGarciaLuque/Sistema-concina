// src/api/categorias.js
import api from "./axios";

/* ========= Helpers ========= */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categorias)) return payload.categorias;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export const obtenerCategorias = async ({ todas = false } = {}) => {
  const { data } = await api.get(`/categorias${todas ? "?todas=1" : ""}`);

  // ✅ siempre array para evitar "cats is not iterable"
  return toArray(data);
};

export const crearCategoria = async (payload) => {
  const { data } = await api.post("/categorias", payload);
  return data;
};

export const actualizarCategoria = async (id, payload) => {
  const { data } = await api.put(`/categorias/${id}`, payload);
  return data;
};

export const cambiarActivoCategoria = async (id, activo) => {
  const { data } = await api.patch(`/categorias/${id}/activo`, { activo });
  return data;
};

export const actualizarOrdenCategorias = async (ordenArray) => {
  const { data } = await api.patch("/categorias/orden", { orden: ordenArray });
  return data;
};

export const eliminarCategoria = async (id) => {
  const { data } = await api.delete(`/categorias/${id}`);
  return data;
};
