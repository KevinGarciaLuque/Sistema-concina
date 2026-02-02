import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {id, nombre, rol}
  const [loading, setLoading] = useState(true);

  const isAuth = !!user;

  async function login(usuario, password) {
    const { data } = await api.post("/auth/login", { usuario, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  // ✅ recupera sesión al recargar
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Como el JWT ya contiene rol/nombre, podrías guardar el user en localStorage.
    // Pero lo más seguro es guardarlo cuando haces login.
    // Aun así, si refrescas y perdiste user, lo reconstruimos desde un endpoint o desde storage.

    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      setUser(JSON.parse(rawUser));
      setLoading(false);
      return;
    }

    // fallback opcional: si no existe user, invalidamos token
    setLoading(false);
  }, []);

  // ✅ cada vez que user cambie, persistimos
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const value = useMemo(
    () => ({ user, isAuth, loading, login, logout }),
    [user, isAuth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
