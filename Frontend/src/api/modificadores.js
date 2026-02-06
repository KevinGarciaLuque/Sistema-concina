import api from "./axios";

/** Normaliza respuestas: [] | {data:[]} | {modificadores:[]} | {rows:[]} */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
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
  const { data } = await api.get("/api/modificadores", { params });
  return toArray(data);
}

export async function crearModificador(body) {
  const { data } = await api.post("/api/modificadores", body);
  return data;
}

export async function actualizarModificador(id, body) {
  const { data } = await api.put(`/api/modificadores/${id}`, body);
  return data;
}

export async function eliminarModificador(id) {
  const { data } = await api.delete(`/api/modificadores/${id}`);
  return data;
}

export async function toggleModificador(id, activo) {
  const { data } = await api.patch(`/api/modificadores/${id}/activo`, { activo });
  return data;
}

/* ==========================================
   ✅ Modificadores por Producto (lo que te faltaba)
   Usado por: ProductoModificadoresAdmin.jsx
========================================== */

/**
 * Obtiene los modificadores asignados a un producto.
 * Backend típico:
 *  - GET /api/productos/:id/modificadores
 * Fallback:
 *  - GET /api/modificadores/producto/:id
 */
export async function obtenerModificadoresDeProducto(productoId) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/api/productos/${productoId}/modificadores`);
      return toArray(data);
    },
    async () => {
      const { data } = await api.get(`/api/modificadores/producto/${productoId}`);
      return toArray(data);
    }
  );
}

/**
 * Guarda (reemplaza) los modificadores de un producto.
 * Espera normalmente:
 *  - PUT /api/productos/:id/modificadores  body: { modificadores: [1,2,3] }
 * Fallback:
 *  - PUT /api/modificadores/producto/:id  body: { modificadores: [1,2,3] }
 *
 * @param {number|string} productoId
 * @param {Array<number|string>} modificadoresIds
 */
export async function guardarModificadoresDeProducto(productoId, modificadoresIds = []) {
  const payload = { modificadores: modificadoresIds };

  return withFallback(
    async () => {
      const { data } = await api.put(`/api/productos/${productoId}/modificadores`, payload);
      return data;
    },
    async () => {
      const { data } = await api.put(`/api/modificadores/producto/${productoId}`, payload);
      return data;
    }
  );
}
