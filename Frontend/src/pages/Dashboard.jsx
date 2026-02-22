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
import { useAuth } from "../context/AuthContext";
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
  const { user, hasPermiso } = useAuth();

  // Redireccionar usuarios sin permiso DASHBOARD.VER a su módulo correspondiente
  useEffect(() => {
    if (!user) return;
    
    if (!hasPermiso("DASHBOARD.VER")) {
      const rol = String(user.rol || "").toLowerCase();
      
      switch (rol) {
        case "mesero":
          navigate("/mesero", { replace: true });
          return;
        case "cocina":
          navigate("/cocina", { replace: true });
          return;
        case "cajero":
          navigate("/caja", { replace: true });
          return;
        default:
          // Si no tiene permiso y no sabemos dónde mandarlo, quedarse aquí
          break;
      }
    }
  }, [user, hasPermiso, navigate]);

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
    const badgeStyle = { 
      padding: "6px 12px", 
      borderRadius: 8, 
      fontWeight: 500,
      fontSize: 12
    };
    
    if (e === "NUEVA") return (
      <Badge style={{ ...badgeStyle, background: "linear-gradient(135deg, #6c757d 0%, #495057 100%)" }}>
        🆕 Nueva
      </Badge>
    );
    if (e === "EN_PREPARACION") return (
      <Badge style={{ ...badgeStyle, background: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)", color: "#000" }}>
        🔥 En prep.
      </Badge>
    );
    if (e === "LISTA") return (
      <Badge style={{ ...badgeStyle, background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}>
        ✅ Lista
      </Badge>
    );
    if (e === "ENTREGADA") return (
      <Badge style={{ ...badgeStyle, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        📦 Entregada
      </Badge>
    );
    if (e === "ANULADA") return (
      <Badge style={{ ...badgeStyle, background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}>
        ❌ Anulada
      </Badge>
    );
    return <Badge bg="light" text="dark" style={badgeStyle}>{e}</Badge>;
  };

  return (
    <Container fluid className="p-2 p-md-4" style={{ 
      width: "100%", 
      maxWidth: "100%",
      background: "linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)",
      minHeight: "100vh"
    }}>
      {/* ===== HEADER MEJORADO ===== */}
      <Row className="g-2 align-items-center mb-4">
        <Col>
          <div style={{ 
            fontSize: 42, 
            fontWeight: 900, 
            letterSpacing: -1,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            📊 Dashboard
          </div>
          <div className="text-muted fw-medium" style={{ fontSize: 15 }}>
            Panel de control y métricas en tiempo real • Sistema Cocina Pro
          </div>
        </Col>

        <Col xs="auto">
          <Button
            onClick={load}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2 shadow"
            style={{
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 600,
              background: loading ? "#6c757d" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              color: "white",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "";
              }
            }}
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Actualizar
          </Button>
        </Col>
      </Row>

      {msg.text ? (
        <Alert variant={msg.type} className="shadow-sm" style={{ borderRadius: 12, border: "none" }}>
          {msg.text}
        </Alert>
      ) : null}

      {/* ===== KPIs MEJORADOS ===== */}
      <Row className="g-3 mb-4 align-items-stretch">
        <Col md={6} xl={3} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(102, 126, 234, 0.3)";
            }}
            onClick={() => navigate("/ordenes")}
          >
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>Órdenes de hoy</div>
                  <div className="fw-bold" style={{ fontSize: 40, marginTop: 8 }}>{loading ? "—" : ordenesHoy}</div>
                </div>
                <div className="rounded-3 p-3" style={{ background: "rgba(255,255,255, 0.2)" }}>
                  <FaClipboardList size={28} />
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>📋 Ver todas las órdenes</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              boxShadow: "0 10px 30px rgba(240, 147, 251, 0.3)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(240, 147, 251, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(240, 147, 251, 0.3)";
            }}
            onClick={() => navigate("/cocina")}
          >
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>En cocina</div>
                  <div className="fw-bold" style={{ fontSize: 40, marginTop: 8 }}>{loading ? "—" : enCocina}</div>
                </div>
                <div className="rounded-3 p-3" style={{ background: "rgba(255,255,255, 0.2)" }}>
                  <FaUtensils size={28} />
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>🍳 Ver KDS Cocina</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white",
              boxShadow: "0 10px 30px rgba(79, 172, 254, 0.3)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(79, 172, 254, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(79, 172, 254, 0.3)";
            }}
            onClick={() => navigate("/reportes")}
          >
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>Ventas del día</div>
                  <div className="fw-bold" style={{ fontSize: 40, marginTop: 8 }}>{loading ? "—" : money(ventasHoy)}</div>
                </div>
                <div className="rounded-3 p-3" style={{ background: "rgba(255,255,255, 0.2)" }}>
                  <FaMoneyBillWave size={28} />
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>💰 Ver reportes</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: cajaAbierta 
                ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" 
                : "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              color: "white",
              boxShadow: cajaAbierta 
                ? "0 10px 30px rgba(67, 233, 123, 0.3)" 
                : "0 10px 30px rgba(250, 112, 154, 0.3)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = cajaAbierta 
                ? "0 15px 40px rgba(67, 233, 123, 0.4)" 
                : "0 15px 40px rgba(250, 112, 154, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = cajaAbierta 
                ? "0 10px 30px rgba(67, 233, 123, 0.3)" 
                : "0 10px 30px rgba(250, 112, 154, 0.3)";
            }}
            onClick={() => navigate("/caja")}
          >
            <Card.Body className="d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>Estado de caja</div>
                  <div className="mt-2">
                    {loading ? (
                      <Badge bg="light" text="dark" style={{ fontSize: 14 }}>—</Badge>
                    ) : (
                      <div className="fw-bold" style={{ fontSize: 28 }}>
                        {cajaAbierta ? "✅ Abierta" : "🔒 Cerrada"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-3 p-3" style={{ background: "rgba(255,255,255, 0.2)" }}>
                  <FaCashRegister size={28} />
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>💵 Gestionar caja</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== GRÁFICOS MEJORADOS ===== */}
      <Row className="g-3 mb-4 align-items-stretch">
        <Col xl={7} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
            }}
          >
            <Card.Body className="d-flex flex-column p-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-3 p-2" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                    <FaChartLine size={18} color="white" />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: 18 }}>Tendencia de Ventas</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>Últimos 7 días</div>
                  </div>
                </div>
                <Badge 
                  style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 12
                  }}
                >
                  {rangoLabel}
                </Badge>
              </div>

              {loading ? (
                <div className="py-5 text-center text-muted">
                  <Spinner animation="border" className="me-2" /> Cargando datos...
                </div>
              ) : serieVentas.length === 0 ? (
                <div className="text-muted py-5 text-center">
                  📊 No hay datos para mostrar en este rango
                </div>
              ) : (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={serieVentas}>
                      <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#43e97b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#38f9d7" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorFacturas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="fechaLabel" 
                        style={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        style={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255,255,255,0.96)",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                        }}
                        formatter={(value, name) => {
                          if (name === "ventas_total") return [money(value), "💰 Ventas"];
                          if (name === "facturas_count") return [value, "📄 Facturas"];
                          return [value, name];
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ventas_total"
                        name="Ventas"
                        stroke="#43e97b"
                        strokeWidth={4}
                        fill="url(#colorVentas)"
                        dot={{ fill: "#43e97b", strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="facturas_count"
                        name="Facturas"
                        stroke="#667eea"
                        strokeWidth={3}
                        fill="url(#colorFacturas)"
                        dot={{ fill: "#667eea", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5} className="d-flex">
          <Card 
            className="border-0 rounded-4 h-100 w-100" 
            style={{
              background: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
            }}
          >
            <Card.Body className="d-flex flex-column p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
                  <FaChartPie size={18} color="white" />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 18 }}>Métodos de Pago</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>Distribución del día de hoy</div>
                </div>
              </div>

              {loading ? (
                <div className="py-5 text-center text-muted">
                  <Spinner animation="border" className="me-2" /> Cargando datos...
                </div>
              ) : pagosHoy.length === 0 ? (
                <div className="text-muted py-5 text-center">
                  💳 Aún no hay pagos registrados hoy
                </div>
              ) : (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={pagosHoy}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4facfe" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="metodo" 
                        style={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        style={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <Tooltip 
                        contentStyle={{
                          background: "rgba(255,255,255,0.96)",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                        }}
                        formatter={(value) => [money(value), "Total"]} 
                      />
                      <Legend wrapperStyle={{ paddingTop: 20 }} />
                      <Bar 
                        dataKey="total" 
                        name="Total" 
                        fill="url(#colorBar)" 
                        radius={[12, 12, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== ÚLTIMAS ÓRDENES MEJORADAS ===== */}
      <Card 
        className="border-0 rounded-4" 
        style={{
          background: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <Card.Body className="p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-3 p-2" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <FaClipboardList size={18} color="white" />
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: 18 }}>Últimas Órdenes</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Órdenes registradas el día de hoy • Actualización en tiempo real
                </div>
              </div>
            </div>

            <Button
              className="d-inline-flex align-items-center gap-2 shadow-sm"
              onClick={() => navigate("/ordenes")}
              style={{
                borderRadius: 10,
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: 14,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                color: "white"
              }}
            >
              <FaEye /> Ver todas
            </Button>
          </div>

          <div style={{ 
            maxHeight: 350, 
            overflow: "auto",
            borderRadius: 12
          }}>
            <Table responsive hover className="mb-0 align-middle">
              <thead style={{ 
                position: "sticky", 
                top: 0, 
                zIndex: 1, 
                background: "linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)"
              }}>
                <tr>
                  <th style={{ 
                    minWidth: 220, 
                    padding: "12px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    📋 Código
                  </th>
                  <th style={{ 
                    minWidth: 120, 
                    padding: "12px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    🏷️ Tipo
                  </th>
                  <th style={{ 
                    minWidth: 130, 
                    padding: "12px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    📊 Estado
                  </th>
                  <th style={{ 
                    minWidth: 110, 
                    padding: "12px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #dee2e6"
                  }} 
                  className="text-end">
                    💰 Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-muted">
                      <Spinner animation="border" size="sm" className="me-2" /> 
                      Cargando órdenes...
                    </td>
                  </tr>
                ) : ultimas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-muted">
                      📭 No hay órdenes registradas hoy
                    </td>
                  </tr>
                ) : (
                  ultimas.map((o) => (
                    <tr 
                      key={o.id}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "";
                      }}
                      onClick={() => navigate(`/ordenes`)}
                    >
                      <td className="fw-bold" style={{ padding: "12px 16px" }}>
                        {o.codigo}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge 
                          bg="dark" 
                          style={{ 
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontWeight: 500
                          }}
                        >
                          {o.tipo}
                        </Badge>{" "}
                        {o.tipo === "MESA" && o.mesa ? (
                          <Badge 
                            style={{ 
                              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                              padding: "6px 12px",
                              borderRadius: 8,
                              fontWeight: 500
                            }} 
                            className="ms-2"
                          >
                            Mesa {o.mesa}
                          </Badge>
                        ) : null}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {badgeEstadoOrden(o.estado)}
                      </td>
                      <td className="text-end fw-bold" style={{ padding: "12px 16px" }}>
                        {o.total == null ? "—" : money(o.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div 
            className="mt-3 pt-3" 
            style={{ 
              borderTop: "1px solid #e0e0e0",
              fontSize: 12,
              color: "#666"
            }}
          >
            ⏰ Última actualización: <b>{fmtDateTime(new Date())}</b>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
