// Frontend/src/components/MainLayout.jsx
import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button, Container, Navbar, Spinner } from "react-bootstrap";
import {
  FaBars,
  FaChartPie,
  FaCashRegister,
  FaUtensils,
  FaClipboardList,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaBook,
  FaCogs,
  FaSignOutAlt,
  FaUsers,
  FaKey,
  FaUserShield,
  FaDatabase,
  FaAddressCard,
  FaConciergeBell,
  FaPercent,
} from "react-icons/fa";

import { socket } from "../socket";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, permisos, loading, logout: authLogout, hasPermiso, hasAnyPermiso } = useAuth();

  // mobile offcanvas
  const [showMobile, setShowMobile] = useState(false);

  // desktop collapsed (persistente)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "false");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const rol = user?.rol || "sin rol";

  const logout = () => {
    authLogout();
    try { socket.disconnect(); } catch {}
    navigate("/login", { replace: true });
  };

  // ✅ Menú por permisos (mapea EXACTO a tu tabla permisos.clave)
  const menu = useMemo(
    () => [
      {
        title: "Principal",
        items: [
          {
            to: "/dashboard",
            label: "Dashboard",
            icon: <FaChartPie />,
            anyPerm: ["DASHBOARD.VER"],
          },
        ],
      },
      {
        title: "Operación",
        items: [
          {
            to: "/pos",
            label: "POS",
            icon: <FaCashRegister />,
            anyPerm: ["POS.USAR"],
          },
          {
            to: "/mesero",
            label: "Mesero",
            icon: <FaConciergeBell />,
            anyPerm: ["MESERO.USAR"],
          },
          {
            to: "/cocina",
            label: "Cocina (KDS)",
            icon: <FaUtensils />,
            anyPerm: ["COCINA.VER"],
          },
          {
            to: "/ordenes",
            label: "Órdenes",
            icon: <FaClipboardList />,
            anyPerm: ["ORDENES.VER"],
          },
        ],
      },
      {
        title: "Caja & Facturación",
        items: [
          {
            to: "/caja",
            label: "Caja",
            icon: <FaMoneyBillWave />,
            anyPerm: ["CAJA.ABRIR", "CAJA.CERRAR"],
          },
          {
            to: "/facturas",
            label: "Facturas",
            icon: <FaFileInvoiceDollar />,
            anyPerm: ["FACTURAS.VER", "FACTURAS.CREAR"],
          },
        ],
      },
      {
        title: "Auditoría",
        items: [
          {
            to: "/bitacora",
            label: "Bitácora",
            icon: <FaBook />,
            anyPerm: ["BITACORA.VER"],
          },
          {
            to: "/reportes",
            label: "Reportes",
            icon: <FaBook />,
            anyPerm: ["REPORTES.VER"],
          },
        ],
      },
      {
        title: "Administrador", //admiinistrador general del sistema, acceso a todo ///////////////////////////////
        items: [
          {
            to: "/admin",
            label: "Administración (Catálogo)",
            icon: <FaCogs />,
            anyPerm: ["CATALOGO.ADMIN"],
          },
          {
            to: "/admin/usuarios",
            label: "Usuarios",
            icon: <FaUsers />,
            anyPerm: ["USUARIOS.ADMIN"],
          },
          {
            to: "/admin/roles",
            label: "Roles",
            icon: <FaUserShield />,
            anyPerm: ["ROLES.ADMIN"],
          },
          {
            to: "/admin/permisos",
            label: "Permisos",
            icon: <FaKey />,
            anyPerm: ["PERMISOS.ADMIN"],
          },
          {
            to: "/admin/cai",
            label: "CAI",
            icon: <FaKey />,
            anyPerm: ["CAI.ADMIN"],
          },
          {
            to: "/admin/clientes",
            label: "Clientes",
            icon: <FaAddressCard />,
            anyPerm: ["CLIENTES.ADMIN"],
          },
          {
            to: "/admin/ajustes-precios",
            label: "Ajustes de Precio",
            icon: <FaPercent />,
            anyPerm: ["AJUSTES_PRECIOS.ADMIN"],
          },
          {
            to: "/admin/backup",
            label: "Backup BD",
            icon: <FaDatabase />,
            anyPerm: ["BACKUP.ADMIN"],
          },
        ],
      },
    ],
    [],
  );

  // ✅ Filtrado real por permisos (si tiene cualquiera de anyPerm)
  const menuVisible = useMemo(() => {
    if (!user) return [];
    return menu
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          const req = it.anyPerm || [];
          return req.length === 0 ? true : hasAnyPermiso(...req);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [menu, user, hasAnyPermiso]);

  // ancho de contenido
  const contentMaxWidth = 1600;
  const computedContentMaxWidth =
    typeof contentMaxWidth === "number" ? `${contentMaxWidth}px` : contentMaxWidth;

  // ✅ Si está cargando sesión, muestra loader elegante
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="text-center">
          <Spinner animation="border" />
          <div className="mt-2 text-muted">Cargando sesión…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", overflowX: "hidden" }}>
      {/* TOPBAR */}
      <Navbar
        className="border-bottom sticky-top"
        style={{ background: "linear-gradient(90deg, #0f172a 0%, #111827 100%)" }}
      >
        <Container fluid className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            {/* Mobile open */}
            <Button
              variant="outline-light"
              className="d-lg-none"
              onClick={() => setShowMobile(true)}
              aria-label="Abrir menú"
            >
              <FaBars />
            </Button>

            <div className="d-flex flex-column">
              <span className="fw-bold text-white">Sistema Cocina</span>
              <span className="text-white-50" style={{ fontSize: 12 }}>
                Acceso por permisos
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-block text-end">
              <div className="fw-bold text-white" style={{ lineHeight: 1.1 }}>
                {user?.nombre || "Usuario"}
              </div>
              <div className="text-white-50" style={{ fontSize: 12 }}>
                {rol} · {user?.usuario || ""}
              </div>
            </div>

            <Button variant="outline-danger" className="d-none d-sm-inline-flex" onClick={logout}>
              <FaSignOutAlt className="me-2" />
              Salir
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* DESKTOP */}
      <Container fluid className="py-3 px-2 px-md-3 px-xxl-4">
        <div className="d-lg-flex align-items-start gap-3" style={{ minHeight: "calc(100vh - 90px)" }}>
          {/* Sidebar desktop */}
          <div
            className="d-none d-lg-block"
            style={{
              flex: "0 0 auto",
              width: collapsed ? 86 : 300,
              transition: "width .18s ease",
            }}
          >
            <Sidebar
              mode="desktop"
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((v) => !v)}
              user={user}
              rol={rol}
              menuVisible={menuVisible}
              logout={logout}
            />
          </div>

          {/* Content */}
          <main className="flex-grow-1" style={{ minWidth: 0 }}>
            <div style={{ width: "100%", maxWidth: computedContentMaxWidth, margin: "0 auto" }}>
              <Outlet />
            </div>
          </main>
        </div>
      </Container>

      {/* Sidebar mobile */}
      <Sidebar
        mode="mobile"
        show={showMobile}
        setShow={setShowMobile}
        user={user}
        rol={rol}
        menuVisible={menuVisible}
        logout={logout}
      />
    </div>
  );
}
