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
} from "react-icons/fa";
import { socket } from "../socket";

/** ✅ Lee user desde localStorage o sessionStorage */
function getStoredUser() {
  try {
    const raw =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");
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
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Estado que se sincroniza con storage (evita "sin rol" pegado)
  const [user, setUser] = useState(() => getStoredUser());
  const rol = user?.rol || "sin rol";

  // ✅ Sincroniza user cuando:
  // - cambia storage (otra pestaña)
  // - vuelves a la pestaña (focus)
  // - navegas dentro de la app (location cambia)
  useEffect(() => {
    const sync = () => setUser(getStoredUser());

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    // al montar
    sync();

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    // cada vez que cambie la ruta, re-lee user (por si se actualizó)
    setUser(getStoredUser());
  }, [location.pathname]);

  const logout = () => {
    clearSession();
    try { socket.disconnect(); } catch {}
    navigate("/login", { replace: true });
  };

  // ✅ Cerrar Offcanvas con ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ Menú pro según BD + roles
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
        { to: "/pos", label: "POS (Cajero)", icon: <FaCashRegister />, roles: ["admin", "supervisor", "cajero"] },
        { to: "/cocina", label: "Cocina (KDS)", icon: <FaUtensils />, roles: ["admin", "supervisor", "cocina"] },
        { to: "/ordenes", label: "Órdenes (Monitor)", icon: <FaClipboardList />, roles: ["admin", "supervisor"] },
      ],
    },
    {
      title: "Caja y Facturación",
      roles: ["admin", "supervisor", "cajero"],
      items: [
        { to: "/caja", label: "Caja (Apertura/Cierre)", icon: <FaMoneyBillWave />, roles: ["admin", "supervisor", "cajero"] },
        { to: "/facturas", label: "Facturas / Reimpresión", icon: <FaFileInvoiceDollar />, roles: ["admin", "supervisor", "cajero"] },
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
        { to: "/admin", label: "Administración (Catálogo)", icon: <FaCogs />, roles: ["admin"] },
      ],
    },
  ]), []);

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

  const LinkItemDark = ({ to, icon, label }) => (
    <Nav.Link
      as={NavLink}
      to={to}
      end
      onClick={() => setShow(false)}
      className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3 text-decoration-none"
      style={({ isActive }) => ({
        background: isActive ? "rgba(255,255,255,.12)" : "transparent",
        border: "1px solid rgba(255,255,255,.08)",
        color: "white",
        transition: "all .15s ease",
        opacity: isActive ? 1 : 0.92,
      })}
    >
      <span className="d-flex align-items-center gap-2">
        <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 18 }}>
          {icon}
        </span>
        <span className="fw-semibold">{label}</span>
      </span>

      <FaChevronRight style={{ opacity: 0.7 }} />
    </Nav.Link>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      {/* ===== TOPBAR ===== */}
      <Navbar
        className="border-bottom sticky-top"
        style={{ background: "linear-gradient(90deg, #0f172a 0%, #111827 100%)" }}
      >
        <Container fluid className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-light"
              className="d-lg-none"
              onClick={() => setShow(true)}
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

            <Button variant="outline-danger" className="d-none d-sm-inline-flex" onClick={logout}>
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
              className="rounded-4 shadow-sm position-sticky"
              style={{
                top: 76,
                background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
                border: "1px solid rgba(15, 23, 42, .12)",
                overflow: "hidden",
              }}
            >
              <div
                className="px-3 pt-3 pb-2 border-bottom"
                style={{ borderColor: "rgba(255,255,255,.08)" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold text-white">Menú</div>
                    <div className="text-white-50" style={{ fontSize: 12 }}>
                      Accesos por rol
                    </div>
                  </div>

                  <Badge bg="light" text="dark">
                    {rol}
                  </Badge>
                </div>

                <div className="mt-2 text-white-50" style={{ fontSize: 12 }}>
                  {user?.nombre || "Usuario"} · {user?.usuario || ""}
                </div>
              </div>

              <div className="p-2" style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
                {rol === "sin rol" ? (
                  <div className="px-3 py-3 text-white-50" style={{ fontSize: 13 }}>
                    No se detectó rol en la sesión.
                    <div className="mt-2">
                      <Button variant="outline-light" size="sm" onClick={logout}>
                        Volver a iniciar sesión
                      </Button>
                    </div>
                  </div>
                ) : (
                  menuVisible.map((sec) => (
                    <div key={sec.title} className="mb-2">
                      <div
                        className="px-3 pt-2 pb-1 text-uppercase text-white-50"
                        style={{ fontSize: 11, letterSpacing: 0.4 }}
                      >
                        {sec.title}
                      </div>

                      <Nav className="d-grid gap-2 px-2 pb-2">
                        {sec.items.map((l) => (
                          <LinkItemDark key={l.to} {...l} />
                        ))}
                      </Nav>

                      <hr className="my-1" style={{ borderColor: "rgba(255,255,255,.08)" }} />
                    </div>
                  ))
                )}
              </div>

              <div className="border-top px-3 py-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
                <Button variant="outline-danger" className="w-100" onClick={logout}>
                  <FaSignOutAlt className="me-2" />
                  Cerrar sesión
                </Button>

                <div className="text-white-50 mt-2" style={{ fontSize: 12 }}>
                  Ruta: {location.pathname}
                </div>
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="col-12 col-lg-9 col-xl-10">
            <div className="mx-auto" style={{ maxWidth: 1150 }}>
              <Outlet />
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
              {rol} · {user?.usuario || ""}
            </div>
          </div>

          {rol === "sin rol" ? (
            <div className="text-muted">
              No se detectó rol en la sesión.
              <div className="mt-2">
                <Button variant="outline-dark" size="sm" onClick={logout}>
                  Volver a iniciar sesión
                </Button>
              </div>
            </div>
          ) : (
            menuVisible.map((sec) => (
              <div key={sec.title} className="mb-3">
                <div className="text-uppercase text-muted small mb-2">{sec.title}</div>
                <Nav className="d-grid gap-2">
                  {sec.items.map((l) => (
                    <Nav.Link
                      key={l.to}
                      as={NavLink}
                      to={l.to}
                      end
                      onClick={() => setShow(false)}
                      className={({ isActive }) =>
                        [
                          "d-flex align-items-center justify-content-between",
                          "px-3 py-2 rounded-3 text-decoration-none",
                          isActive ? "bg-dark text-white" : "bg-light text-dark",
                        ].join(" ")
                      }
                    >
                      <span className="d-flex align-items-center gap-2">
                        <span style={{ width: 18 }}>{l.icon}</span>
                        <span className="fw-semibold">{l.label}</span>
                      </span>
                      <FaChevronRight style={{ opacity: 0.6 }} />
                    </Nav.Link>
                  ))}
                </Nav>
              </div>
            ))
          )}

          <Button variant="outline-danger" className="w-100 mt-2" onClick={logout}>
            <FaSignOutAlt className="me-2" />
            Cerrar sesión
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
