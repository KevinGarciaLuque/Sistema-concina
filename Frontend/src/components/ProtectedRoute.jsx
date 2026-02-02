import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuth, user, loading } = useAuth();

  if (loading) return null; // puedes poner un loader
  if (!isAuth) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user?.rol)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
