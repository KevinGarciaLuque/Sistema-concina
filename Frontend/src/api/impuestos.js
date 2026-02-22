import api from "./axios";

export const impuestosAPI = {
  listar: () => api.get("/impuestos"),
  crear: (data) => api.post("/impuestos", data),
  actualizar: (id, data) => api.put(`/impuestos/${id}`, data),
  eliminar: (id) => api.delete(`/impuestos/${id}`),
};
