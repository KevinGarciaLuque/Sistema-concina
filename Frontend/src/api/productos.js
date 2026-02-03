// src/api/productos.js
import api from "./axios";

export const obtenerProductos = async ({
  activo,
  en_menu,
  categoria_id,
} = {}) => {
  const params = new URLSearchParams();
  if (activo !== undefined && activo !== null)
    params.append("activo", String(activo));
  if (en_menu !== undefined && en_menu !== null)
    params.append("en_menu", String(en_menu));
  if (
    categoria_id !== undefined &&
    categoria_id !== null &&
    categoria_id !== ""
  ) {
    params.append("categoria_id", String(categoria_id));
  }

  const qs = params.toString();
  const { data } = await api.get(`/productos${qs ? `?${qs}` : ""}`);
  return data;
};

export const crearProducto = async (payload) => {
  const { data } = await api.post("/productos", payload);
  return data; // { id }
};

export const actualizarProducto = async (id, payload) => {
  const { data } = await api.put(`/productos/${id}`, payload);
  return data;
};

export const subirImagenProducto = async (id, file) => {
  const formData = new FormData();
  formData.append("imagen", file);

  const { data } = await api.post(`/productos/${id}/imagen`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { ok, imagen_url }
};


export const eliminarProducto = async (id) => {
  const { data } = await api.delete(`/productos/${id}`);
  return data;
};
