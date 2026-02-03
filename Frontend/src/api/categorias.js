// src/api/categorias.js
import api from "./axios";

export const obtenerCategorias = async ({ todas = false } = {}) => {
  const { data } = await api.get(`/categorias${todas ? "?todas=1" : ""}`);
  return data;
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
  const { data } = await api.patch("/categorias/orden", {
    orden: ordenArray,
  });
  return data;
};

export const eliminarCategoria = async (id) => {
  const { data } = await api.delete(`/categorias/${id}`);
  return data;
};
