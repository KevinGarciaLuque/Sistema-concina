// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FaCashRegister,
  FaUtensils,
  FaClipboardList,
  FaMoneyBillWave,
  FaArrowRight,
  FaSyncAlt,
  FaChartLine,
  FaChartPie,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Gráficos
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ================= Helpers ================= */

function normalizeEstado(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["NUEVA", "NUEVO", "NEW"].includes(s)) return "NUEVA";
  if (
    ["EN_PREPARACION", "EN PREPARACION", "PREPARANDO", "COCINANDO", "IN_PROGRESS"].includes(s)
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

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

function shortDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/* ================= Component ================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const desde7 = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), []);
  const rangoLabel = `${ymd(desde7)} → ${ymd(today)}`;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // KPIs
  const [ordenesHoy, setOrdenesHoy] = useState(0);
  const [enCocina, setEnCocina] = useState(0);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [cajaAbierta, setCajaAbierta] = useState(false);

  // Gráficos
  const [serieVentas, setSerieVentas] = useState([]);
  const [pagosHoy, setPagosHoy] = useState([]);

  // Últimas órdenes
  const [ultimas, setUltimas] = useState([]);

  const load = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const hoy = ymd(new Date());

      // ===== 1) ÓRDENES HOY (y últimas) =====
      const ordRes = await api.get("/ordenes", { params: { desde: hoy, hasta: hoy } });
      const ordPayload = ordRes.data?.data ?? ordRes.data;
      const ordenes = safeArray(ordPayload?.ordenes ?? ordPayload);

      const ordenesNorm = ordenes.map((o) => {
        const createdAt =
          o.created_at || o.fecha_hora || o.createdAt || o.fecha || o.fecha_creacion || null;
        const codigo = o.codigo || o.numero || o.correlativo || `#${o.id}`;
        const estado = normalizeEstado(o.estado);
        const tipo = String(o.tipo || o.tipo_orden || "LLEVAR").toUpperCase();
        const mesa = o.mesa || o.numero_mesa || null;
        const total = o.total ?? o.total_orden ?? o.monto_total ?? null;
        return { ...o, createdAt, codigo, estado, tipo, mesa, total };
      });

      setOrdenesHoy(ordenesNorm.length);
      setEnCocina(ordenesNorm.filter((o) => ["NUEVA", "EN_PREPARACION"].includes(o.estado)).length);

      const ult = [...ordenesNorm].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setUltimas(ult.slice(0, 80));

      // ===== 2) VENTAS HOY (REPORTES/RESUMEN) =====
      const repRes = await api.get("/reportes/resumen"); // por defecto HOY
      const repData = repRes.data?.data ?? repRes.data;
      setVentasHoy(Number(repData?.kpis?.ventas_total || 0));

      // ===== 3) PAGOS POR MÉTODO (HOY) =====
      const pagosRes = await api.get("/reportes/por-metodo"); // por defecto HOY
      const pagosData = pagosRes.data?.data ?? pagosRes.data;
      const rows = safeArray(pagosData?.rows ?? pagosData);
      setPagosHoy(
        rows.map((r) => ({
          metodo: String(r.metodo || "—"),
          total: Number(r.total || 0),
          pagos_count: Number(r.pagos_count || 0),
        }))
      );

      // ===== 4) SERIE VENTAS 7 DÍAS =====
      const serieRes = await api.get("/reportes/serie-ventas", {
        params: { desde: ymd(desde7), hasta: ymd(today) },
      });
      const serieData = serieRes.data?.data ?? serieRes.data;
      const serie = safeArray(serieData);
      setSerieVentas(
        serie.map((r) => ({
          fecha: r.fecha,
          fechaLabel: shortDate(r.fecha),
          facturas_count: Number(r.facturas_count || 0),
          ventas_total: Number(r.ventas_total || 0),
        }))
      );

      // ===== 5) ESTADO CAJA =====
      const cajaRes = await api.get("/caja/sesion-activa");
      const cajaData = cajaRes.data?.data ?? cajaRes.data;
      setCajaAbierta(Boolean(cajaData?.id));
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo cargar el dashboard. Revisa endpoints: /ordenes, /reportes/*, /caja/sesion-activa",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const badgeEstadoOrden = (estado) => {
    const e = normalizeEstado(estado);
    if (e === "NUEVA") return <Badge bg="secondary">Nueva</Badge>;
    if (e === "EN_PREPARACION") return <Badge bg="warning" text="dark">En prep.</Badge>;
    if (e === "LISTA") return <Badge bg="success">Lista</Badge>;
    if (e === "ENTREGADA") return <Badge bg="dark">Entregada</Badge>;
    if (e === "ANULADA") return <Badge bg="danger">Anulada</Badge>;
    return <Badge bg="light" text="dark">{e}</Badge>;
  };

  return (
    // ✅ CLAVE: Container fluid + width 100% para que NO “encierre” el dashboard
    <Container fluid className="p-2 p-md-3" style={{ width: "100%", maxWidth: "100%" }}>
      {/* ===== HEADER ===== */}
      <Row className="g-2 align-items-center mb-3">
        <Col>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>Dashboard</div>
          <div className="text-muted">Resumen general del sistema de cocina</div>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={load}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Actualizar
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* ===== KPIs (MISMO TAMAÑO) ===== */}
      <Row className="g-3 mb-4 align-items-stretch">
        <Col md={6} xl={3} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>Órdenes de hoy</div>
                  <div className="fw-bold" style={{ fontSize: 34 }}>{loading ? "—" : ordenesHoy}</div>
                </div>
                <div className="rounded-3 p-2" style={{ background: "rgba(13,110,253,.10)" }}>
                  <FaClipboardList size={22} />
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Total registradas hoy</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>En cocina</div>
                  <div className="fw-bold" style={{ fontSize: 34 }}>{loading ? "—" : enCocina}</div>
                </div>
                <div className="rounded-3 p-2" style={{ background: "rgba(255,193,7,.16)" }}>
                  <FaUtensils size={22} />
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>NUEVA + EN PREP.</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>Ventas del día</div>
                  <div className="fw-bold" style={{ fontSize: 34 }}>{loading ? "—" : money(ventasHoy)}</div>
                </div>
                <div className="rounded-3 p-2" style={{ background: "rgba(25,135,84,.12)" }}>
                  <FaMoneyBillWave size={22} />
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Desde reportes (admin/supervisor)</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>Estado de caja</div>
                  <div className="mt-1">
                    {loading ? (
                      <Badge bg="light" text="dark">—</Badge>
                    ) : cajaAbierta ? (
                      <Badge bg="success" className="px-3 py-2" style={{ fontSize: 16 }}>
                        Abierta
                      </Badge>
                    ) : (
                      <Badge bg="danger" className="px-3 py-2" style={{ fontSize: 16 }}>
                        Cerrada
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-3 p-2" style={{ background: "rgba(33,37,41,.10)" }}>
                  <FaCashRegister size={22} />
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Sesión activa (según usuario)</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ✅ ACCESOS RÁPIDOS ARRIBA DE LOS GRÁFICOS (como pediste) */}
      <Row className="g-3 mb-4 align-items-stretch">
        <Col md={4} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold mb-1">POS (Cajero)</h5>
                <p className="text-muted small mb-0">Crear órdenes y enviar a cocina</p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate("/pos")}
                className="mt-3 d-inline-flex align-items-center justify-content-center gap-2"
              >
                Ir al POS <FaArrowRight />
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold mb-1">Cocina (KDS)</h5>
                <p className="text-muted small mb-0">Ver y preparar órdenes en tiempo real</p>
              </div>
              <Button
                variant="warning"
                onClick={() => navigate("/cocina")}
                className="mt-3 d-inline-flex align-items-center justify-content-center gap-2"
              >
                Ir a Cocina <FaArrowRight />
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold mb-1">Caja</h5>
                <p className="text-muted small mb-0">Apertura, cierre y facturación</p>
              </div>
              <Button
                variant="success"
                onClick={() => navigate("/caja")}
                className="mt-3 d-inline-flex align-items-center justify-content-center gap-2"
              >
                Ir a Caja <FaArrowRight />
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== GRÁFICOS ===== */}
      <Row className="g-3 mb-4 align-items-stretch">
        <Col xl={7} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaChartLine />
                  Ventas (últimos 7 días)
                </div>
                <Badge bg="light" text="dark">{rangoLabel}</Badge>
              </div>

              {loading ? (
                <div className="py-5 text-center text-muted">
                  <Spinner animation="border" className="me-2" /> Cargando...
                </div>
              ) : serieVentas.length === 0 ? (
                <div className="text-muted py-4">No hay datos para el rango.</div>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={serieVentas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fechaLabel" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "ventas_total") return [money(value), "Ventas"];
                          if (name === "facturas_count") return [value, "Facturas"];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ventas_total"
                        name="Ventas"
                        stroke="#198754"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="facturas_count"
                        name="Facturas"
                        stroke="#0d6efd"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5} className="d-flex">
          <Card className="shadow-sm border-0 rounded-4 h-100 w-100">
            <Card.Body className="d-flex flex-column">
              <div className="fw-bold d-flex align-items-center gap-2 mb-2">
                <FaChartPie />
                Pagos por método (hoy)
              </div>

              {loading ? (
                <div className="py-5 text-center text-muted">
                  <Spinner animation="border" className="me-2" /> Cargando...
                </div>
              ) : pagosHoy.length === 0 ? (
                <div className="text-muted py-4">Aún no hay pagos registrados.</div>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={pagosHoy}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metodo" />
                      <YAxis />
                      <Tooltip formatter={(value) => [money(value), "Total"]} />
                      <Legend />
                      <Bar dataKey="total" name="Total" fill="#0d6efd" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== ÚLTIMAS ÓRDENES (HOY) + SCROLL ===== */}
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div>
              <div className="fw-bold">Últimas órdenes (hoy)</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Datos reales desde <code>/ordenes</code> (rango de hoy)
              </div>
            </div>

            <Button
              size="sm"
              variant="outline-dark"
              className="d-inline-flex align-items-center gap-2"
              onClick={() => navigate("/ordenes")}
            >
              <FaEye /> Ver monitor
            </Button>
          </div>

          <div style={{ maxHeight: 300, overflow: "auto" }}>
            <Table responsive hover className="mb-0 align-middle">
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "white" }}>
                <tr>
                  <th style={{ minWidth: 220 }}>Código</th>
                  <th style={{ minWidth: 120 }}>Tipo</th>
                  <th style={{ minWidth: 130 }}>Estado</th>
                  <th style={{ minWidth: 110 }} className="text-end">Total</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" /> Cargando...
                    </td>
                  </tr>
                ) : ultimas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted">No hay órdenes hoy.</td>
                  </tr>
                ) : (
                  ultimas.map((o) => (
                    <tr key={o.id}>
                      <td className="fw-bold">{o.codigo}</td>
                      <td>
                        <Badge bg="dark">{o.tipo}</Badge>{" "}
                        {o.tipo === "MESA" && o.mesa ? (
                          <Badge bg="info" text="dark" className="ms-2">
                            Mesa {o.mesa}
                          </Badge>
                        ) : null}
                      </td>
                      <td>{badgeEstadoOrden(o.estado)}</td>
                      <td className="text-end fw-bold">{o.total == null ? "—" : money(o.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Última actualización: <b>{fmtDateTime(new Date())}</b>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
