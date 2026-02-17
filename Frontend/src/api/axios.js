// src/api/axios.js
import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

// 1) quita / al final
let base = rawBase.replace(/\/+$/, "");

// 2) si ya termina en /api, no lo dupliques
if (base.endsWith("/api")) {
  // ok, ya viene con /api
} else {
  base = `${base}/api`;
}

const api = axios.create({
  baseURL: base,
});

function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    null
  );
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // opcional: limpiar tokens para forzar re-login
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
    }
    return Promise.reject(err);
  },
);


export default api;
