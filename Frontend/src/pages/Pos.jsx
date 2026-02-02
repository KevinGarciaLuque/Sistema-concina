import { useEffect, useState } from "react";
import api from "../api";
import { socket } from "../socket";
import LayoutBS from "../components/LayoutBS";

export default function Pos() {
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState("LLEVAR");
  const [mesa, setMesa] = useState("");
  const [notas, setNotas] = useState("");
  const [msg, setMsg] = useState("");
  const [readyCount, setReadyCount] = useState(0);
  const [ordenListaMsg, setOrdenListaMsg] = useState("");

  const beep = () => {
    const audio = new Audio("/beep.mp3");
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join", { room: "cajero" });

    const onReady = (orden) => {
      setReadyCount((c) => c + 1);
      setOrdenListaMsg(`✅ Orden #${String(orden.numero_dia).padStart(3, "0")} lista (${orden.cliente_nombre || "Sin nombre"})`);
      beep();
    };

    socket.on("order:ready", onReady);
    return () => socket.off("order:ready", onReady);
  }, []);

  const crearOrden = async (e) => {
    e.preventDefault();
    setMsg("");

    const { data } = await api.post("/ordenes", {
      cliente_nombre: cliente || null,
      tipo,
      mesa: tipo === "MESA" ? mesa : null,
      notas: notas || null,
    });

    const o = data.orden;
    setMsg(`🧾 Orden creada: #${String(o.numero_dia).padStart(3, "0")} - ${o.cliente_nombre || "Sin nombre"}`);
    setCliente("");
    setNotas("");
    setMesa("");
  };

  return (
    <LayoutBS title="POS (Cajero)" badgeReady={readyCount}>
      {ordenListaMsg && (
        <div className="alert alert-success">
          {ordenListaMsg}
          <button className="btn btn-sm btn-outline-success ms-2" onClick={() => { setOrdenListaMsg(""); setReadyCount(0); }}>
            Ok
          </button>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Nueva orden</h5>

          <form onSubmit={crearOrden} className="d-grid gap-2">
            <input className="form-control" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente (opcional)" />

            <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="LLEVAR">Para llevar</option>
              <option value="MESA">Mesa</option>
              <option value="DELIVERY">Delivery</option>
            </select>

            {tipo === "MESA" && (
              <input className="form-control" value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Número de mesa" />
            )}

            <textarea className="form-control" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional) ej: salsa aparte" rows={3} />

            <button className="btn btn-dark fw-bold">Crear orden</button>

            {msg && <div className="alert alert-secondary mb-0">{msg}</div>}
          </form>
        </div>
      </div>
    </LayoutBS>
  );
}
