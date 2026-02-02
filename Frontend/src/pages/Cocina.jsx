import { useEffect, useState } from "react";
import api from "../api";
import { socket } from "../socket";
import LayoutBS from "../components/LayoutBS";

export default function Cocina() {
  const [ordenes, setOrdenes] = useState([]);
  const [filtro, setFiltro] = useState("NUEVA");
  const [newCount, setNewCount] = useState(0);

  const beep = () => {
    const audio = new Audio("/beep.mp3");
    audio.play().catch(() => {});
  };

  const cargar = async () => {
    const { data } = await api.get(`/ordenes?estado=${filtro}`);
    setOrdenes(data.ordenes || []);
  };

  useEffect(() => { cargar(); }, [filtro]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join", { room: "cocina" });

    const onNew = () => {
      setNewCount((c) => c + 1);
      beep();
      if (filtro === "NUEVA") cargar();
    };

    socket.on("order:new", onNew);
    return () => socket.off("order:new", onNew);
  }, [filtro]);

  const cambiarEstado = async (id, estado) => {
    await api.put(`/ordenes/${id}/estado`, { estado });
    cargar();
  };

  return (
    <LayoutBS title="Cocina (KDS)" badgeNew={newCount}>
      <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
        <select className="form-select w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="NUEVA">Nuevas</option>
          <option value="EN_PREPARACION">En preparación</option>
          <option value="LISTA">Listas</option>
        </select>

        <button className="btn btn-outline-secondary" onClick={cargar}>Refrescar</button>

        {newCount > 0 && (
          <button className="btn btn-outline-success" onClick={() => setNewCount(0)}>Limpiar badge</button>
        )}
      </div>

      <div className="row g-3">
        {ordenes.map((o) => (
          <div key={o.id} className="col-12 col-md-6 col-xl-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="fw-bold fs-5">
                  #{String(o.numero_dia).padStart(3, "0")} — {o.cliente_nombre || "Sin nombre"}
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  Tipo: {o.tipo} {o.mesa ? `| Mesa: ${o.mesa}` : ""}
                </div>

                {o.notas && <div className="alert alert-light mt-3 mb-0">{o.notas}</div>}

                <div className="d-flex gap-2 flex-wrap mt-3">
                  {o.estado !== "EN_PREPARACION" && (
                    <button className="btn btn-outline-dark" onClick={() => cambiarEstado(o.id, "EN_PREPARACION")}>
                      En preparación
                    </button>
                  )}
                  {o.estado !== "LISTA" && (
                    <button className="btn btn-success fw-bold" onClick={() => cambiarEstado(o.id, "LISTA")}>
                      Marcar LISTA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LayoutBS>
  );
}
