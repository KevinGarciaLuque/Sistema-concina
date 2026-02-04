import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";

// Páginas
import Dashboard from "../pages/Dashboard";
import Pos from "../pages/Pos";
import Cocina from "../pages/Cocina";
import Ordenes from "../pages/Ordenes";
import Caja from "../pages/Caja";
import Facturas from "../pages/Facturas";
import Bitacora from "../pages/Bitacora";

// Admin
import Admin from "../pages/admin/Admin";
import ProductoModificadoresAdmin from "../pages/admin/ProductoModificadoresAdmin";

// Auth + Layout
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from "../components/MainLayout";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<Login />} />

      {/* Privado con Layout (Navbar + Sidebar) */}
      <Route
        element={
          <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Pos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ordenes"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Ordenes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/caja"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Caja />
            </ProtectedRoute>
          }
        />

        <Route
          path="/facturas"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Facturas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bitacora"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Bitacora />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/productos/:id/modificadores"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ProductoModificadoresAdmin />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Cocina (KDS) sin Layout */}
      <Route
        path="/cocina"
        element={
          <ProtectedRoute roles={["admin", "supervisor", "cocina"]}>
            <Cocina />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
