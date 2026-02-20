// src/pages/admin/reportes/ResumenVentas.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FaSyncAlt,
  FaDownload,
  FaCalendarAlt,
  FaCashRegister,
  FaListUl,
  FaUserShield,
} from "react-icons/fa";
import api from "../../../api/axios";

/* ================= Helpers ================= */

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function unwrapOkData(resData) {
  if (resData && typeof resData === "object" && "data" in resData)
    return resData.data;
  return resData;
}

function fmtMoney(n) {
  const num = Number(n || 0);
  return Number.isFinite(num) ? `L ${num.toFixed(2)}` : "L 0.00";
}

function fmtInt(n) {
  const num = Number(n || 0);
  return Number.isFinite(num) ? String(Math.trunc(num)) : "0";
}

function yyyyMmDd(d) {
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function safeStr(v) {
  return v === null || v === undefined ? "" : String(v);
}

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;

  const escape = (val) => {
    const s = safeStr(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  let csv = "";

  if (!Array.isArray(rows[0])) {
    const keys = Object.keys(rows[0] || {});
    csv += keys.map(escape).join(",") + "\n";
    csv += rows
      .map((r) => keys.map((k) => escape(r?.[k])).join(","))
      .join("\n");
  } else {
    csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================= Component ================= */

export default function ResumenVentas() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Por defecto: últimos 7 días
  const [usarHoy, setUsarHoy] = useState(false);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return yyyyMmDd(d);
  });
  const [hasta, setHasta] = useState(() => yyyyMmDd(new Date()));

  const [cajaSesionId, setCajaSesionId] = useState("");

  // data
  const [kpis, setKpis] = useState({
    facturas_count: 0,
    subtotal_total: 0,
    descuento_total: 0,
    impuesto_total: 0,
    ventas_total: 0,
    ticket_promedio: 0,
  });
  const [metodosResumen, setMetodosResumen] = useState([]);
  const [serieVentas, setSerieVentas] = useState([]);

  const rangoLabel = useMemo(() => {
    if (usarHoy) return "HOY";
    return `${desde} → ${hasta}`;
  }, [usarHoy, desde, hasta]);

  const validarRango = () => {
    if (usarHoy) return "";
    if (!desde || !hasta) return "Selecciona un rango válido.";
    if (String(desde) > String(hasta))
      return "La fecha 'Desde' no puede ser mayor que 'Hasta'.";
    return "";
  };

  const paramsBase = useMemo(() => {
    const p = {};
    if (!usarHoy) {
      p.desde = desde;
      p.hasta = hasta;
    }
    if (cajaSesionId) p.caja_sesion_id = cajaSesionId;
    return p;
  }, [usarHoy, desde, hasta, cajaSesionId]);

  const cargarDatos = async () => {
    const err = validarRango();
    if (err) {
      setMsg({ type: "warning", text: err });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      // 1) RESUMEN
      const resResumen = await api.get("/reportes/resumen", {
        params: paramsBase,
      });
      const resumenData = unwrapOkData(resResumen.data) || {};
      const k = resumenData.kpis || {};

      setKpis({
        facturas_count: Number(k.facturas_count || 0),
        subtotal_total: Number(k.subtotal_total || 0),
        descuento_total: Number(k.descuento_total || 0),
        impuesto_total: Number(k.impuesto_total || 0),
        ventas_total: Number(k.ventas_total || 0),
        ticket_promedio: Number(k.ticket_promedio || 0),
      });

      setMetodosResumen(toArray(resumenData.metodos));

      // 2) SERIE VENTAS
      const resSerie = await api.get("/reportes/serie-ventas", {
        params: paramsBase,
      });
      const serieData = unwrapOkData(resSerie.data);
      const serieArr = toArray(serieData)
        .map((r) => ({
          fecha: r.fecha ?? "—",
          facturas_count: Number(r.facturas_count || 0),
          ventas_total: Number(r.ventas_total || 0),
        }))
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

      setSerieVentas(serieArr);
    } catch (e) {
      console.error(e);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message || "No se pudieron cargar los datos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportResumen = () => {
    const rows = [
      ["Rango", rangoLabel],
      ["Facturas", kpis.facturas_count],
      ["Subtotal", kpis.subtotal_total],
      ["Descuento", kpis.descuento_total],
      ["Impuesto", kpis.impuesto_total],
      ["Ventas", kpis.ventas_total],
      ["Ticket promedio", kpis.ticket_promedio],
    ];
    downloadCSV(
      `reporte_resumen_${usarHoy ? "hoy" : `${desde}_a_${hasta}`}.csv`,
      rows,
    );
  };

  const exportSerie = () =>
    downloadCSV(
      `reporte_serie_ventas_${usarHoy ? "hoy" : `${desde}_a_${hasta}`}.csv`,
      serieVentas,
    );

  return (
    <div>
      {/* Filtros */}
      <Card className="border-0 shadow-sm rounded-4 mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={2}>
              <Form.Label className="fw-semibold">Modo</Form.Label>
              <Form.Check
                type="switch"
                id="usar-hoy"
                label="Usar HOY"
                checked={usarHoy}
                onChange={(e) => setUsarHoy(e.target.checked)}
              />
            </Col>

            <Col md={3}>
              <Form.Label className="fw-semibold">Desde</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaCalendarAlt />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  disabled={usarHoy}
                />
              </InputGroup>
            </Col>

            <Col md={3}>
              <Form.Label className="fw-semibold">Hasta</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaCalendarAlt />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  disabled={usarHoy}
                />
              </InputGroup>
            </Col>

            <Col md={2}>
              <Form.Label className="fw-semibold">
                Caja sesión (opcional)
              </Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaCashRegister />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Ej: 12"
                  value={cajaSesionId}
                  onChange={(e) => setCajaSesionId(e.target.value)}
                />
              </InputGroup>
              <div className="text-muted" style={{ fontSize: 11 }}>
                Filtra resumen/serie/métodos
              </div>
            </Col>

            <Col md={2} className="text-md-end">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Rango: <b>{rangoLabel}</b>
              </div>
              <Button
                variant="primary"
                onClick={cargarDatos}
                disabled={loading}
                className="mt-1"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <FaSyncAlt className="me-2" />
                    Aplicar
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* KPIs */}
      <Row className="g-2 mb-3">
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Facturas
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {fmtInt(kpis.facturas_count)}
                </div>
              </div>
              <Badge bg="secondary">Count</Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Ventas
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {fmtMoney(kpis.ventas_total)}
                </div>
              </div>
              <Badge bg="success">Total</Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Impuesto
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {fmtMoney(kpis.impuesto_total)}
                </div>
              </div>
              <Badge bg="warning" text="dark">
                Tax
              </Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Ticket prom.
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {fmtMoney(kpis.ticket_promedio)}
                </div>
              </div>
              <Badge bg="primary">AVG</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resumen Export */}
      <Card className="border-0 shadow-sm rounded-4 mb-3">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <div className="fw-bold d-flex align-items-center gap-2">
              <FaUserShield />
              Resumen (KPIs + métodos)
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Compatible con <code>/reportes/resumen</code>
            </div>
          </div>
          <Button
            variant="outline-dark"
            onClick={exportResumen}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaDownload /> CSV
          </Button>
        </Card.Body>
      </Card>

      <Row className="g-2">
        {/* Métodos (del resumen) */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold">Métodos (en resumen)</div>
                <Badge bg="secondary">{metodosResumen.length}</Badge>
              </div>

              <div style={{ maxHeight: "45vh", overflow: "auto" }}>
                <Table hover responsive className="align-middle mb-0">
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "white",
                      zIndex: 1,
                    }}
                  >
                    <tr>
                      <th>Método</th>
                      <th className="text-end">Pagos</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-muted">
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />{" "}
                          Cargando...
                        </td>
                      </tr>
                    ) : metodosResumen.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-muted">
                          Sin datos.
                        </td>
                      </tr>
                    ) : (
                      metodosResumen.map((m, i) => (
                        <tr key={`${m.metodo}-${i}`}>
                          <td className="fw-semibold">{m.metodo}</td>
                          <td className="text-end">{fmtInt(m.pagos_count)}</td>
                          <td className="text-end fw-bold">
                            {fmtMoney(m.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Serie ventas */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaListUl /> Serie de ventas (por día)
                </div>
                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={exportSerie}
                  className="d-inline-flex align-items-center gap-2"
                  disabled={serieVentas.length === 0}
                >
                  <FaDownload /> CSV
                </Button>
              </div>

              <div style={{ maxHeight: "45vh", overflow: "auto" }}>
                <Table hover responsive className="align-middle mb-0">
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "white",
                      zIndex: 1,
                    }}
                  >
                    <tr>
                      <th style={{ width: 140 }}>Fecha</th>
                      <th className="text-end">Facturas</th>
                      <th className="text-end">Ventas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-muted">
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />{" "}
                          Cargando...
                        </td>
                      </tr>
                    ) : serieVentas.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-muted">
                          Sin datos.
                        </td>
                      </tr>
                    ) : (
                      serieVentas.map((r, idx) => (
                        <tr key={`${r.fecha}-${idx}`}>
                          <td className="fw-semibold">{r.fecha}</td>
                          <td className="text-end">
                            {fmtInt(r.facturas_count)}
                          </td>
                          <td className="text-end fw-bold">
                            {fmtMoney(r.ventas_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Endpoint: <code>/reportes/serie-ventas</code>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
