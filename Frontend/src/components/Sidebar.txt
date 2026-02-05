import { NavLink } from "react-router-dom";
import { Badge, Button } from "react-bootstrap";
import {
  FaChartPie,
  FaCashRegister,
  FaUtensils,
  FaClipboardList,
  FaCash,
  FaFileInvoiceDollar,
  FaBoxes,
  FaTags,
  FaHamburger,
  FaSlidersH,
  FaUsers,
  FaUserShield,
  FaBook,
  FaSignOutAlt,
  FaChevronRight,
} from "react-icons/fa";
import { socket } from "../socket";

export default function Sidebar({
  open,
  onClose,
  badgeNew = 0,
  badgeReady = 0,
}) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const rol = user?.rol;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try { socket.disconnect(); } catch {}
    window.location.href = "/";
  };

  // ✅ Menú profesional según tu BD (y roles)
  // Nota: Si aún no tienes algunas pantallas, deja igual los links y luego las creas.
  const menu = [
    {
      section: "Principal",
      roles: ["admin", "supervisor"],
      items: [
        { to: "/dashboard", label: "Dashboard", icon: <FaChartPie /> },
      ],
    },

    {
      section: "Operación",
      roles: ["admin", "cajero", "cocina", "supervisor"],
      items: [
        { to: "/pos", label: "POS (Cajero)", icon: <FaCashRegister />, roles: ["admin", "cajero", "supervisor"] },
        {
          to: "/cocina",
          label: "Cocina (KDS)",
          icon: <FaUtensils />,
          roles: ["admin", "cocina", "supervisor"],
          badge: () =>
            (badgeNew > 0 || badgeReady > 0) ? (
              <span className="d-flex gap-1">
                {badgeNew > 0 && <Badge bg="warning" text="dark">{badgeNew}</Badge>}
                {badgeReady > 0 && <Badge bg="success">{badgeReady}</Badge>}
              </span>
            ) : null,
        },
        { to: "/ordenes", label: "Órdenes (Monitor)", icon: <FaClipboardList />, roles: ["admin", "supervisor"] },
      ],
    },

    {
      section: "Caja y Facturación",
      roles: ["admin", "cajero", "supervisor"],
      items: [
        { to: "/caja", label: "Caja (Apertura / Cierre)", icon: <FaCash />, roles: ["admin", "cajero", "supervisor"] },
        { to: "/facturas", label: "Facturas / Reimpresión", icon: <FaFileInvoiceDollar />, roles: ["admin", "cajero", "supervisor"] },
      ],
    },

    {
      section: "Menú / Catálogo",
      roles: ["admin"],
      items: [
        { to: "/admin/categorias", label: "Categorías", icon: <FaTags />, roles: ["admin"] },
        { to: "/admin/productos", label: "Productos", icon: <FaHamburger />, roles: ["admin"] },
        { to: "/admin/modificadores", label: "Modificadores", icon: <FaSlidersH />, roles: ["admin"] },
      ],
    },

    {
      section: "Seguridad",
      roles: ["admin"],
      items: [
        { to: "/admin/usuarios", label: "Usuarios", icon: <FaUsers />, roles: ["admin"] },
        { to: "/admin/roles", label: "Roles", icon: <FaUserShield />, roles: ["admin"] },
      ],
    },

    {
      section: "Auditoría",
      roles: ["admin", "supervisor"],
      items: [
        { to: "/bitacora", label: "Bitácora", icon: <FaBook />, roles: ["admin", "supervisor"] },
      ],
    },
  ];

  const isAllowed = (itemRoles) => {
    if (!rol) return false;
    if (!itemRoles) return true; // si no especifica, hereda section
    return itemRoles.includes(rol);
  };

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onClose}
      className={({ isActive }) => {
        const base =
          "d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none";
        const active = "bg-primary text-white fw-semibold";
        const idle = "text-light";
        return `${base} ${isActive ? active : idle}`;
      }}
      end
      style={({ isActive }) => ({
        transition: "all .15s ease",
        opacity: isActive ? 1 : 0.92,
      })}
    >
      <span className="d-inline-flex align-items-center" style={{ width: 18 }}>
        {item.icon}
      </span>

      <span className="flex-grow-1">{item.label}</span>

      {/* Badge opcional (KDS) */}
      {item.badge ? item.badge() : null}

      <span style={{ opacity: 0.65 }}>
        <FaChevronRight />
      </span>
    </NavLink>
  );

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 992 : false;

  return (
    <>
      {/* Overlay móvil */}
      {open && isMobile && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 1040,
          }}
        />
      )}

      <aside
        className="border-end"
        style={{
          width: 290,
          background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)", // azul oscuro elegante
          color: "#fff",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          height: "100vh",
          zIndex: 1045,
          transform: isMobile ? (open ? "translateX(0)" : "translateX(-110%)") : "none",
          transition: "transform .2s ease",
        }}
      >
        {/* Header */}
        <div className="p-3 border-bottom" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold fs-5">Sistema Cocina</div>
              <div className="text-white-50 small">
                Accesos por rol
              </div>
            </div>

            {isMobile && (
              <Button variant="outline-light" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>

          <div className="mt-2 d-flex align-items-center gap-2">
            <Badge bg="light" text="dark">
              {rol || "sin rol"}
            </Badge>
            <span className="text-white-50 small">
              {user?.usuario || ""}
            </span>
          </div>
        </div>

        {/* Menú */}
        <div className="p-2" style={{ overflowY: "auto", height: "calc(100vh - 170px)" }}>
          {menu.map((sec) => {
            // Sección visible si rol pertenece a sección
            if (!rol || !sec.roles.includes(rol)) return null;

            const items = sec.items.filter((it) =>
              isAllowed(it.roles || sec.roles)
            );

            if (items.length === 0) return null;

            return (
              <div key={sec.section} className="mb-2">
                <div className="px-3 pt-2 pb-1 text-uppercase text-white-50 small">
                  {sec.section}
                </div>

                <div className="d-flex flex-column gap-1">
                  {items.map(renderNavItem)}
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.08)" }} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-top" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <div className="fw-semibold">{user?.nombre || "Usuario"}</div>
          <div className="text-white-50 small mb-2">{rol || ""}</div>

          <Button variant="outline-danger" className="w-100" onClick={logout}>
            <FaSignOutAlt className="me-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
