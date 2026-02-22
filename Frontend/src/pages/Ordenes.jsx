import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  OverlayTrigger,
  Row,
  Spinner,
  Table,
  Tooltip,
} from "react-bootstrap";
import {
  FaClipboardList,
  FaSearch,
  FaSyncAlt,
  FaEye,
  FaCheckCircle,
  FaBan,
  FaUndo,
  FaClock,
  FaTruck,
} from "react-icons/fa";
import api from "../api";
import { socket } from "../socket";

/* ================= Helpers ================= */

function normalizeEstado(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["NUEVA", "NUEVO", "NEW"].includes(s)) return "NUEVA";
  if (
    [
      "EN_PREPARACION",
      "EN PREPARACION",
      "PREPARANDO",
      "COCINANDO",
      "IN_PROGRESS",
    ].includes(s)
  )
    return "EN_PREPARACION";
  if (["LISTA", "LISTO", "READY"].includes(s)) return "LISTA";
  if (["ENTREGADA", "ENTREGADO", "DELIVERED"].includes(s)) return "ENTREGADA";
  if (["ANULADA", "ANULADO", "CANCELADA", "CANCELADO"].includes(s)) return "ANULADA";
  return s || "NUEVA";
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function pickItems(o) {
  // ✅ fallback real (porque [] es truthy)
  const a = safeArray(o?.items);
  if (a.length) return a;

  const b = safeArray(o?.detalle);
  if (b.length) return b;

  const c = safeArray(o?.detalles);
  if (c.length) return c;

  const d = safeArray(o?.productos);
  if (d.length) return d;

  const e = safeArray(o?.lineas);
  if (e.length) return e;

  return [];
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function minutesAgo(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

/* ================= API ================= */

async function fetchOrdenes(params = {}) {
  // ✅ baseURL ya termina en /api, aquí NO usamos /api/...
  const candidates = [
    { url: "/ordenes", params },
    { url: "/ordenes/list", params },
    { url: "/reportes/ordenes", params },
  ];

  let lastErr = null;
  for (const c of candidates) {
    try {
      const { data } = await api.get(c.url, { params: c.params });
      const list = data?.data ?? data;
      if (Array.isArray(list)) return list;
      if (Array.isArray(list?.ordenes)) return list.ordenes;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudieron cargar órdenes");
}

async function fetchOrdenDetalle(id) {
  // ✅ SIN /api (para evitar /api/api)
  const candidates = [`/ordenes/${id}`, `/ordenes/detalle/${id}`];

  let lastErr = null;
  for (const url of candidates) {
    try {
      const { data } = await api.get(url);
      return data?.data ?? data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo cargar detalle");
}

async function patchEstadoOrden(ordenId, estado) {
  const candidates = [
    { url: `/ordenes/${ordenId}/estado`, body: { estado } },
    { url: `/ordenes/${ordenId}`, body: { estado } },
  ];

  let lastErr = null;
  for (const c of candidates) {
    try {
      const { data } = await api.patch(c.url, c.body);
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo actualizar estado");
}

/* ================= Component ================= */

export default function Ordenes() {
  const today = new Date();
  const seven = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [desde, setDesde] = useState(() => seven.toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(() => today.toISOString().slice(0, 10));
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [ordenes, setOrdenes] = useState([]);

  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [ordenSel, setOrdenSel] = useState(null);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 992);

  const timerRef = useRef(null);

  const load = async () => {
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const params = {
        desde,
        hasta,
        ...(estado ? { estado } : {}),
        ...(tipo ? { tipo } : {}),
        ...(q ? { q } : {}),
      };

      const list = await fetchOrdenes(params);

      const normalized = (Array.isArray(list) ? list : []).map((o) => {
        const createdAt =
          o.created_at ||
          o.fecha ||
          o.fecha_creacion ||
          o.createdAt ||
          o.fecha_hora ||
          null;

        const codigo = o.codigo || o.correlativo || o.numero || `#${o.id}`;
        const est = normalizeEstado(o.estado);

        return {
          ...o,
          codigo,
          createdAt,
          estado: est,
          tipo: (o.tipo || o.tipo_orden || "").toUpperCase() || "LLEVAR",
          mesa: o.mesa || o.numero_mesa || null,
          total: o.total ?? o.total_orden ?? o.monto_total ?? null,
          items: pickItems(o),
          // ✅ NUEVO: info del mesero
          mesero_nombre: o.mesero_nombre || o.creado_por_nombre || null,
        };
      });

      setOrdenes(normalized);
    } catch (e) {
      setOrdenes([]);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudieron cargar órdenes (revisa los endpoints de órdenes en el backend).",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const onResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!autoRefresh) return;

    timerRef.current = setInterval(() => load(), 15000);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [autoRefresh, desde, hasta, estado, tipo, q]);

  useEffect(() => {
    if (!socket?.on) return;
    const onUpdate = () => load();

    socket.on("ordenes:update", onUpdate);
    socket.on("cocina:update", onUpdate);
    socket.on("kds:update", onUpdate);
    socket.on("caja:update", onUpdate);

    return () => {
      try {
        socket.off("ordenes:update", onUpdate);
        socket.off("cocina:update", onUpdate);
        socket.off("kds:update", onUpdate);
        socket.off("caja:update", onUpdate);
      } catch {}
    };
    // eslint-disable-next-line
  }, []);

  const filtradas = useMemo(() => {
    const text = String(q || "").trim().toLowerCase();
    let list = [...ordenes];

    const d0 = new Date(`${desde}T00:00:00`);
    const d1 = new Date(`${hasta}T23:59:59`);

    list = list.filter((o) => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      if (Number.isNaN(d.getTime())) return true;
      return d >= d0 && d <= d1;
    });

    if (estado) list = list.filter((o) => o.estado === estado);
    if (tipo) list = list.filter((o) => o.tipo === tipo);

    if (text) {
      list = list.filter((o) => {
        const base = `${o.codigo} ${o.tipo} ${o.mesa ?? ""} ${o.estado} ${
          o.cliente_nombre ?? ""
        } ${o.cliente ?? ""}`.toLowerCase();
        return base.includes(text);
      });
    }

    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [ordenes, desde, hasta, estado, tipo, q]);

  const kpis = useMemo(() => {
    const base = filtradas;
    const c = (s) => base.filter((o) => o.estado === s).length;
    return {
      total: base.length,
      nueva: c("NUEVA"),
      prep: c("EN_PREPARACION"),
      lista: c("LISTA"),
      entregada: c("ENTREGADA"),
      anulada: c("ANULADA"),
    };
  }, [filtradas]);

  const badgeEstado = (s) => {
    const e = normalizeEstado(s);
    const badgeStyle = { fontSize: "0.7rem", padding: "0.25rem 0.5rem" };
    if (e === "NUEVA") return <Badge bg="secondary" style={badgeStyle}>NUEVA</Badge>;
    if (e === "EN_PREPARACION") return <Badge bg="warning" text="dark" style={badgeStyle}>EN PREP.</Badge>;
    if (e === "LISTA") return <Badge bg="success" style={badgeStyle}>LISTA</Badge>;
    if (e === "ENTREGADA") return <Badge bg="dark" style={badgeStyle}>ENTREGADA</Badge>;
    if (e === "ANULADA") return <Badge bg="danger" style={badgeStyle}>ANULADA</Badge>;
    return <Badge bg="light" text="dark" style={badgeStyle}>{e}</Badge>;
  };

  const openDetalle = async (orden) => {
    setShowDetalle(true);
    setDetalleLoading(true);
    setOrdenSel(null);

    try {
      const hasItems = pickItems(orden).length > 0;

      if (hasItems) {
        // Asegura que items estén bien
        setOrdenSel({ ...orden, items: pickItems(orden) });
      } else {
        const det = await fetchOrdenDetalle(orden.id);

        const createdAt =
          det?.created_at || det?.fecha || det?.createdAt || orden.createdAt;

        const merged = {
          ...orden,
          ...det,
          codigo: orden.codigo || det?.codigo,
          createdAt,
          estado: normalizeEstado(det?.estado ?? orden.estado),
          tipo:
            (det?.tipo || det?.tipo_orden || orden.tipo || "").toUpperCase() ||
            "LLEVAR",
          mesa: det?.mesa ?? det?.numero_mesa ?? orden.mesa ?? null,
        };

        setOrdenSel({ ...merged, items: pickItems(merged) });
      }
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cargar el detalle.",
      });
      setShowDetalle(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const cambiarEstado = async (orden, estadoNuevo) => {
    setBusyId(orden.id);
    setMsg({ type: "", text: "" });
    try {
      await patchEstadoOrden(orden.id, estadoNuevo);
      setMsg({
        type: "success",
        text: `✅ ${orden.codigo} → ${estadoNuevo.replace("_", " ")}`,
      });
      await load();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cambiar estado.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const marcarEntregada = async (orden) => {
    setBusyId(orden.id);
    setMsg({ type: "", text: "" });
    try {
      await api.patch(`/ordenes/${orden.id}/entregar`);
      setMsg({
        type: "success",
        text: `✅ ${orden.codigo} → ENTREGADA`,
      });
      await load();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo marcar como entregada.",
      });
    } finally {
      setBusyId(null);
    }
  };

const accionesBotones = (o) => {
  const est = normalizeEstado(o.estado);
  const disabled = busyId === o.id;

  return (
    <div className="d-flex gap-1 justify-content-end flex-wrap">
      {disabled ? (
        <Spinner size="sm" animation="border" />
      ) : (
        <>
          {/* Ver detalle - siempre visible */}
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => openDetalle(o)}
            title="Ver detalle"
            style={{ padding: "2px 6px", fontSize: "11px" }}
          >
            <FaEye size={11} />
          </Button>

          {/* NUEVA -> EN_PREPARACION */}
          {est === "NUEVA" && (
            <Button
              size="sm"
              variant="outline-warning"
              onClick={() => cambiarEstado(o, "EN_PREPARACION")}
              title="En preparación"
              disabled={disabled}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              <FaClock size={11} />
            </Button>
          )}

          {/* EN_PREPARACION -> LISTA */}
          {est === "EN_PREPARACION" && (
            <Button
              size="sm"
              variant="outline-success"
              onClick={() => cambiarEstado(o, "LISTA")}
              title="Marcar como lista"
              disabled={disabled}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              <FaCheckCircle size={11} />
            </Button>
          )}

          {/* DELIVERY facturado LISTA -> ENTREGADA (manual) */}
          {est === "LISTA" && o.tipo === "DELIVERY" && o.factura_id && (
            <Button
              size="sm"
              variant="outline-success"
              onClick={() => marcarEntregada(o)}
              title="Marcar como entregada"
              disabled={disabled}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              <FaTruck size={11} />
            </Button>
          )}

          {/* Regresar a NUEVA */}
          {["EN_PREPARACION", "LISTA"].includes(est) && (
            <Button
              size="sm"
              variant="outline-info"
              onClick={() => cambiarEstado(o, "NUEVA")}
              title="Regresar a nueva"
              disabled={disabled}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              <FaUndo size={11} />
            </Button>
          )}

          {/* Anular */}
          {!["ANULADA", "ENTREGADA"].includes(est) && (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => cambiarEstado(o, "ANULADA")}
              title="Anular orden"
              disabled={disabled}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              <FaBan size={11} />
            </Button>
          )}
        </>
      )}
    </div>
  );
};

  return (
   <Container fluid className="py-3">
  {/* Header */}
  <Row className="align-items-center g-2 mb-2">
    <Col>
      <div className="d-flex align-items-center gap-2">
        <div
          className="rounded-3 d-inline-flex align-items-center justify-content-center"
          style={{ width: 40, height: 40, background: "rgba(13,110,253,.12)" }}
        >
          <FaClipboardList />
        </div>
        <div>
          <div className="fw-bold" style={{ fontSize: 18 }}>
            Órdenes (Monitor){" "}
            <Badge bg="success" className="ms-2">
              LIVE
            </Badge>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Control general · Filtros · Estados · Detalle
          </div>
        </div>
      </div>
    </Col>

    <Col xs="auto" className="d-flex gap-2">
      <Button
        variant={autoRefresh ? "dark" : "outline-dark"}
        onClick={() => setAutoRefresh((v) => !v)}
      >
        {autoRefresh ? "Auto ON" : "Auto OFF"}
      </Button>

      <Button
        variant="outline-primary"
        onClick={load}
        disabled={loading}
        className="d-inline-flex align-items-center gap-2"
      >
        <FaSyncAlt />
        Actualizar
      </Button>
    </Col>
  </Row>

  {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

  {/* KPIs */}
  <Row className="g-3 mb-3">
    {[
      { label: "Total", val: kpis.total },
      { label: "Nuevas", val: kpis.nueva },
      { label: "Preparación", val: kpis.prep },
      { label: "Listas", val: kpis.lista },
      { label: "Entregadas", val: kpis.entregada },
      { label: "Anuladas", val: kpis.anulada },
    ].map((k) => (
      <Col key={k.label} xs={6} md={4} lg={2}>
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body className="py-3">
            <div className="text-muted" style={{ fontSize: 12 }}>
              {k.label}
            </div>
            <div className="fw-bold" style={{ fontSize: 22 }}>
              {k.val}
            </div>
          </Card.Body>
        </Card>
      </Col>
    ))}
  </Row>

  {/* Filtros */}
  <Card className="shadow-sm border-0 rounded-4 mb-3">
    <Card.Body className="py-3">
      <Row className="g-2 align-items-end">
        <Col xs={6} lg={2}>
          <Form.Label className="fw-semibold">Desde</Form.Label>
          <Form.Control type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Col>
        <Col xs={6} lg={2}>
          <Form.Label className="fw-semibold">Hasta</Form.Label>
          <Form.Control type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Col>
        <Col xs={6} lg={2}>
          <Form.Label className="fw-semibold">Estado</Form.Label>
          <Form.Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="NUEVA">NUEVA</option>
            <option value="EN_PREPARACION">EN PREPARACIÓN</option>
            <option value="LISTA">LISTA</option>
            <option value="ENTREGADA">ENTREGADA</option>
            <option value="ANULADA">ANULADA</option>
          </Form.Select>
        </Col>
        <Col xs={6} lg={2}>
          <Form.Label className="fw-semibold">Tipo</Form.Label>
          <Form.Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="MESA">MESA</option>
            <option value="LLEVAR">LLEVAR</option>
            <option value="DELIVERY">DELIVERY</option>
          </Form.Select>
        </Col>

        <Col lg={4}>
          <Form.Label className="fw-semibold">Buscar</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Código, mesa, tipo, cliente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </InputGroup>
        </Col>
      </Row>
    </Card.Body>
  </Card>

  {/* Listado */}
{loading ? (
  <Card className="shadow-sm border-0 rounded-4 w-100 overflow-hidden">
    <Card.Body className="py-5 text-center text-muted">
      <div className="d-flex align-items-center justify-content-center gap-2">
        <Spinner animation="border" role="status" />
        <span className="fw-semibold">Cargando…</span>
      </div>
    </Card.Body>
  </Card>
) : isMobile ? (
  <div className="d-grid gap-2">
    {filtradas.length === 0 ? (
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body className="text-muted">No hay órdenes con esos filtros.</Card.Body>
      </Card>
    ) : (
      filtradas.map((o) => {
        const mins = minutesAgo(o.createdAt);
        const warn = mins !== null && mins >= 15;

        return (
          <Card key={o.id} className="shadow-sm border-0 rounded-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="me-2">
                  <div className="fw-bold" style={{ fontSize: 16 }}>
                    {o.codigo}
                  </div>

                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {fmtDateTime(o.createdAt)}
                  </div>

                  {/* ✅ NUEVO: Info mesero en vista pendiente cobro */}
                  {vista === "pendiente_cobro" && o.mesero_nombre ? (
                    <div className="text-primary fw-semibold mt-1" style={{ fontSize: 12 }}>
                      👤 {o.mesero_nombre}
                    </div>
                  ) : null}

                  <div className="mt-1 d-flex gap-2 flex-wrap">
                    <Badge bg="dark">{o.tipo}</Badge>

                    {o.tipo === "MESA" ? (
                      <Badge bg="info" text="dark">
                        Mesa {o.mesa ?? "—"}
                      </Badge>
                    ) : null}

                    {badgeEstado(o.estado)}

                    {mins !== null ? (
                      <Badge
                        bg={warn ? "danger" : "light"}
                        text={warn ? undefined : "dark"}
                      >
                        {mins} min
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="text-end">
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Total
                  </div>
                  <div className="fw-bold">
                    {o.total == null ? "—" : money(o.total)}
                  </div>
                </div>
              </div>

              <hr className="my-3" />

              <div
                className="d-flex justify-content-between text-muted"
                style={{ fontSize: 12 }}
              >
                <span>
                  Items: <b>{pickItems(o).length || o.items_count || 0}</b>
                </span>
              </div>

              <div className="mt-2">
                {accionesBotones(o)}
              </div>
            </Card.Body>
          </Card>
        );
      })
    )}
  </div>
) : (
  // ✅ Desktop: FULL ancho (sin mx-auto / sin maxWidth)
  <Card className="shadow-sm border-0 rounded-4 w-100 overflow-hidden">
    <Card.Body className="p-0">
      <div
        className="w-100 overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: 420 }}
      >
        <Table hover size="sm" className="mb-0 align-middle w-100">
          <thead className="table-light sticky-top">
            <tr className="small text-uppercase">
              <th className="text-nowrap" style={{ width: "100px" }}>Código</th>
              <th className="text-nowrap" style={{ width: "140px" }}>Fecha</th>
              <th className="text-nowrap" style={{ width: "80px" }}>Tipo</th>
              <th className="text-nowrap text-center" style={{ width: "60px" }}>Mesa</th>
              <th className="text-nowrap" style={{ width: "110px" }}>Estado</th>
              <th className="text-nowrap text-center" style={{ width: "60px" }}>Items</th>
              <th className="text-nowrap text-end" style={{ width: "90px" }}>Total</th>
              <th className="text-nowrap text-end" style={{ minWidth: "140px" }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted py-4 text-center">
                  No hay órdenes con esos filtros.
                </td>
              </tr>
            ) : (
              filtradas.map((o) => {
                const mins = minutesAgo(o.createdAt);
                const warn = mins !== null && mins >= 15;

                return (
                <tr key={o.id} className="small">
                  <td className="fw-bold text-nowrap">{o.codigo}</td>

                  <td className="text-muted">
                    <span
                      className="d-inline-block text-truncate"
                      style={{ maxWidth: 170 }}
                      title={fmtDateTime(o.createdAt)}
                    >
                      {fmtDateTime(o.createdAt)}
                    </span>
                  </td>

                  <td className="text-nowrap">
                    <Badge bg="dark" className="small">
                      {o.tipo}
                    </Badge>
                  </td>

                  <td className="text-center text-nowrap">
                    {o.tipo === "MESA" ? o.mesa ?? "—" : "—"}
                  </td>

                  <td className="text-nowrap">{badgeEstado(o.estado)}</td>

                  <td className="fw-semibold text-center text-nowrap">
                    {pickItems(o).length || o.items_count || 0}
                  </td>

                  <td className="text-end fw-bold text-nowrap">
                    {o.total == null ? "—" : money(o.total)}
                  </td>

                  <td className="text-end text-nowrap">
                    {accionesBotones(o)}
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </Table>
      </div>
    </Card.Body>
  </Card>
)}

  {/* Modal Detalle */}
  <Modal show={showDetalle} onHide={() => setShowDetalle(false)} size="lg" centered>
    <Modal.Header closeButton>
      <Modal.Title className="fw-bold">
        Detalle{" "}
        {ordenSel?.codigo ? (
          <Badge bg="dark" className="ms-2">
            {ordenSel.codigo}
          </Badge>
        ) : null}
      </Modal.Title>
    </Modal.Header>

    <Modal.Body>
      {detalleLoading ? (
        <div className="py-4 text-center text-muted">
          <Spinner animation="border" className="me-2" />
          Cargando detalle...
        </div>
      ) : !ordenSel ? (
        <div className="text-muted">Sin información.</div>
      ) : (
        <>
          <Row className="g-2">
            <Col md={6}>
              <Card className="rounded-4 border">
                <Card.Body className="py-3">
                  <div className="text-muted small">Tipo</div>
                  <div className="fw-bold">{ordenSel.tipo}</div>
                  {ordenSel.tipo === "MESA" ? (
                    <div className="text-muted small mt-1">
                      Mesa: <span className="fw-semibold">{ordenSel.mesa ?? "—"}</span>
                    </div>
                  ) : null}
                  <div className="text-muted small mt-1">
                    Fecha: {fmtDateTime(ordenSel.createdAt)}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="rounded-4 border">
                <Card.Body className="py-3">
                  <div className="text-muted small">Estado</div>
                  <div className="fw-bold">{badgeEstado(ordenSel.estado)}</div>
                  {ordenSel.notas ? (
                    <div className="text-muted small mt-2">
                      Notas: <span className="fw-semibold">{ordenSel.notas}</span>
                    </div>
                  ) : (
                    <div className="text-muted small mt-2">Sin notas.</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <hr />

          <div className="fw-bold mb-2">Items</div>

          {/* ✅ Detalle: también más compacto */}
          <Table hover size="sm" className="mb-0 align-middle">
            <thead className="table-light">
              <tr className="small text-uppercase">
                <th className="text-nowrap" style={{ width: 80 }}>
                  Cant.
                </th>
                <th>Producto</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {pickItems(ordenSel).length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No hay items en la respuesta (recomendado incluir items en backend).
                  </td>
                </tr>
              ) : (
                pickItems(ordenSel).map((it, idx) => (
                  <tr key={idx}>
                    <td className="fw-semibold text-nowrap">
                      {it.cantidad ?? it.qty ?? 1}
                    </td>
                    <td className="fw-semibold">
                      {it.nombre || it.producto_nombre || it.producto || "Item"}
                    </td>
                    <td className="text-muted">{it.notas || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </>
      )}
    </Modal.Body>

    <Modal.Footer>
      <Button variant="outline-secondary" onClick={() => setShowDetalle(false)}>
        Cerrar
      </Button>
    </Modal.Footer>
  </Modal>
</Container>
  );
}
