// src/api/backup.js
import api from "./axios";

/**
 * Exporta la base de datos completa
 * @returns {Promise<Blob>} Archivo SQL para descargar
 */
export const exportarBackup = async () => {
  const response = await api.get("/backup/export", {
    responseType: "blob",
  });
  return response.data;
};

/**
 * Restaura la base de datos desde un archivo SQL
 * @param {string} sqlContent - Contenido del archivo SQL
 * @returns {Promise<Object>}
 */
export const restaurarBackup = async (sqlContent) => {
  const { data } = await api.post("/backup/restore", { sqlContent });
  return data;
};

/**
 * Lista los backups disponibles en el servidor
 * @returns {Promise<Array>}
 */
export const listarBackups = async () => {
  const { data } = await api.get("/backup/list");
  return Array.isArray(data?.backups) ? data.backups : [];
};

/**
 * Limpia datos transaccionales (órdenes, facturas, cajas) manteniendo datos maestros
 * @param {string} confirmar - Texto de confirmación "CONFIRMAR_LIMPIAR_DATOS"
 * @returns {Promise<Object>}
 */
export const limpiarDatos = async (confirmar) => {
  const { data } = await api.post("/backup/limpiar-datos", { confirmar });
  return data;
};
