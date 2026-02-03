import { NavLink } from "react-router-dom";
import { socket } from "../socket";

export default function Sidebar({ open, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const rol = user?.rol;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try { socket.disconnect(); } catch {}
    window.location.href = "/";
  };

  const links = [
    { to: "/admin", label: "Dashboard", roles: ["admin", "supervisor"] },
    { to: "/pos", label: "POS (Cajero)", roles: ["admin", "cajero", "supervisor"] },
    { to: "/cocina", label: "Cocina (KDS)", roles: ["admin", "cocina", "supervisor"] },
  ];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <h2>Sistema Cocina</h2>
        <span className="role-pill">{rol || "sin rol"}</span>
      </div>

      <nav className="nav">
        {links
          .filter((l) => l.roles.includes(rol))
          .map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={onClose} // en móvil, cerrar al navegar
              end
            >
              <span>{l.label}</span>
              <span style={{ opacity: 0.7 }}>›</span>
            </NavLink>
          ))}
      </nav>

      <div className="sidebar-footer">
        <div className="name">{user?.nombre || "Usuario"}</div>
        <div className="small">{user?.usuario || ""}</div>

        <button className="btn btn-danger" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
