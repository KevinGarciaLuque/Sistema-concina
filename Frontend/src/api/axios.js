// src/api/axios.js
import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || "http://localhost:4000";
const base = rawBase.replace(/\/+$/, ""); // quita trailing /

const api = axios.create({
  baseURL: `${base}/api`,
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
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
