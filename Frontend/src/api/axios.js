// src/api/axios.js
import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

// 1) quita / al final
let base = String(rawBase).replace(/\/+$/, "");

// 2) evita duplicar /api
// - si termina en /api -> ok
// - si termina en /api/ -> ya lo quitamos arriba
if (!base.endsWith("/api")) {
  base = `${base}/api`;
}

const api = axios.create({
  baseURL: base,
  timeout: 20000,
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

// Request: agrega token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: manejo de 401 y log útil
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // Log corto para depurar (no rompe nada)
    try {
      const method = err?.config?.method?.toUpperCase();
      const url = err?.config?.url;
      // eslint-disable-next-line no-console
      console.warn("[API ERROR]", status, method, url, err?.response?.data || err?.message);
    } catch {}

    if (status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      // opcional: redirigir al login
      // window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;
