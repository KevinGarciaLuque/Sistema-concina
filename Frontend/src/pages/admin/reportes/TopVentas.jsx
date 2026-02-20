// src/pages/admin/reportes/TopVentas.jsx
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
  FaFire,
  FaLayerGroup,
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

export default function TopVentas() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [usarHoy, setUsarHoy] = useState(false);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return yyyyMmDd(d);
  });
  const [hasta, setHasta] = useState(() => yyyyMmDd(new Date()));
  const [limitTop, setLimitTop] = useState(10);

  const [topProductos, setTopProductos] = useState([]);
  const [topCategorias, setTopCategorias] = useState([]);

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

  const cargarDatos = async () => {
    const err = validarRango();
    if (err) {
      setMsg({ type: "warning", text: err });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      // TOP PRODUCTOS
      const resTopProd = await api.get("/reportes/top-productos", {
        params: { ...(usarHoy ? {} : { desde, hasta }), limit: limitTop },
      });
      const tpData = unwrapOkData(resTopProd.data);

      setTopProductos(
        toArray(tpData).map((r, idx) => ({
          rank: idx + 1,
          producto_id: r.producto_id,
          producto_nombre: r.producto_nombre ?? "—",
          cantidad_total: Number(r.cantidad_total || 0),
          monto_total: Number(r.monto_total || 0),
        })),
      );

      // TOP CATEGORÍAS
      const resTopCat = await api.get("/reportes/top-categorias", {
        params: { ...(usarHoy ? {} : { desde, hasta }), limit: limitTop },
      });
      const tcData = unwrapOkData(resTopCat.data);

      setTopCategorias(
        toArray(tcData).map((r, idx) => ({
          rank: idx + 1,
          categoria_id: r.categoria_id,
          categoria: r.categoria ?? "—",
          cantidad_total: Number(r.cantidad_total || 0),
          monto_total: Number(r.monto_total || 0),
        })),
      );
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

  const exportTopProd = () =>
    downloadCSV(
      `reporte_top_productos_${usarHoy ? "hoy" : `${desde}_a_${hasta}`}.csv`,
      topProductos,
    );

  const exportTopCat = () =>
    downloadCSV(
      `reporte_top_categorias_${usarHoy ? "hoy" : `${desde}_a_${hasta}`}.csv`,
      topCategorias,
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
                id="usar-hoy-top"
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
              <Form.Label className="fw-semibold">Límite</Form.Label>
              <Form.Select
                value={limitTop}
                onChange={(e) => setLimitTop(Number(e.target.value))}
                disabled={loading}
              >
                {[5, 10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                ))}
              </Form.Select>
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

      {/* Tops */}
      <Row className="g-3">
        <Col lg={6}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaFire /> Top productos
                </div>

                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={exportTopProd}
                  className="d-inline-flex align-items-center gap-2"
                  disabled={topProductos.length === 0}
                >
                  <FaDownload /> CSV
                </Button>
              </div>

              <div style={{ maxHeight: "60vh", overflow: "auto" }}>
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
                      <th style={{ width: 60 }}>#</th>
                      <th>Producto</th>
                      <th className="text-end">Cant.</th>
                      <th className="text-end">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-muted">
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />{" "}
                          Cargando...
                        </td>
                      </tr>
                    ) : topProductos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-muted">
                          Sin datos.
                        </td>
                      </tr>
                    ) : (
                      topProductos.map((r) => (
                        <tr key={r.rank}>
                          <td className="text-muted">{r.rank}</td>
                          <td className="fw-semibold">{r.producto_nombre}</td>
                          <td className="text-end">
                            {fmtInt(r.cantidad_total)}
                          </td>
                          <td className="text-end fw-bold">
                            {fmtMoney(r.monto_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Endpoint: <code>/reportes/top-productos</code>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaLayerGroup /> Top categorías
                </div>

                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={exportTopCat}
                  className="d-inline-flex align-items-center gap-2"
                  disabled={topCategorias.length === 0}
                >
                  <FaDownload /> CSV
                </Button>
              </div>

              <div style={{ maxHeight: "60vh", overflow: "auto" }}>
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
                      <th style={{ width: 60 }}>#</th>
                      <th>Categoría</th>
                      <th className="text-end">Cant.</th>
                      <th className="text-end">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-muted">
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />{" "}
                          Cargando...
                        </td>
                      </tr>
                    ) : topCategorias.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-muted">
                          Sin datos.
                        </td>
                      </tr>
                    ) : (
                      topCategorias.map((r) => (
                        <tr key={r.rank}>
                          <td className="text-muted">{r.rank}</td>
                          <td className="fw-semibold">{r.categoria}</td>
                          <td className="text-end">
                            {fmtInt(r.cantidad_total)}
                          </td>
                          <td className="text-end fw-bold">
                            {fmtMoney(r.monto_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Endpoint: <code>/reportes/top-categorias</code>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
