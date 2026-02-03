import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Pos from "./pages/Pos";
import Cocina from "./pages/Cocina";
import Admin from "./pages/admin/Admin";


import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import ProductoModificadoresAdmin from "./pages/admin/ProductoModificadoresAdmin";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/pos"
            element={
              <ProtectedRoute roles={["cajero", "admin", "supervisor"]}>
                <Pos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cocina"
            element={
              <ProtectedRoute roles={["cocina", "admin"]}>
                <Cocina />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin", "supervisor"]}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/productos/:id/modificadores"
            element={
              <ProtectedRoute roles={["admin", "supervisor"]}>
                <ProductoModificadoresAdmin />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
