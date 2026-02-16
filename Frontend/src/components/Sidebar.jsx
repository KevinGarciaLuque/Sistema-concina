//Frontend/src/components/Sidebar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge, Button, Nav, Offcanvas } from "react-bootstrap";
import { FaChevronRight, FaSignOutAlt, FaAngleRight, FaAngleLeft } from "react-icons/fa";

export default function Sidebar({
  mode = "desktop", // "desktop" | "mobile"
  show,
  setShow,
  collapsed = false,
  onToggleCollapsed,
  user,
  rol,
  menuVisible = [],
  logout,
}) {
  const location = useLocation();
  const isDesktop = mode === "desktop";

  const [hoveredTo, setHoveredTo] = useState(null);

  const theme = useMemo(
    () => ({
      panelBg: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
      border: "rgba(255,255,255,.08)",
      activeBg: "rgba(255,255,255,.12)",
      hoverBg: "rgba(255,255,255,.10)",
      activeBorder: "rgba(255,255,255,.14)",
      hoverBorder: "rgba(255,255,255,.14)",
      activeBar: "rgba(96,165,250,.95)", // azul suave
      shadow: "0 10px 30px rgba(0,0,0,.18)",
      shadowHover: "0 14px 34px rgba(0,0,0,.28)",
      textMuted: "rgba(255,255,255,.62)",
    }),
    []
  );

  const closeMobile = () => setShow?.(false);

  const LinkItemDark = ({ to, icon, label }) => {
    const isHovered = hoveredTo === to;

    return (
      <NavLink
        to={to}
        end
        onClick={closeMobile}
        onMouseEnter={() => setHoveredTo(to)}
        onMouseLeave={() => setHoveredTo(null)}
        className="text-decoration-none"
        title={collapsed ? label : undefined}
        style={({ isActive }) => {
          const active = isActive;

          return {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",

            padding: collapsed ? "10px 10px" : "10px 14px",
            borderRadius: 14,

            background: active ? theme.activeBg : isHovered ? theme.hoverBg : "transparent",
            border: `1px solid ${
              active ? theme.activeBorder : isHovered ? theme.hoverBorder : theme.border
            }`,

            color: "white",
            opacity: active ? 1 : 0.94,

            transition:
              "transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease",
            transform: isHovered ? "translateX(2px)" : "translateX(0px)",
            boxShadow: active || isHovered ? theme.shadowHover : "none",

            minHeight: 44,
          };
        }}
      >
        {({ isActive }) => {
          const active = isActive;
          const isHoveredNow = isHovered;

          return (
            <>
              <span className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                {/* Barra activa */}
                <span
                  style={{
                    width: 4,
                    height: 22,
                    borderRadius: 999,
                    background: active ? theme.activeBar : "transparent",
                    boxShadow: active ? "0 0 0 2px rgba(96,165,250,.10)" : "none",
                    marginRight: collapsed ? 6 : 0,
                    transition: "all .16s ease",
                  }}
                />

                {/* Icono */}
                <span
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 12,
                    background: active
                      ? "rgba(96,165,250,.14)"
                      : isHoveredNow
                      ? "rgba(255,255,255,.08)"
                      : "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.08)",
                    transition: "all .16s ease",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </span>

                {!collapsed && (
                  <span className="fw-semibold text-truncate" style={{ maxWidth: 170 }}>
                    {label}
                  </span>
                )}
              </span>

              {!collapsed && (
                <FaChevronRight
                  style={{
                    opacity: active || isHoveredNow ? 0.9 : 0.65,
                    transform: isHoveredNow ? "translateX(2px)" : "translateX(0)",
                    transition: "all .16s ease",
                  }}
                />
              )}
            </>
          );
        }}
      </NavLink>
    );
  };

  // ===== DESKTOP =====
  if (isDesktop) {
    return (
      <div
        className="rounded-4 shadow-sm position-sticky"
        style={{
          top: 76,
          background: theme.panelBg,
          border: "1px solid rgba(15, 23, 42, .12)",
          overflow: "hidden",
          boxShadow: theme.shadow,
        }}
      >
        {/* ✅ Scrollbars ocultos (pero scroll activo) */}
        <style>{`
          .sidebar-scroll {
            scrollbar-width: none;        /* Firefox */
            -ms-overflow-style: none;     /* IE/Edge antiguo */
          }
          .sidebar-scroll::-webkit-scrollbar {
            width: 0px;                   /* Chrome/Safari/Edge */
            height: 0px;
          }
        `}</style>

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-bottom" style={{ borderColor: theme.border }}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-light"
                size="sm"
                onClick={onToggleCollapsed}
                aria-label="Colapsar/Expandir"
                className="d-inline-flex align-items-center justify-content-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  transition: "transform .15s ease, background .15s ease",
                }}
                onMouseEnter={() => setHoveredTo("__toggle__")}
                onMouseLeave={() => setHoveredTo(null)}
              >
                {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
              </Button>

              {!collapsed && (
                <div>
                  <div className="fw-bold text-white">Menú</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>Accesos por rol</div>
                </div>
              )}
            </div>

            {!collapsed && (
              <Badge bg="light" text="dark" className="rounded-pill px-3">
                {rol}
              </Badge>
            )}
          </div>

          {!collapsed && (
            <div className="mt-2" style={{ fontSize: 12, color: theme.textMuted }}>
              {user?.nombre || "Usuario"} · {user?.usuario || ""}
            </div>
          )}
        </div>

        {/* Menu */}
        <div
          className="p-2 sidebar-scroll"
          style={{
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            overflowX: "hidden", // ✅ evita scrollbar horizontal
            WebkitOverflowScrolling: "touch", // ✅ scroll suave en touch
          }}
        >
          {rol === "sin rol" ? (
            <div className="px-3 py-3" style={{ fontSize: 13, color: theme.textMuted }}>
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
                {!collapsed && (
                  <div
                    className="px-3 pt-2 pb-1 text-uppercase"
                    style={{
                      fontSize: 11,
                      letterSpacing: 0.6,
                      color: theme.textMuted,
                    }}
                  >
                    {sec.title}
                  </div>
                )}

                <Nav className="d-grid gap-2 px-2 pb-2">
                  {sec.items.map((l) => (
                    <LinkItemDark key={l.to} {...l} />
                  ))}
                </Nav>

                <hr className="my-1" style={{ borderColor: theme.border }} />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-top px-3 py-3" style={{ borderColor: theme.border }}>
          {!collapsed && (
            <div style={{ fontSize: 12, color: theme.textMuted }}>
              Ruta: {location.pathname}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== MOBILE/TABLET (OFFCANVAS) =====
  return (
    <Offcanvas show={show} onHide={closeMobile} placement="start">
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
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end
                    onClick={closeMobile}
                    className="text-decoration-none"
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: isActive ? "#111827" : "#f8fafc",
                      color: isActive ? "white" : "#111827",
                      border: "1px solid rgba(15, 23, 42, .10)",
                      transition: "all .16s ease",
                    })}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <span style={{ width: 18 }}>{l.icon}</span>
                      <span className="fw-semibold">{l.label}</span>
                    </span>
                    <FaChevronRight style={{ opacity: 0.7 }} />
                  </NavLink>
                ))}
              </Nav>
            </div>
          ))
        )}

        {/* Logout SOLO en móvil/tablet */}
        <Button variant="outline-danger" className="w-100 mt-2 d-lg-none" onClick={logout}>
          <FaSignOutAlt className="me-2" />
          Cerrar sesión
        </Button>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
