// src/api/modificadores.js
import api from "./axios";

/** Normaliza respuestas: [] | {data:[]} | {modificadores:[]} | {rows:[]} */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.ok && Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.modificadores)) return payload.modificadores;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}


/** 🔁 Intento con fallback por si tu backend usa otra ruta */
async function withFallback(primary, fallback) {
  try {
    return await primary();
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 && fallback) return await fallback();
    throw e;
  }
}

/* =========================
   CRUD Modificadores
========================= */

export async function obtenerModificadores(params = {}) {
  const { data } = await api.get("/modificadores", { params });
  return toArray(data);
}

export async function crearModificador(body) {
  const { data } = await api.post("/modificadores", body);
  return data;
}

export async function actualizarModificador(id, body) {
  const { data } = await api.put(`/modificadores/${id}`, body);
  return data;
}

export async function eliminarModificador(id) {
  const { data } = await api.delete(`/modificadores/${id}`);
  return data;
}

export async function toggleModificador(id, activo) {
  const { data } = await api.patch(`/modificadores/${id}/activo`, { activo });
  return data;
}

/* ==========================================
   ✅ Modificadores por Producto
========================================== */

export async function obtenerModificadoresDeProducto(productoId) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/productos/${productoId}/modificadores`);
      return toArray(data);
    },
    async () => {
      const { data } = await api.get(`/modificadores/producto/${productoId}`);
      return toArray(data);
    },
  );
}

/* ==========================================
   CRUD Opciones de Modificador
========================================== */

export async function obtenerOpciones(modificadorId, params = {}) {
  const { data } = await api.get(`/modificadores/${modificadorId}/opciones`, { params });
  return toArray(data);
}

export async function crearOpcion(modificadorId, body) {
  const { data } = await api.post(`/modificadores/${modificadorId}/opciones`, body);
  return data;
}

export async function actualizarOpcion(modificadorId, opcionId, body) {
  const { data } = await api.put(`/modificadores/${modificadorId}/opciones/${opcionId}`, body);
  return data;
}

export async function eliminarOpcion(modificadorId, opcionId) {
  const { data } = await api.delete(`/modificadores/${modificadorId}/opciones/${opcionId}`);
  return data;
}

export async function toggleOpcion(modificadorId, opcionId, activo) {
  const { data } = await api.patch(`/modificadores/${modificadorId}/opciones/${opcionId}/activo`, { activo });
  return data;
}

/* ==========================================
   ✅ Modificadores por Producto
========================================== */

export async function guardarModificadoresDeProducto(
  productoId,
  modificadoresIds = [],
) {
  const payload = { modificadores: modificadoresIds.map(Number) };


  return withFallback(
    async () => {
      const { data } = await api.put(
        `/productos/${productoId}/modificadores`,
        payload,
      );
      return data;
    },
    async () => {
      const { data } = await api.put(
        `/modificadores/producto/${productoId}`,
        payload,
      );
      return data;
    },
  );
}
