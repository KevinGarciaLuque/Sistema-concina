import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";

// Páginas
import Dashboard from "../pages/Dashboard";
import Pos from "../pages/POS/Pos";
import Cocina from "../pages/Cocina";
import Ordenes from "../pages/Ordenes";
import Caja from "../pages/Caja";
import Facturas from "../pages/Facturas";
import Bitacora from "../pages/Bitacora";

// Admin
import Admin from "../pages/admin/Admin";
import ProductoModificadoresAdmin from "../pages/admin/ProductoModificadoresAdmin";
import GestionUsuarios from "../pages/admin/GestionUsuarios"; // ✅ si ya lo creaste aquí

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
          <ProtectedRoute roles={["admin", "supervisor", "cajero", "cocina"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* POS */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Pos />
            </ProtectedRoute>
          }
        />

        {/* ✅ Cocina ahora CON layout */}
        <Route
          path="/cocina"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cocina"]}>
              <Cocina />
            </ProtectedRoute>
          }
        />

        {/* Órdenes (Monitor) */}
        <Route
          path="/ordenes"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Ordenes />
            </ProtectedRoute>
          }
        />

        {/* Caja */}
        <Route
          path="/caja"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Caja />
            </ProtectedRoute>
          }
        />

        {/* Facturas */}
        <Route
          path="/facturas"
          element={
            <ProtectedRoute roles={["admin", "supervisor", "cajero"]}>
              <Facturas />
            </ProtectedRoute>
          }
        />

        {/* Bitácora */}
        <Route
          path="/bitacora"
          element={
            <ProtectedRoute roles={["admin", "supervisor"]}>
              <Bitacora />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute roles={["admin"]}>
              <GestionUsuarios />
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

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
