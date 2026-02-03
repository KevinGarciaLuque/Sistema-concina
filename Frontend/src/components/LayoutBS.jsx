import { useEffect, useMemo, useState } from "react";
import {
  Offcanvas,
  Navbar,
  Container,
  Button,
  Badge,
  Nav,
} from "react-bootstrap";
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

export default function LayoutBS({
  title,
  children,
  badgeNew = 0,
  badgeReady = 0,
}) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  // ✅ leer user de storage de forma segura (sin useMemo raro)
  const user = useMemo(() => {
    try {
      const u = localStorage.getItem("user") || sessionStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const rol = user?.rol || "sin rol";

  // ✅ links por rol
  const linksAll = [
    {
      to: "/admin",
      label: "Dashboard",
      icon: <FaChartPie />,
      roles: ["admin", "supervisor"],
      badge: 0,
      badgeVariant: "secondary",
    },
    {
      to: "/pos",
      label: "POS (Cajero)",
      icon: <FaCashRegister />,
      roles: ["admin", "cajero", "supervisor"],
      badge: badgeReady,
      badgeVariant: "success",
    },
    {
      to: "/cocina",
      label: "Cocina (KDS)",
      icon: <FaUtensils />,
      roles: ["admin", "cocina", "supervisor"],
      badge: badgeNew,
      badgeVariant: "danger",
    },
  ];

  const links = linksAll.filter((l) => l.roles.includes(rol));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    try {
      socket.disconnect();
    } catch {}
    navigate("/", { replace: true });
  };

  // ✅ cerrar con ESC el offcanvas
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const LinkItem = ({ to, icon, label, badge, badgeVariant }) => (
    <Nav.Link
      as={NavLink}
      to={to}
      end
      onClick={() => setShow(false)}
      className={({ isActive }) =>
        [
          "d-flex align-items-center justify-content-between",
          "px-3 py-2 rounded-3",
          "text-decoration-none",
          isActive ? "bg-dark text-white" : "text-dark",
        ].join(" ")
      }
    >
      <span className="d-flex align-items-center gap-2">
        <span
          className="d-inline-flex align-items-center justify-content-center"
          style={{ width: 18 }}
        >
          {icon}
        </span>
        <span className="fw-semibold">{label}</span>
      </span>

      <span className="d-flex align-items-center gap-2">
        {badge > 0 && (
          <Badge bg={badgeVariant} pill>
            {badge}
          </Badge>
        )}
        <FaChevronRight style={{ opacity: 0.6 }} />
      </span>
    </Nav.Link>
  );

  return (
    <div className="bg-light" style={{ minHeight: "100vh" }}>
      {/* ===== TOPBAR ===== */}
      <Navbar bg="light" className="border-bottom sticky-top">
        <Container
          fluid
          className="d-flex align-items-center justify-content-between"
        >
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-dark"
              className="d-lg-none"
              onClick={() => setShow(true)}
              aria-label="Abrir menú"
            >
              <FaBars />
            </Button>

            <div className="d-flex flex-column">
              <span className="fw-bold">Sistema Cocina</span>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {title}
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-block text-end">
              <div className="fw-bold" style={{ lineHeight: 1.1 }}>
                {user?.nombre || "Usuario"}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {rol}
              </div>
            </div>

            <Button
              variant="outline-danger"
              className="d-none d-sm-inline-flex"
              onClick={logout}
            >
              <FaSignOutAlt className="me-2" />
              Salir
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* ===== MAIN GRID ===== */}
      <Container fluid className="py-3">
        <div className="row g-3">
          {/* ===== SIDEBAR DESKTOP ===== */}
          <div className="col-lg-3 col-xl-2 d-none d-lg-block">
            <div
              className="bg-white border rounded-4 p-2 shadow-sm position-sticky"
              style={{ top: 72 }}
            >
              <div className="px-3 pt-2 pb-2">
                <div className="fw-bold">Menú</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Accesos por rol
                </div>
              </div>

              <Nav className="d-grid gap-2 px-2 pb-2">
                {links.map((l) => (
                  <LinkItem key={l.to} {...l} />
                ))}
              </Nav>

              <div className="border-top px-3 py-3">
                <div className="fw-bold">{user?.nombre || "Usuario"}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {rol}
                </div>

                <Button
                  variant="outline-danger"
                  className="w-100 mt-3"
                  onClick={logout}
                >
                  <FaSignOutAlt className="me-2" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="col-12 col-lg-9 col-xl-10">
            <div className="mx-auto" style={{ maxWidth: 1100 }}>
              {children}
            </div>
          </div>
        </div>
      </Container>

      {/* ===== SIDEBAR MOVIL (OFFCANVAS) ===== */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Sistema Cocina</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body>
          <div className="mb-3">
            <div className="fw-bold">{user?.nombre || "Usuario"}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {rol}
            </div>
          </div>

          <Nav className="d-grid gap-2">
            {links.map((l) => (
              <LinkItem key={l.to} {...l} />
            ))}
          </Nav>

          <Button
            variant="outline-danger"
            className="w-100 mt-3"
            onClick={logout}
          >
            <FaSignOutAlt className="me-2" />
            Cerrar sesión
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
