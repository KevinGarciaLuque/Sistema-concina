// src/pages/admin/Reportes.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ResumenVentas from "./reportes/ResumenVentas.jsx";
import PorMetodo from "./reportes/PorMetodo.jsx";
import TopVentas from "./reportes/TopVentas.jsx";
import PorCaja from "./reportes/PorCaja.jsx";

import { FaChartBar, FaCreditCard, FaFire, FaCashRegister } from "react-icons/fa";

const TABS = [
  { key: "resumen", label: "Resumen", icon: <FaChartBar />, component: <ResumenVentas /> },
  { key: "metodos", label: "Métodos", icon: <FaCreditCard />, component: <PorMetodo /> },
  { key: "top", label: "Top Ventas", icon: <FaFire />, component: <TopVentas /> },
  { key: "caja", label: "Por Caja", icon: <FaCashRegister />, component: <PorCaja /> },
];

export default function Reportes() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const tabFromUrl = params.get("tab");

  const [tab, setTab] = useState(() => tabFromUrl || localStorage.getItem("reportes_tab") || "resumen");

  useEffect(() => {
    const valid = TABS.some((t) => t.key === tab);
    if (!valid) setTab("resumen");
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("reportes_tab", tab);

    const p = new URLSearchParams(location.search);
    p.set("tab", tab);

    navigate({ pathname: "/reportes", search: `?${p.toString()}` }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const current = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <>
      {/* Header elegante */}
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0">Reportes</h4>
          <small className="text-muted">
            KPIs, ventas por día, top, métodos y caja.
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
