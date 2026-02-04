import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CategoriasAdmin from "./CategoriasAdmin.jsx";
import ProductosAdmin from "./ProductosAdmin.jsx";
import ModificadoresAdmin from "./Modificadores.jsx";
import ProductoModificadoresAdmin from "./ProductoModificadoresAdmin.jsx";

import { FaTags, FaBoxOpen, FaSlidersH, FaLink } from "react-icons/fa";

const TABS = [
  { key: "categorias", label: "Categorías", icon: <FaTags />, component: <CategoriasAdmin /> },
  { key: "productos", label: "Productos", icon: <FaBoxOpen />, component: <ProductosAdmin /> },
  { key: "modificadores", label: "Modificadores", icon: <FaSlidersH />, component: <ModificadoresAdmin /> },
  { key: "asignacion", label: "Asignación", icon: <FaLink />, component: <ProductoModificadoresAdmin /> },
];

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const tabFromUrl = params.get("tab");

  const [tab, setTab] = useState(() => tabFromUrl || localStorage.getItem("admin_tab") || "productos");

  useEffect(() => {
    const valid = TABS.some((t) => t.key === tab);
    if (!valid) setTab("productos");
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("admin_tab", tab);

    const p = new URLSearchParams(location.search);
    p.set("tab", tab);

    navigate({ pathname: "/admin", search: `?${p.toString()}` }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const current = TABS.find((t) => t.key === tab) || TABS[1];

  return (
    <>
      {/* Header elegante */}
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0">Administración</h4>
          <small className="text-muted">
            Menú pro: categorías, productos, modificadores y asignación.
          </small>
        </div>

        <div className="text-muted small">
          Panel activo: <b className="text-dark">{current.label}</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="card shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="nav nav-pills gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`nav-link d-inline-flex align-items-center gap-2 ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
                style={{ borderRadius: 999 }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="card shadow-sm">
        <div className="card-body">{current.component}</div>
      </div>
    </>
  );
}
