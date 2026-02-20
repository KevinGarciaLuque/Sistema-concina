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
  Row,
  Spinner,
  Table,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  FaUtensils,
  FaSyncAlt,
  FaSearch,
  FaPlay,
  FaCheckCircle,
  FaUndo,
  FaEye,
  FaExclamationTriangle,
  FaClock,
} from "react-icons/fa";
import api from "../api";
import { socket } from "../socket";

function normalizeEstado(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["NUEVA", "NUEVO", "NEW"].includes(s)) return "NUEVA";
  if (["EN_PREPARACION", "EN PREPARACION", "PREPARANDO", "COCINANDO", "IN_PROGRESS"].includes(s)) return "EN_PREPARACION";
  if (["LISTA", "LISTO", "READY"].includes(s)) return "LISTA";
  if (["ENTREGADA", "ENTREGADO", "DELIVERED"].includes(s)) return "ENTREGADA";
  if (["ANULADA", "ANULADO", "CANCELADA", "CANCELADO"].includes(s)) return "ANULADA";
  return s || "NUEVA";
}

function fmtTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function timeAgo(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, totalMinutes: minutes };
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

/**
 * Intenta varios endpoints para no depender del nombre exacto.
 */
async function fetchKdsOrders() {
  const candidates = [
    "/cocina/kds",
    "/ordenes/kds",
    "/cocina",
    "/ordenes?modo=kds",
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      const { data } = await api.get(url);
      const list = data?.data ?? data; // soporta {data:[]} o []
      if (Array.isArray(list)) return list;
      if (Array.isArray(list?.ordenes)) return list.ordenes;
    } catch (e) {
      lastErr = e;
      // sigue intentando
    }
  }

  throw lastErr || new Error("No se pudo cargar KDS");
}

/**
 * Intenta varios endpoints para actualizar estado.
 */
async function patchEstadoOrden(ordenId, estado) {
  const candidates = [
    { url: `/ordenes/${ordenId}/estado`, body: { estado } },
    { url: `/cocina/ordenes/${ordenId}/estado`, body: { estado } },
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

export default function Cocina() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [ordenes, setOrdenes] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("NUEVA");

  const [showDetalle, setShowDetalle] = useState(false);
  const [ordenSel, setOrdenSel] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 992);

  const refreshTimerRef = useRef(null);

  const load = async () => {
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const list = await fetchKdsOrders();

      // normaliza estructura mínima esperada
      const normalized = list.map((o) => {
        const estado = normalizeEstado(o.estado);
        const createdAt =
          o.created_at || o.fecha || o.fecha_creacion || o.createdAt || o.fecha_hora || null;

        const codigo = o.codigo || o.correlativo || o.numero || `#${o.id}`;
        const tipo = (o.tipo || o.tipo_orden || "").toUpperCase() || "LLEVAR";
        const mesa = o.mesa || o.numero_mesa || null;

        const items =
          safeArray(o.items) ||
          safeArray(o.detalle) ||
          safeArray(o.detalles) ||
          safeArray(o.productos);

        return {
          ...o,
          estado,
          createdAt,
          codigo,
          tipo,
          mesa,
          items,
        };
      });

      // filtra anuladas/entregadas (KDS normalmente no las muestra)
      const visible = normalized.filter((o) => !["ANULADA", "ENTREGADA"].includes(o.estado));
      setOrdenes(visible);
    } catch (e) {
      setOrdenes([]);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo cargar el tablero de cocina. Revisa el endpoint de KDS en el backend.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const onResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", onResize);

    // auto refresh suave cada 15s
    refreshTimerRef.current = setInterval(() => {
      load();
    }, 15000);

    return () => {
      window.removeEventListener("resize", onResize);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
    // eslint-disable-next-line
  }, []);

  // Realtime: si el backend emite eventos, recargamos al instante
  useEffect(() => {
    if (!socket?.on) return;

    const onUpdate = () => load();
    socket.on("ordenes:update", onUpdate);
    socket.on("cocina:update", onUpdate);
    socket.on("kds:update", onUpdate);

    return () => {
      try {
        socket.off("ordenes:update", onUpdate);
        socket.off("cocina:update", onUpdate);
        socket.off("kds:update", onUpdate);
      } catch {}
    };
    // eslint-disable-next-line
  }, []);

  const ordenesFiltradas = useMemo(() => {
    const text = String(q || "").trim().toLowerCase();
    if (!text) return ordenes;

    return ordenes.filter((o) => {
      const base =
        `${o.codigo} ${o.tipo} ${o.mesa ?? ""} ${o.cliente_nombre ?? ""} ${o.cliente ?? ""}`.toLowerCase();
      return base.includes(text);
    });
  }, [ordenes, q]);

  const byEstado = useMemo(() => {
    const map = { NUEVA: [], EN_PREPARACION: [], LISTA: [] };
    for (const o of ordenesFiltradas) {
      if (map[o.estado]) map[o.estado].push(o);
    }
    // ordena: más viejas arriba
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    return map;
  }, [ordenesFiltradas]);

  const countTotal = ordenesFiltradas.length;

  const headerBadge = (estado) => {
    if (estado === "NUEVA") return <Badge bg="secondary">Nuevas</Badge>;
    if (estado === "EN_PREPARACION") return <Badge bg="warning" text="dark">En preparación</Badge>;
    if (estado === "LISTA") return <Badge bg="success">Listas</Badge>;
    return <Badge bg="light" text="dark">{estado}</Badge>;
  };

  const actionTo = async (orden, estadoNuevo) => {
    setMsg({ type: "", text: "" });
    setBusyId(orden.id);

    try {
      await patchEstadoOrden(orden.id, estadoNuevo);
      setMsg({ type: "success", text: `✅ Orden ${orden.codigo} → ${estadoNuevo.replace("_", " ")}` });
      await load();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cambiar el estado. Revisa el endpoint PATCH en backend.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openDetalle = async (orden) => {
    setOrdenSel(orden); // muestra el modal con datos básicos primero
    setShowDetalle(true);
    setLoadingDetalle(true);

    // Cargar detalle completo del backend
    try {
      const { data } = await api.get(`/cocina/ordenes/${orden.id}`);
      const ordenCompleta = data?.data ?? data;
      
      // Extrae items de diferentes estructuras posibles
      const items = 
        safeArray(ordenCompleta.items) || 
        safeArray(ordenCompleta.detalle) || 
        safeArray(ordenCompleta?.orden?.items) ||
        safeArray(ordenCompleta?.orden?.detalle) ||
        orden.items || // fallback a los datos locales
        [];

      // Actualiza con la información completa
      setOrdenSel({
        ...orden,
        ...ordenCompleta?.orden,
        items,
      });
    } catch (e) {
      console.error("Error cargando detalle de orden:", e);
      // Si falla, deja los datos que ya tenía
    } finally {
      setLoadingDetalle(false);
    }
  };

  const OrderCard = ({ orden }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Actualizar cada segundo para el temporizador
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    const time = timeAgo(orden.createdAt);
    const warn = time !== null && time.totalMinutes >= 15; // alerta si lleva mucho tiempo

    const items = safeArray(orden.items);
    const preview = items.slice(0, 4);

    return (
      <Card className="rounded-4 border shadow-sm mb-2">
        <Card.Body className="py-3">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="fw-bold" style={{ fontSize: 16 }}>{orden.codigo}</div>
                {orden.tipo ? <Badge bg="dark">{orden.tipo}</Badge> : null}
                {orden.tipo === "MESA" && orden.mesa ? <Badge bg="info" text="dark">Mesa {orden.mesa}</Badge> : null}
                {warn ? (
                  <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                    <FaExclamationTriangle /> {time.minutes}:{String(time.seconds).padStart(2, '0')}
                  </Badge>
                ) : time !== null ? (
                  <Badge bg="light" text="dark" className="d-inline-flex align-items-center gap-1">
                    <FaClock /> {time.minutes}:{String(time.seconds).padStart(2, '0')}
                  </Badge>
                ) : null}
              </div>

              <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                {orden.createdAt ? `Creada: ${fmtDateTime(orden.createdAt)}` : "—"}
              </div>

              {orden.cliente_nombre || orden.cliente ? (
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Cliente: <span className="fw-semibold">{orden.cliente_nombre || orden.cliente}</span>
                </div>
              ) : null}
            </div>

            <Button
              size="sm"
              variant="outline-dark"
              className="d-inline-flex align-items-center gap-2"
              onClick={() => openDetalle(orden)}
            >
              <FaEye /> Ver
            </Button>
          </div>

          <div className="mt-2">
            {preview.length ? (
              <div>
                {preview.map((it, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="d-flex justify-content-between gap-2">
                      <div className="flex-grow-1">
                        <div style={{ fontSize: 15 }}>
                          <span className="fw-bold">{it.cantidad ?? it.qty ?? 1}×</span>{" "}
                          <span className="fw-semibold">{it.nombre || it.producto_nombre || it.producto || "Item"}</span>
                        </div>
                        {safeArray(it.opciones).length > 0 && (
                          <div className="mt-1">
                            {it.opciones.map((op, opIdx) => (
                              <Badge key={opIdx} bg="light" text="dark" className="me-1 mb-1" style={{ fontSize: 11 }}>
                                {op.opcion_nombre}
                                {Number(op.precio_extra || 0) > 0 ? ` (+L ${Number(op.precio_extra).toFixed(2)})` : ''}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {it.notas ? <Badge bg="warning" text="dark">Nota</Badge> : null}
                    </div>
                  </div>
                ))}
                {items.length > preview.length ? (
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    +{items.length - preview.length} más…
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-muted small">Sin detalle de items (revisa la consulta del backend).</div>
            )}
          </div>

          <div className="mt-3 d-flex gap-2 flex-wrap">
            {orden.estado === "NUEVA" ? (
              <Button
                size="sm"
                variant="warning"
                className="d-inline-flex align-items-center gap-2"
                onClick={() => actionTo(orden, "EN_PREPARACION")}
                disabled={busyId === orden.id}
              >
                {busyId === orden.id ? <Spinner size="sm" animation="border" /> : <FaPlay />}
                Iniciar
              </Button>
            ) : null}

            {orden.estado === "EN_PREPARACION" ? (
              <>
                <Button
                  size="sm"
                  variant="success"
                  className="d-inline-flex align-items-center gap-2"
                  onClick={() => actionTo(orden, "LISTA")}
                  disabled={busyId === orden.id}
                >
                  {busyId === orden.id ? <Spinner size="sm" animation="border" /> : <FaCheckCircle />}
                  Lista
                </Button>

                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="d-inline-flex align-items-center gap-2"
                  onClick={() => actionTo(orden, "NUEVA")}
                  disabled={busyId === orden.id}
                >
                  <FaUndo />
                  Regresar
                </Button>
              </>
            ) : null}

            {orden.estado === "LISTA" ? (
              <Button
                size="sm"
                variant="outline-warning"
                className="d-inline-flex align-items-center gap-2"
                onClick={() => actionTo(orden, "EN_PREPARACION")}
                disabled={busyId === orden.id}
              >
                <FaUndo />
                Volver a preparación
              </Button>
            ) : null}
          </div>
        </Card.Body>
      </Card>
    );
  };

  const Column = ({ title, estado }) => (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 16 }}>{title}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {headerBadge(estado)}{" "}
              <Badge bg="light" text="dark" className="ms-1">{byEstado[estado].length}</Badge>
            </div>
          </div>
        </div>

        <hr />

        {loading ? (
          <div className="py-4 text-center text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando...
          </div>
        ) : byEstado[estado].length === 0 ? (
          <div className="text-muted">Sin órdenes en esta columna.</div>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
            {byEstado[estado].map((o) => (
              <OrderCard key={o.id} orden={o} />
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="py-3">
      {/* Header */}
      <Row className="align-items-center g-2 mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40, background: "rgba(255,193,7,.18)" }}
            >
              <FaUtensils />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Cocina (KDS){" "}
                <Badge bg="success" className="ms-2">LIVE</Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Tablero operativo · Estados · Flujo de preparación
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={load}
            className="d-inline-flex align-items-center gap-2"
            disabled={loading}
          >
            <FaSyncAlt />
            Actualizar
          </Button>
        </Col>
      </Row>

      {/* búsqueda + resumen */}
      <Card className="shadow-sm border-0 rounded-4 mb-3">
        <Card.Body className="py-3">
          <Row className="align-items-center g-2">
            <Col lg={5}>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por código, mesa, tipo, cliente…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Badge bg="light" text="dark">Total: {countTotal}</Badge>
                <Badge bg="secondary">Nuevas: {byEstado.NUEVA.length}</Badge>
                <Badge bg="warning" text="dark">Preparación: {byEstado.EN_PREPARACION.length}</Badge>
                <Badge bg="success">Listas: {byEstado.LISTA.length}</Badge>
                <Badge bg="dark" className="ms-auto">
                  Auto-refresh: 15s
                </Badge>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* Mobile: Tabs | Desktop: 3 columnas */}
      {isMobile ? (
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body>
            <Tabs activeKey={tab} onSelect={(k) => setTab(k || "NUEVA")} className="mb-3">
              <Tab eventKey="NUEVA" title={`Nuevas (${byEstado.NUEVA.length})`}>
                <Column title="Órdenes nuevas" estado="NUEVA" />
              </Tab>
              <Tab eventKey="EN_PREPARACION" title={`Preparación (${byEstado.EN_PREPARACION.length})`}>
                <Column title="En preparación" estado="EN_PREPARACION" />
              </Tab>
              <Tab eventKey="LISTA" title={`Listas (${byEstado.LISTA.length})`}>
                <Column title="Listas" estado="LISTA" />
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          <Col lg={4}><Column title="Órdenes nuevas" estado="NUEVA" /></Col>
          <Col lg={4}><Column title="En preparación" estado="EN_PREPARACION" /></Col>
          <Col lg={4}><Column title="Listas" estado="LISTA" /></Col>
        </Row>
      )}

      {/* Modal detalle */}
      <Modal show={showDetalle} onHide={() => setShowDetalle(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Detalle de orden {ordenSel?.codigo ? <Badge bg="dark" className="ms-2">{ordenSel.codigo}</Badge> : null}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!ordenSel ? (
            <div className="text-muted">Sin orden seleccionada.</div>
          ) : (
            <>
              <Row className="g-2">
                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Tipo</div>
                      <div className="fw-bold">{ordenSel.tipo || "—"}</div>
                      {ordenSel.tipo === "MESA" && ordenSel.mesa ? (
                        <div className="text-muted small mt-1">Mesa: <span className="fw-semibold">{ordenSel.mesa}</span></div>
                      ) : null}
                      <div className="text-muted small mt-1">Creada: {ordenSel.createdAt ? fmtDateTime(ordenSel.createdAt) : "—"}</div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Estado</div>
                      <div className="fw-bold">{ordenSel.estado}</div>
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
              <Table responsive className="mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Cant.</th>
                    <th>Producto</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDetalle ? (
                    <tr>
                      <td colSpan={3} className="text-center py-3 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Cargando detalle...
                      </td>
                    </tr>
                  ) : safeArray(ordenSel.items).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-muted">
                        No hay items en la respuesta. (Tu backend debe incluir detalle: items/detalle/productos).
                      </td>
                    </tr>
                  ) : (
                    safeArray(ordenSel.items).map((it, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold">{it.cantidad ?? it.qty ?? 1}</td>
                        <td>
                          <div className="fw-semibold">{it.nombre || it.producto_nombre || it.producto || "Item"}</div>
                          {safeArray(it.opciones).length > 0 && (
                            <div className="mt-1">
                              {it.opciones.map((op, opIdx) => (
                                <Badge key={opIdx} bg="light" text="dark" className="me-1 mb-1">
                                  {op.opcion_nombre} 
                                  {Number(op.precio_extra || 0) > 0 ? ` (+L ${Number(op.precio_extra).toFixed(2)})` : ''}
                                </Badge>
                              ))}
                            </div>
                          )}
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

        <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
          <div className="text-muted small">
            Tip: Cambia estado desde la tarjeta para flujo rápido.
          </div>
          <Button variant="outline-secondary" onClick={() => setShowDetalle(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
