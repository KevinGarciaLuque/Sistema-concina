import { useEffect, useMemo, useState } from "react";
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
  
} from "react-bootstrap";
 import api from "../api";

import {
  FaCashRegister,
  FaLockOpen,
  FaLock,
  FaSyncAlt,
  FaSearch,
  FaEye,
  FaTimes,
} from "react-icons/fa";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Caja() {
  const user = useMemo(() => getStoredUser(), []);
  const rol = String(user?.rol || "").toLowerCase();

  const isAdmin = rol === "admin";
  const isSupervisor = rol === "supervisor";
  const canAdmin = isAdmin || isSupervisor;

  // ===== estado caja activa =====
  const [loading, setLoading] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [resumenActiva, setResumenActiva] = useState(null);

  // ===== forms =====
  const [montoApertura, setMontoApertura] = useState("");
  const [montoCierre, setMontoCierre] = useState("");

  const [busyAbrir, setBusyAbrir] = useState(false);
  const [busyCerrar, setBusyCerrar] = useState(false);

  // ===== alerts =====
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ===== admin: historial =====
  const [filtro, setFiltro] = useState(() => {
    // por defecto: hoy
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const ymd = `${yyyy}-${mm}-${dd}`;
    return { from: ymd, to: ymd, estado: "" };
  });

  const [loadingSesiones, setLoadingSesiones] = useState(false);
  const [sesiones, setSesiones] = useState([]);

  const [showResumen, setShowResumen] = useState(false);
  const [resumenModal, setResumenModal] = useState(null);
  const [loadingResumenModal, setLoadingResumenModal] = useState(false);

  // ===== helpers API =====
  const loadSesionActiva = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const { data } = await api.get("/api/caja/sesion-activa");
      setSesionActiva(data?.data || null);

      // si hay sesión activa, traer resumen
      if (data?.data?.id) {
        const r = await api.get(`/api/caja/sesiones/${data.data.id}/resumen`);
        setResumenActiva(r.data?.data || null);
      } else {
        setResumenActiva(null);
      }
    } catch (e) {
      const t = e?.response?.data?.message || "No se pudo cargar la caja.";
      setMsg({ type: "danger", text: t });
      setSesionActiva(null);
      setResumenActiva(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSesionesAdmin = async () => {
    if (!canAdmin) return;
    setLoadingSesiones(true);
    setMsg({ type: "", text: "" });
    try {
      const params = {};
      if (filtro.from) params.from = filtro.from;
      if (filtro.to) params.to = filtro.to;
      if (filtro.estado) params.estado = filtro.estado;

      const { data } = await api.get("/api/caja/sesiones", { params });
      setSesiones(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      const t = e?.response?.data?.message || "No se pudo cargar el historial de caja.";
      setMsg({ type: "danger", text: t });
      setSesiones([]);
    } finally {
      setLoadingSesiones(false);
    }
  };

  const abrirCaja = async () => {
    const n = Number(montoApertura);
    if (!Number.isFinite(n) || n < 0) {
      setMsg({ type: "warning", text: "Monto de apertura inválido." });
      return;
    }

    setBusyAbrir(true);
    setMsg({ type: "", text: "" });
    try {
      await api.post("/api/caja/abrir", { monto_apertura: n });
      setMsg({ type: "success", text: "✅ Caja abierta correctamente." });
      setMontoApertura("");
      await loadSesionActiva();
      await loadSesionesAdmin();
    } catch (e) {
      const t = e?.response?.data?.message || "No se pudo abrir caja.";
      setMsg({ type: "danger", text: t });
    } finally {
      setBusyAbrir(false);
    }
  };

  const cerrarCaja = async () => {
    const n = Number(montoCierre);
    if (!Number.isFinite(n) || n < 0) {
      setMsg({ type: "warning", text: "Monto de cierre inválido." });
      return;
    }

    setBusyCerrar(true);
    setMsg({ type: "", text: "" });
    try {
      await api.post("/api/caja/cerrar", {
        sesion_id: sesionActiva?.id, // opcional, pero mejor enviarlo
        monto_cierre: n,
      });
      setMsg({ type: "success", text: "✅ Caja cerrada correctamente." });
      setMontoCierre("");
      await loadSesionActiva();
      await loadSesionesAdmin();
    } catch (e) {
      const t = e?.response?.data?.message || "No se pudo cerrar caja.";
      setMsg({ type: "danger", text: t });
    } finally {
      setBusyCerrar(false);
    }
  };

  const verResumen = async (sesionId) => {
    setShowResumen(true);
    setLoadingResumenModal(true);
    setResumenModal(null);

    try {
      const { data } = await api.get(`/api/caja/sesiones/${sesionId}/resumen`);
      setResumenModal(data?.data || null);
    } catch (e) {
      const t = e?.response?.data?.message || "No se pudo cargar el resumen.";
      setResumenModal({ error: true, message: t });
    } finally {
      setLoadingResumenModal(false);
    }
  };

  // ===== mount =====
  useEffect(() => {
    loadSesionActiva();
    // eslint-disable-next-line
  }, []);

  // ===== socket realtime (opcional) =====
  useEffect(() => {
    if (!socket?.on) return;

    const onUpdate = () => {
      // refresca caja activa (y resumen)
      loadSesionActiva();
      // refresca admin si aplica
      if (canAdmin) loadSesionesAdmin();
    };

    socket.on("caja:update", onUpdate);

    return () => {
      try {
        socket.off("caja:update", onUpdate);
      } catch {}
    };
    // eslint-disable-next-line
  }, [canAdmin]);

  // ===== admin: cargar sesiones cuando filtro cambia (manual con botón) =====
  useEffect(() => {
    if (canAdmin) loadSesionesAdmin();
    // eslint-disable-next-line
  }, [canAdmin]);

  const estadoBadge = (estado) => {
    const e = String(estado || "").toUpperCase();
    if (e === "ABIERTA") return <Badge bg="success">ABIERTA</Badge>;
    if (e === "CERRADA") return <Badge bg="secondary">CERRADA</Badge>;
    return <Badge bg="light" text="dark">{e || "—"}</Badge>;
  };

  return (
    <Container fluid className="py-3">
      <Row className="align-items-center g-2 mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-3"
              style={{ width: 40, height: 40, background: "rgba(13,110,253,.1)" }}
            >
              <FaCashRegister />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>Caja</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Apertura, cierre, cuadre y control (POS)
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={loadSesionActiva}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaSyncAlt />
            Actualizar
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type} className="mb-3">{msg.text}</Alert> : null}

      {/* ===== Estado Caja Activa ===== */}
      <Row className="g-3">
        <Col xl={6}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Estado actual</div>
                {sesionActiva ? estadoBadge(sesionActiva.estado) : <Badge bg="warning" text="dark">SIN CAJA ABIERTA</Badge>}
              </div>

              {loading ? (
                <div className="py-4 text-center text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cargando...
                </div>
              ) : (
                <>
                  {sesionActiva ? (
                    <>
                      <div className="small text-muted">
                        Usuario: <span className="fw-semibold">{sesionActiva.usuario_nombre}</span>{" "}
                        <span className="text-muted">({sesionActiva.usuario})</span>
                      </div>

                      <Row className="mt-3 g-2">
                        <Col md={6}>
                          <Card className="rounded-4 border">
                            <Card.Body className="py-3">
                              <div className="text-muted small">Fecha apertura</div>
                              <div className="fw-bold">{fmtDate(sesionActiva.fecha_apertura)}</div>
                              <div className="text-muted small mt-1">
                                Creada: {fmtDateTime(sesionActiva.created_at)}
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>

                        <Col md={6}>
                          <Card className="rounded-4 border">
                            <Card.Body className="py-3">
                              <div className="text-muted small">Monto apertura</div>
                              <div className="fw-bold">{money(sesionActiva.monto_apertura)}</div>
                              <div className="text-muted small mt-1">Sesión: #{sesionActiva.id}</div>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      {/* ===== Cerrar Caja ===== */}
                      <div className="mt-3">
                        <div className="fw-bold mb-2 d-flex align-items-center gap-2">
                          <FaLock />
                          Cerrar caja
                        </div>

                        <InputGroup className="mb-2">
                          <InputGroup.Text>L</InputGroup.Text>
                          <Form.Control
                            type="number"
                            step="0.01"
                            placeholder="Monto de cierre"
                            value={montoCierre}
                            onChange={(e) => setMontoCierre(e.target.value)}
                          />
                          <Button
                            variant="danger"
                            onClick={cerrarCaja}
                            disabled={busyCerrar}
                            className="d-inline-flex align-items-center gap-2"
                          >
                            {busyCerrar ? <Spinner size="sm" animation="border" /> : <FaLock />}
                            Cerrar
                          </Button>
                        </InputGroup>

                        <div className="text-muted small">
                          Consejo: usa el **cuadre** (esperado en caja) que te muestra el resumen.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-muted small">
                        No hay una caja abierta en tu sesión. Abre caja para comenzar a facturar.
                      </div>

                      <div className="mt-3">
                        <div className="fw-bold mb-2 d-flex align-items-center gap-2">
                          <FaLockOpen />
                          Abrir caja
                        </div>

                        <InputGroup className="mb-2">
                          <InputGroup.Text>L</InputGroup.Text>
                          <Form.Control
                            type="number"
                            step="0.01"
                            placeholder="Monto de apertura"
                            value={montoApertura}
                            onChange={(e) => setMontoApertura(e.target.value)}
                          />
                          <Button
                            variant="success"
                            onClick={abrirCaja}
                            disabled={busyAbrir}
                            className="d-inline-flex align-items-center gap-2"
                          >
                            {busyAbrir ? <Spinner size="sm" animation="border" /> : <FaLockOpen />}
                            Abrir
                          </Button>
                        </InputGroup>

                        <div className="text-muted small">
                          Apertura recomendada: efectivo inicial para cambio.
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ===== Resumen Caja Activa ===== */}
        <Col xl={6}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Resumen (cuadre)</div>
                {sesionActiva ? (
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => verResumen(sesionActiva.id)}
                    className="d-inline-flex align-items-center gap-2"
                  >
                    <FaEye /> Ver detalle
                  </Button>
                ) : null}
              </div>

              {!sesionActiva ? (
                <div className="text-muted small">Abre caja para ver resumen y cuadre.</div>
              ) : !resumenActiva ? (
                <div className="py-3 text-muted small">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cargando resumen...
                </div>
              ) : (
                <>
                  <Row className="g-2">
                    <Col md={6}>
                      <Card className="rounded-4 border">
                        <Card.Body className="py-3">
                          <div className="text-muted small">Facturas</div>
                          <div className="fw-bold">
                            {Number(resumenActiva.facturacion?.facturas_count || 0)}
                          </div>
                          <div className="text-muted small mt-1">
                            Total: {money(resumenActiva.facturacion?.total_facturado || 0)}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="rounded-4 border">
                        <Card.Body className="py-3">
                          <div className="text-muted small">Esperado en caja</div>
                          <div className="fw-bold">
                            {money(resumenActiva.cuadre?.esperado_en_caja || 0)}
                          </div>
                          <div className="text-muted small mt-1">
                            Diferencia:{" "}
                            <span className={Number(resumenActiva.cuadre?.diferencia || 0) === 0 ? "text-success fw-semibold" : "text-danger fw-semibold"}>
                              {resumenActiva.cuadre?.diferencia === null ? "—" : money(resumenActiva.cuadre?.diferencia)}
                            </span>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <div className="mt-3">
                    <div className="fw-bold mb-2">Pagos por método</div>
                    <Table responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Método</th>
                          <th className="text-end">Total</th>
                          <th className="text-end">Cambio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(resumenActiva.pagos || {}).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-muted small">
                              Aún no hay pagos registrados en esta caja.
                            </td>
                          </tr>
                        ) : (
                          Object.values(resumenActiva.pagos).map((p) => (
                            <tr key={p.metodo}>
                              <td className="fw-semibold">{p.metodo}</td>
                              <td className="text-end">{money(p.total_monto)}</td>
                              <td className="text-end">{money(p.total_cambio)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== Admin/Supervisor: Historial ===== */}
      {canAdmin ? (
        <Card className="shadow-sm border-0 rounded-4 mt-3">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <div className="fw-bold">Historial de cajas</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Vista administrativa por rango de fechas
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Form.Control
                  type="date"
                  value={filtro.from}
                  onChange={(e) => setFiltro((s) => ({ ...s, from: e.target.value }))}
                  style={{ width: 160 }}
                />
                <Form.Control
                  type="date"
                  value={filtro.to}
                  onChange={(e) => setFiltro((s) => ({ ...s, to: e.target.value }))}
                  style={{ width: 160 }}
                />
                <Form.Select
                  value={filtro.estado}
                  onChange={(e) => setFiltro((s) => ({ ...s, estado: e.target.value }))}
                  style={{ width: 160 }}
                >
                  <option value="">(Todas)</option>
                  <option value="ABIERTA">ABIERTA</option>
                  <option value="CERRADA">CERRADA</option>
                </Form.Select>

                <Button
                  variant="primary"
                  onClick={loadSesionesAdmin}
                  disabled={loadingSesiones}
                  className="d-inline-flex align-items-center gap-2"
                >
                  {loadingSesiones ? <Spinner size="sm" animation="border" /> : <FaSearch />}
                  Buscar
                </Button>
              </div>
            </div>

            <hr />

            {loadingSesiones ? (
              <div className="py-4 text-center text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando historial...
              </div>
            ) : (
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                    <th>Apertura</th>
                    <th>Estado</th>
                    <th>Cierre</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted">
                        No hay sesiones en ese rango.
                      </td>
                    </tr>
                  ) : (
                    sesiones.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.id}</td>
                        <td>
                          <div className="fw-semibold">{s.usuario_nombre}</div>
                          <div className="text-muted small">{s.usuario}</div>
                        </td>
                        <td>{fmtDate(s.fecha_apertura)}</td>
                        <td>{money(s.monto_apertura)}</td>
                        <td>{estadoBadge(s.estado)}</td>
                        <td>{s.monto_cierre === null ? "—" : money(s.monto_cierre)}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-dark"
                            onClick={() => verResumen(s.id)}
                            className="d-inline-flex align-items-center gap-2"
                          >
                            <FaEye />
                            Resumen
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : null}

      {/* ===== Modal Resumen ===== */}
      <Modal show={showResumen} onHide={() => setShowResumen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Resumen de Caja</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {loadingResumenModal ? (
            <div className="py-4 text-center text-muted">
              <Spinner animation="border" className="me-2" />
              Cargando...
            </div>
          ) : resumenModal?.error ? (
            <Alert variant="danger" className="mb-0">
              {resumenModal.message}
            </Alert>
          ) : !resumenModal ? (
            <div className="text-muted">Sin datos.</div>
          ) : (
            <>
              <Row className="g-2">
                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Sesión</div>
                      <div className="fw-bold">#{resumenModal.sesion?.id}</div>
                      <div className="text-muted small mt-1">
                        {resumenModal.sesion?.usuario_nombre} ({resumenModal.sesion?.usuario})
                      </div>
                      <div className="text-muted small mt-1">
                        Apertura: {fmtDate(resumenModal.sesion?.fecha_apertura)} · {money(resumenModal.sesion?.monto_apertura)}
                      </div>
                      <div className="text-muted small mt-1">
                        Estado: {resumenModal.sesion?.estado}
                      </div>
                      <div className="text-muted small mt-1">
                        Cierre: {resumenModal.sesion?.monto_cierre === null ? "—" : money(resumenModal.sesion?.monto_cierre)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Cuadre</div>
                      <div className="fw-bold">
                        Esperado: {money(resumenModal.cuadre?.esperado_en_caja || 0)}
                      </div>
                      <div className="text-muted small mt-1">
                        Diferencia:{" "}
                        <span className={Number(resumenModal.cuadre?.diferencia || 0) === 0 ? "text-success fw-semibold" : "text-danger fw-semibold"}>
                          {resumenModal.cuadre?.diferencia === null ? "—" : money(resumenModal.cuadre?.diferencia)}
                        </span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <hr />

              <Row className="g-3">
                <Col md={6}>
                  <div className="fw-bold mb-2">Facturación</div>
                  <Table responsive size="sm">
                    <tbody>
                      <tr>
                        <td>Facturas</td>
                        <td className="text-end fw-semibold">{Number(resumenModal.facturacion?.facturas_count || 0)}</td>
                      </tr>
                      <tr>
                        <td>Subtotal</td>
                        <td className="text-end">{money(resumenModal.facturacion?.subtotal || 0)}</td>
                      </tr>
                      <tr>
                        <td>Descuento</td>
                        <td className="text-end">{money(resumenModal.facturacion?.descuento || 0)}</td>
                      </tr>
                      <tr>
                        <td>Impuesto</td>
                        <td className="text-end">{money(resumenModal.facturacion?.impuesto || 0)}</td>
                      </tr>
                      <tr className="table-light">
                        <td className="fw-bold">Total</td>
                        <td className="text-end fw-bold">{money(resumenModal.facturacion?.total_facturado || 0)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>

                <Col md={6}>
                  <div className="fw-bold mb-2">Pagos</div>
                  <Table responsive size="sm">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th className="text-end">Total</th>
                        <th className="text-end">Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(resumenModal.pagos || {}).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-muted">Sin pagos</td>
                        </tr>
                      ) : (
                        Object.values(resumenModal.pagos).map((p) => (
                          <tr key={p.metodo}>
                            <td className="fw-semibold">{p.metodo}</td>
                            <td className="text-end">{money(p.total_monto)}</td>
                            <td className="text-end">{money(p.total_cambio)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowResumen(false)} className="d-inline-flex align-items-center gap-2">
            <FaTimes />
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
