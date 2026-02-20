// Frontend/src/pages/Bitacora.jsx
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
  FaClipboardList,
  FaSyncAlt,
  FaDownload,
  FaCalendarAlt,
  FaSearch,
} from "react-icons/fa";
import api from "../api/axios";

/* ================= Helpers ================= */

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function unwrapOkData(resData) {
  // backend: { ok:true, data: ... }
  if (resData && typeof resData === "object" && "data" in resData)
    return resData.data;
  return resData;
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

  const keys = Object.keys(rows[0] || {});
  let csv = keys.map(escape).join(",") + "\n";
  csv += rows.map((r) => keys.map((k) => escape(r?.[k])).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================= Component ================= */

export default function Bitacora() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // rango
  const [usarHoy, setUsarHoy] = useState(true);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return yyyyMmDd(d);
  });
  const [hasta, setHasta] = useState(() => yyyyMmDd(new Date()));

  // filtros
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(200);

  // data
  const [rows, setRows] = useState([]);

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

  const cargar = async () => {
    const err = validarRango();
    if (err) {
      setMsg({ type: "warning", text: err });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const params = {
        ...(usarHoy ? {} : { desde, hasta }),
        ...(q.trim() ? { q: q.trim() } : {}),
        limit,
      };

      const res = await api.get("/reportes/bitacora", { params });
      const data = unwrapOkData(res.data);

      setRows(toArray(data));
    } catch (e) {
      console.error(e);
      setRows([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cargar la bitácora.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportar = () => {
    const name = `bitacora_${usarHoy ? "hoy" : `${desde}_a_${hasta}`}.csv`;
    downloadCSV(name, rows);
  };

  return (
    <div className="p-2 p-md-3">
      {/* Header */}
      <Row className="g-2 align-items-center mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-3"
              style={{ width: 40, height: 40, background: "#eef2ff" }}
            >
              <FaClipboardList />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Bitácora{" "}
                <Badge bg="secondary" className="ms-2">
                  {rows.length}
                </Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Registro de acciones del sistema (auditoría).
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="outline-dark"
            onClick={exportar}
            disabled={rows.length === 0}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaDownload /> CSV
          </Button>

          <Button
            variant="outline-primary"
            onClick={cargar}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Recargar
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* Filtros */}
      <Card className="border-0 shadow-sm rounded-4 mb-2">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={2}>
              <Form.Label className="fw-semibold">Modo</Form.Label>
              <Form.Check
                type="switch"
                id="usar-hoy-bitacora"
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

            <Col md={4}>
              <Form.Label className="fw-semibold">Buscar</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Acción, entidad o detalle..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  disabled={loading}
                />
              </InputGroup>
            </Col>

            <Col md={2}>
              <Form.Label className="fw-semibold">Límite</Form.Label>
              <Form.Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
              >
                {[50, 100, 200, 300, 500].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={10} className="text-md-end">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Rango: <b>{rangoLabel}</b>
              </div>
              <Button
                variant="primary"
                onClick={cargar}
                disabled={loading}
                className="mt-1"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Cargando...
                  </>
                ) : (
                  "Aplicar"
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla */}
     <Card className="border-0 shadow-sm rounded-4 w-100 overflow-hidden">
  <Card.Body className="p-0">
    {/* ✅ Scroll vertical SÍ / horizontal NO */}
    <div className="w-100 overflow-y-auto overflow-x-hidden" style={{ maxHeight: "70vh" }}>
      <Table hover size="sm" className="align-middle mb-0 w-100">
        <thead className="table-light sticky-top">
          <tr className="small text-uppercase">
            <th className="text-nowrap" style={{ width: 80 }}>ID</th>
            <th>Usuario</th>
            <th className="text-nowrap">Acción</th>
            <th>Entidad</th>
            <th>Detalle</th>
            <th className="text-nowrap" style={{ width: 190 }}>Fecha</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="py-4 text-muted text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-muted text-center">
                Sin registros con ese filtro.
              </td>
            </tr>
          ) : (
            rows.map((b) => (
              <tr key={b.id} className="small">
                <td className="text-muted text-nowrap">{b.id}</td>

                <td>
                  <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>
                    {b.usuario_nombre || "—"}
                  </div>
                  <div className="text-muted small text-truncate" style={{ maxWidth: 260 }}>
                    {b.usuario_login || ""}
                  </div>
                </td>

                <td className="fw-semibold text-nowrap">{b.accion || "—"}</td>

                <td>
                  <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>
                    {b.entidad || "—"}
                    {b.entidad_id ? ` #${b.entidad_id}` : ""}
                  </div>
                  <div className="text-muted small text-truncate" style={{ maxWidth: 260 }}>
                    {b.ip ? `IP: ${b.ip}` : ""}
                  </div>
                </td>

                {/* ✅ Detalle: no ensancha, se recorta con … */}
                <td>
                  <span
                    className="d-inline-block text-truncate text-muted"
                    style={{ maxWidth: 420 }}
                    title={b.detalle || "—"}
                  >
                    {b.detalle || "—"}
                  </span>
                </td>

                <td className="text-muted text-nowrap">
                  <span
                    className="d-inline-block text-truncate"
                    style={{ maxWidth: 180 }}
                    title={b.created_at || "—"}
                  >
                    {b.created_at || "—"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>

    <div className="px-3 py-2 text-muted" style={{ fontSize: 12 }}>
      Endpoint: <code>/reportes/bitacora</code>
    </div>
  </Card.Body>
</Card>
    </div>
  );
}
