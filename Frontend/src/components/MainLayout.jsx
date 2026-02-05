import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Container, Nav, Navbar, Offcanvas } from "react-bootstrap";
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
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import { socket } from "../socket";

/* ================= UTILIDADES ================= */

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
      sessionStorage.getItem("user")
    );
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.clear();
  sessionStorage.clear();
};

/* ================= COMPONENTE ================= */

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showMobile, setShowMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(getStoredUser());

  const rol = user?.rol || "sin rol";

  /* ===== sincroniza usuario ===== */
  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
  }, [location.pathname]);

  /* ===== logout ===== */
  const logout = () => {
    clearSession();
    try { socket.disconnect(); } catch {}
    navigate("/login", { replace: true });
  };

  /* ================= MENÚ ================= */

  const menu = useMemo(() => ([
    {
      title: "Principal",
      roles: ["admin", "supervisor"],
      items: [
        { to: "/dashboard", label: "Dashboard", icon: <FaChartPie />, roles: ["admin", "supervisor"] },
      ],
    },
    {
      title: "Operación",
      roles: ["admin", "supervisor", "cajero", "cocina"],
      items: [
        { to: "/pos", label: "POS", icon: <FaCashRegister />, roles: ["admin", "supervisor", "cajero"] },
        { to: "/cocina", label: "Cocina (KDS)", icon: <FaUtensils />, roles: ["admin", "supervisor", "cocina"] },
        { to: "/ordenes", label: "Órdenes", icon: <FaClipboardList />, roles: ["admin", "supervisor"] },
      ],
    },
    {
      title: "Caja & Facturación",
      roles: ["admin", "supervisor", "cajero"],
      items: [
        { to: "/caja", label: "Caja", icon: <FaMoneyBillWave />, roles: ["admin", "supervisor", "cajero"] },
        { to: "/facturas", label: "Facturas", icon: <FaFileInvoiceDollar />, roles: ["admin", "supervisor", "cajero"] },
      ],
    },
    {
      title: "Auditoría",
      roles: ["admin", "supervisor"],
      items: [
        { to: "/bitacora", label: "Bitácora", icon: <FaBook />, roles: ["admin", "supervisor"] },
      ],
    },
    {
      title: "Administrador",
      roles: ["admin"],
      items: [
        { to: "/admin", label: "Administración", icon: <FaCogs />, roles: ["admin"] },
      ],
    },
  ]), []);

  const menuVisible = useMemo(() => {
    if (rol === "sin rol") return [];
    return menu
      .filter(sec => sec.roles.includes(rol))
      .map(sec => ({
        ...sec,
        items: sec.items.filter(i => i.roles.includes(rol)),
      }))
      .filter(sec => sec.items.length);
  }, [menu, rol]);

  /* ================= ITEM ================= */

  const LinkItem = ({ to, icon, label }) => (
    <Nav.Link
      as={NavLink}
      to={to}
      end
      className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3"
      style={({ isActive }) => ({
        background: isActive ? "rgba(255,255,255,.12)" : "transparent",
        border: "1px solid rgba(255,255,255,.08)",
        color: "white",
      })}
    >
      <span className="d-flex gap-2 align-items-center">
        <span style={{ width: 20 }}>{icon}</span>
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && <FaChevronRight />}
    </Nav.Link>
  );

  /* ================= UI ================= */

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      {/* ===== TOPBAR ===== */}
      <Navbar className="sticky-top" style={{ background: "#0f172a" }}>
        <Container fluid className="d-flex justify-content-between">
          <Button variant="outline-light" className="d-lg-none" onClick={() => setShowMobile(true)}>
            <FaBars />
          </Button>

          <div className="text-white fw-bold">Sistema Cocina</div>

          <Button variant="outline-danger" onClick={logout}>
            <FaSignOutAlt />
          </Button>
        </Container>
      </Navbar>

      {/* ===== GRID ===== */}
      <Container fluid className="py-3">
        <div className="row g-3">
          {/* ===== SIDEBAR DESKTOP ===== */}
          <div className="d-none d-lg-block" style={{ width: collapsed ? 80 : 260 }}>
            <div
              className="position-sticky rounded-4 shadow-sm"
              style={{
                top: 80,
                background: "linear-gradient(180deg,#0f172a,#111827)",
                transition: "width .2s",
              }}
            >
              <div className="p-3 border-bottom text-white d-flex justify-content-between">
                {!collapsed && <strong>Menú</strong>}
                <Button size="sm" variant="outline-light" onClick={() => setCollapsed(!collapsed)}>
                  {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
                </Button>
              </div>

              <div className="p-2">
                {menuVisible.map(sec => (
                  <div key={sec.title} className="mb-2">
                    {!collapsed && (
                      <div className="text-white-50 small px-3">{sec.title}</div>
                    )}
                    <Nav className="d-grid gap-2 px-2">
                      {sec.items.map(item => (
                        <LinkItem key={item.to} {...item} />
                      ))}
                    </Nav>
                  </div>
                ))}
              </div>

              <div className="p-3 border-top">
                <Button variant="outline-danger" className="w-100" onClick={logout}>
                  <FaSignOutAlt />
                  {!collapsed && <span className="ms-2">Cerrar sesión</span>}
                </Button>
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="col">
            <Outlet />
          </div>
        </div>
      </Container>

      {/* ===== SIDEBAR MOBILE ===== */}
      <Offcanvas show={showMobile} onHide={() => setShowMobile(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Sistema Cocina</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {menuVisible.map(sec => (
            <div key={sec.title} className="mb-3">
              <div className="text-muted small">{sec.title}</div>
              <Nav className="d-grid gap-2">
                {sec.items.map(i => (
                  <Nav.Link
                    key={i.to}
                    as={NavLink}
                    to={i.to}
                    onClick={() => setShowMobile(false)}
                    className="d-flex justify-content-between bg-light rounded-3 px-3 py-2"
                  >
                    <span className="d-flex gap-2">{i.icon}{i.label}</span>
                    <FaChevronRight />
                  </Nav.Link>
                ))}
              </Nav>
            </div>
          ))}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
