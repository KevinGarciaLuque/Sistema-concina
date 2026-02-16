import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { id, nombre, usuario, rol, rol_id }
  const [permisos, setPermisos] = useState([]);  // ['POS.USAR', 'COCINA.VER', ...]
  const [loading, setLoading] = useState(true);

  const isAuth = !!user;

  async function login(usuario, password) {
    const { data } = await api.post("/auth/login", { usuario, password });

    // Espera: { ok, token, user, permisos }
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user || null));
    localStorage.setItem("permisos", JSON.stringify(data.permisos || []));

    setUser(data.user || null);
    setPermisos(data.permisos || []);

    return data.user;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permisos");
    setUser(null);
    setPermisos([]);
  }

  // ✅ Recupera sesión al recargar (validando el token contra /api/me)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // (Opcional) pinta rápido desde storage mientras valida
    try {
      const rawUser = localStorage.getItem("user");
      const rawPerm = localStorage.getItem("permisos");
      if (rawUser) setUser(JSON.parse(rawUser));
      if (rawPerm) setPermisos(JSON.parse(rawPerm));
    } catch {
      // si algo está corrupto, limpias
      logout();
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Tu backend: app.use("/api/me", meRoutes)
        // meRoutes: GET "/" => { ok, user, permisos }
        const { data } = await api.get("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data?.ok) {
          const u = data.user || null;
          const p = data.permisos || [];

          setUser(u);
          setPermisos(p);

          localStorage.setItem("user", JSON.stringify(u));
          localStorage.setItem("permisos", JSON.stringify(p));
        } else {
          logout();
        }
      } catch (e) {
        // Token inválido/expirado o backend caído
        logout();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helpers útiles
  const hasPermiso = (clave) => permisos.includes(String(clave));
  const hasAnyPermiso = (...claves) => claves.some((c) => permisos.includes(String(c)));

  const value = useMemo(
    () => ({
      user,
      permisos,
      isAuth,
      loading,
      login,
      logout,
      hasPermiso,
      hasAnyPermiso,
    }),
    [user, permisos, isAuth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
