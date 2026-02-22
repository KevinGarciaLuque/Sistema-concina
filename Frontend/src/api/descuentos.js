import api from "./axios";

export const descuentosAPI = {
  listar: () => api.get("/descuentos"),
  crear: (data) => api.post("/descuentos", data),
  actualizar: (id, data) => api.put(`/descuentos/${id}`, data),
  eliminar: (id) => api.delete(`/descuentos/${id}`),
};
