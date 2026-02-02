import { useEffect, useMemo, useState } from "react";
import { Offcanvas, Navbar, Container, Button, Badge, Nav } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import {
  FaChartPie,
  FaCashRegister,
  FaUtensils,
  FaSignOutAlt,
  FaBars,
  FaChevronRight,
} from "react-icons/fa";

import "./LayoutBS.css";


export default function LayoutBS({ title, children, badgeNew = 0, badgeReady = 0 }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  // 👇 Mejor: leer usuario en cada render (así se actualiza si cambia storage)
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  }, [localStorage.getItem("user")]); // eslint-disable-line

  const rol = user?.rol;

  const links = [
    { to: "/admin", label: "Dashboard", icon: <FaChartPie />, roles: ["admin", "supervisor"], badge: 0, badgeType: "none" },
    { to: "/pos", label: "POS (Cajero)", icon: <FaCashRegister />, roles: ["admin", "cajero", "supervisor"], badge: badgeReady, badgeType: "success" },
    { to: "/cocina", label: "Cocina (KDS)", icon: <FaUtensils />, roles: ["admin", "cocina", "supervisor"], badge: badgeNew, badgeType: "danger" },
  ].filter((l) => l.roles.includes(rol));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try { socket.disconnect(); } catch {}
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const LinkItem = ({ to, icon, label, badge, badgeType }) => (
    <Nav.Link
      as={NavLink}
      to={to}
      onClick={() => setShow(false)}
      className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
      end
    >
      <span className="sb-left">
        <span className="sb-ico">{icon}</span>
        <span className="sb-label">{label}</span>
      </span>

      <span className="sb-right">
        {badge > 0 && (
          <Badge
            pill
            className={`sb-badge ${badgeType === "danger" ? "danger" : "success"}`}
          >
            {badge}
          </Badge>
        )}
        <span className="sb-chevron"><FaChevronRight /></span>
      </span>
    </Nav.Link>
  );

  return (
    <div className="app-shell">
      {/* Topbar */}
      <Navbar className="topbar" expand={false}>
        <Container fluid className="topbar-inner">
          <div className="d-flex align-items-center gap-2">
            <Button
              className="icon-btn d-lg-none"
              variant="light"
              onClick={() => setShow(true)}
              aria-label="Abrir menú"
            >
              <FaBars />
            </Button>

            <div className="brand-wrap">
              <div className="brand">Sistema Cocina</div>
              <div className="brand-sub">{title}</div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="userbox d-none d-sm-flex">
              <div className="user-meta">
                <div className="user-name">{user?.nombre || "Usuario"}</div>
                <div className="user-role">{rol || "sin rol"}</div>
              </div>
            </div>

            <Button className="logout-btn d-none d-sm-inline-flex" variant="light" onClick={logout}>
              <FaSignOutAlt className="me-2" />
              Salir
            </Button>
          </div>
        </Container>
      </Navbar>

      <Container fluid className="main-wrap">
        <div className="row g-0">
          {/* Sidebar desktop */}
          <div className="col-lg-3 col-xl-2 d-none d-lg-block">
            <aside className="sidebar">
              <div className="sb-header">
                <div className="sb-title">Menú</div>
                <div className="sb-sub">Accesos por rol</div>
              </div>

              <Nav className="sb-nav">
                {links.map((l) => (
                  <LinkItem key={l.to} {...l} />
                ))}
              </Nav>

              <div className="sb-footer">
                <div className="sb-user">
                  <div className="sb-user-name">{user?.nombre || "Usuario"}</div>
                  <div className="sb-user-role">{rol || ""}</div>
                </div>

                <Button className="sb-logout" variant="light" onClick={logout}>
                  <FaSignOutAlt className="me-2" />
                  Cerrar sesión
                </Button>
              </div>
            </aside>
          </div>

          {/* Content */}
          <div className="col-lg-9 col-xl-10">
            <div className="content">
              <div className="content-inner">
                {children}
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Sidebar móvil */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="start" className="offcanvas-sleek">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Sistema Cocina</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body>
          <div className="mb-3">
            <div className="fw-bold">{user?.nombre || "Usuario"}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{rol || "sin rol"}</div>
          </div>

          <Nav className="d-grid gap-2">
            {links.map((l) => (
              <LinkItem key={l.to} {...l} />
            ))}
          </Nav>

          <Button className="w-100 mt-3" variant="light" onClick={logout}>
            <FaSignOutAlt className="me-2" />
            Cerrar sesión
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
