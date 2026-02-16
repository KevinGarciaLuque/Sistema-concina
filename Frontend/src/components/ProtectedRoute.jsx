import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  roles = [],
  permiso = null,
  permisos = [],
  all = false, // true = requiere TODOS, false = requiere CUALQUIERA
  redirectTo = "/dashboard",
}) {
  const { isAuth, user, loading, hasPermiso, hasAnyPermiso } = useAuth();

  if (loading) return null;
  if (!isAuth) return <Navigate to="/login" replace />;

  // Roles (opcional)
  if (roles.length > 0 && !roles.includes(user?.rol)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Permisos
  const lista = [
    ...(permiso ? [permiso] : []),
    ...(Array.isArray(permisos) ? permisos : []),
  ].filter(Boolean);

  if (lista.length > 0) {
    const ok = all ? lista.every((p) => hasPermiso(p)) : hasAnyPermiso(...lista);
    if (!ok) return <Navigate to={redirectTo} replace />;
  }

  return children;
}
