// src/routes/AppRoutes.jsx
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
import GestionUsuarios from "../pages/admin/GestionUsuarios";
import Reportes from "../pages/admin/Reportes";

// Auth + Layout
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from "../components/MainLayout";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<Login />} />

      {/* Privado con Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute permiso="DASHBOARD.VER">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute permiso="POS.USAR">
              <Pos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cocina"
          element={
            <ProtectedRoute permiso="COCINA.VER">
              <Cocina />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ordenes"
          element={
            <ProtectedRoute permiso="ORDENES.VER">
              <Ordenes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/caja"
          element={
            <ProtectedRoute permisos={["CAJA.ABRIR", "CAJA.CERRAR"]}>
              <Caja />
            </ProtectedRoute>
          }
        />

        <Route
          path="/facturas"
          element={
            <ProtectedRoute permisos={["FACTURAS.VER", "FACTURAS.CREAR"]}>
              <Facturas />
            </ProtectedRoute>
          }
        />

        {/* ✅ NUEVO: Reportes */}
        <Route
          path="/reportes"
          element={
            <ProtectedRoute permiso="REPORTES.VER">
              <Reportes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bitacora"
          element={
            <ProtectedRoute permiso="BITACORA.VER">
              <Bitacora />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute permiso="CATALOGO.ADMIN">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute permiso="USUARIOS.ADMIN">
              <GestionUsuarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/productos/:id/modificadores"
          element={
            <ProtectedRoute permiso="CATALOGO.ADMIN">
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
