import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Container, Navbar } from "react-bootstrap";
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
} from "react-icons/fa";
import { socket } from "../socket";
import Sidebar from "./Sidebar";

/** ✅ Lee user desde localStorage o sessionStorage */
function getStoredUser() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** ✅ Limpia sesión completa */
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // user sync
  const [user, setUser] = useState(() => getStoredUser());
  const rol = user?.rol || "sin rol";

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
  }, [location.pathname]);

  const logout = () => {
    clearSession();
    try {
      socket.disconnect();
    } catch {}
    navigate("/login", { replace: true });
  };

  // ✅ Menú por roles (listo para BD)
  const menu = useMemo(
    () => [
      {
        title: "Principal",
        roles: ["admin", "supervisor"],
        items: [
          {
            to: "/dashboard",
            label: "Dashboard",
            icon: <FaChartPie />,
            roles: ["admin", "supervisor"],
          },
        ],
      },
      {
        title: "Operación",
        roles: ["admin", "supervisor", "cajero", "cocina"],
        items: [
          {
            to: "/pos",
            label: "POS",
            icon: <FaCashRegister />,
            roles: ["admin", "supervisor", "cajero"],
          },
          {
            to: "/cocina",
            label: "Cocina (KDS)",
            icon: <FaUtensils />,
            roles: ["admin", "supervisor", "cocina"],
          },
          {
            to: "/ordenes",
            label: "Órdenes",
            icon: <FaClipboardList />,
            roles: ["admin", "supervisor"],
          },
        ],
      },
      {
        title: "Caja & Facturación",
        roles: ["admin", "supervisor", "cajero"],
        items: [
          {
            to: "/caja",
            label: "Caja",
            icon: <FaMoneyBillWave />,
            roles: ["admin", "supervisor", "cajero"],
          },
          {
            to: "/facturas",
            label: "Facturas",
            icon: <FaFileInvoiceDollar />,
            roles: ["admin", "supervisor", "cajero"],
          },
        ],
      },
      {
        title: "Auditoría",
        roles: ["admin", "supervisor"],
        items: [
          {
            to: "/bitacora",
            label: "Bitácora",
            icon: <FaBook />,
            roles: ["admin", "supervisor"],
          },
        ],
      },
      {
        title: "Administrador",
        roles: ["admin"],
        items: [
          {
            to: "/admin",
            label: "Administración (Catálogo)",
            icon: <FaCogs />,
            roles: ["admin"],
          },
          {
            to: "/admin/usuarios",
            label: "Usuarios",
            icon: <FaUsers />,
            roles: ["admin"],
          },
        ],
      },
    ],
    []
  );

  const menuVisible = useMemo(() => {
    if (!rol || rol === "sin rol") return [];
    return menu
      .filter((sec) => sec.roles.includes(rol))
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => it.roles.includes(rol)),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [menu, rol]);

  // ✅ Esto controla “cuánto” se abre el contenido en escritorio:
  // - 1600px se ve MUY bien y aprovecha la pantalla
  // - si lo quieres 100% full, ponlo en "100%"
  const contentMaxWidth = 1600; // <-- puedes subirlo a 1800 o cambiarlo a "100%"

  const computedContentMaxWidth =
    typeof contentMaxWidth === "number" ? `${contentMaxWidth}px` : contentMaxWidth;

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
                Acceso por rol
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-block text-end">
              <div className="fw-bold text-white" style={{ lineHeight: 1.1 }}>
                {user?.nombre || "Usuario"}
              </div>
              <div className="text-white-50" style={{ fontSize: 12 }}>
                {rol}
              </div>
            </div>

            {/* Si quieres ocultarlo en desktop y dejarlo solo móvil/tablet: cambia a "d-lg-none" */}
            <Button variant="outline-danger" className="d-none d-sm-inline-flex" onClick={logout}>
              <FaSignOutAlt className="me-2" />
              Salir
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* ✅ DESKTOP: FLEX NO-WRAP (no se baja) + más ancho */}
      <Container fluid className="py-3 px-2 px-md-3 px-xxl-4">
        <div
          className="d-lg-flex align-items-start gap-3"
          style={{ minHeight: "calc(100vh - 90px)" }}
        >
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
            <div
              style={{
                width: "100%",
                maxWidth: computedContentMaxWidth,
                margin: "0 auto",
              }}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </Container>

      {/* Sidebar mobile (Offcanvas) */}
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
