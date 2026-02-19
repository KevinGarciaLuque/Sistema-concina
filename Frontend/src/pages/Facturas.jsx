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
import {
  FaFileInvoiceDollar,
  FaSyncAlt,
  FaSearch,
  FaEye,
  FaPrint,
  FaDownload,
  FaTimes,
} from "react-icons/fa";
import api from "../api";
import { generarTicket80mmPDF } from "../utils/ticket80mm";

/* ================= Helpers ================= */

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

function safeText(v) {
  return String(v ?? "").trim();
}

/* ================= Component ================= */

export default function Facturas() {
  const today = new Date();
  const seven = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [desde, setDesde] = useState(() => seven.toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(() => today.toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [facturas, setFacturas] = useState([]);

  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [facturaSel, setFacturaSel] = useState(null);

  // ✅ CARGA LISTADO
  const load = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      // IMPORTANTÍSIMO:
      // tu axios "api" normalmente ya tiene baseURL = http://localhost:4000/api
      // por eso aquí NO se pone /api/...
      const { data } = await api.get("/facturas", {
        params: {
          desde,
          hasta,
          q: q || undefined,
        },
      });

      const list = Array.isArray(data?.data) ? data.data : [];

      const normalized = list.map((f) => ({
        id: f.id,
        numero: f.numero_factura || "—",
        es_copia: Number(f.es_copia || 0) === 1,
        fecha: f.created_at || null,
        cliente_nombre: f.cliente_nombre || "Consumidor final",
        rtn: f.cliente_rtn || null,
        direccion: f.cliente_direccion || null,
        subtotal: f.subtotal ?? 0,
        descuento: f.descuento ?? 0,
        impuesto: f.impuesto ?? 0,
        total: f.total ?? 0,
        metodo_pago: f.metodo_pago || null, // viene de pagos (GROUP_CONCAT)
        orden_id: f.orden_id ?? null,
        caja_sesion_id: f.caja_sesion_id ?? null,
        raw: f,
      }));

      setFacturas(normalized);
    } catch (e) {
      setFacturas([]);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudieron cargar facturas. Revisa backend GET /api/facturas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // ✅ FILTRO FRONT
  const filtradas = useMemo(() => {
    const text = safeText(q).toLowerCase();

    const d0 = new Date(`${desde}T00:00:00`);
    const d1 = new Date(`${hasta}T23:59:59`);

    let list = [...facturas];

    list = list.filter((f) => {
      if (!f.fecha) return true;
      const d = new Date(f.fecha);
      if (Number.isNaN(d.getTime())) return true;
      return d >= d0 && d <= d1;
    });

    if (text) {
      list = list.filter((f) => {
        const base = `${f.numero_factura} ${f.cliente_nombre} ${f.rtn ?? ""} ${f.metodo_pago ?? ""}`.toLowerCase();
        return base.includes(text);
      });
    }

    list.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    return list;
  }, [facturas, desde, hasta, q]);

  // ✅ DETALLE
  const openDetalle = async (factura) => {
    setShowDetalle(true);
    setDetalleLoading(true);
    setFacturaSel(null);

    try {
      const { data } = await api.get(`/facturas/${factura.id}`);
      const det = data?.data;

      const itemsRaw = det?.items || [];
      const items = Array.isArray(itemsRaw) ? itemsRaw : [];

      setFacturaSel({
        ...factura,
        detalle: det,
        items: items.map((it) => ({
          cantidad: it?.cantidad ?? 1,
          nombre: it?.producto_nombre ?? it?.nombre ?? "Item",
          precio: it?.precio_unitario ?? 0,
          subtotal: it?.total_linea ?? (Number(it?.cantidad ?? 1) * Number(it?.precio_unitario ?? 0)),
          notas: it?.notas ?? "",
        })),
        // refresca metodo por si viene distinto
        metodo_pago: det?.metodo_pago ?? factura.metodo_pago ?? null,
      });
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo cargar el detalle de la factura." });
      setShowDetalle(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  // ✅ REIMPRIMIR
  const reimprimir = async (factura) => {
    setMsg({ type: "", text: "" });
    
    try {
      // Traer data completa del ticket (factura + pagos + items + opciones)
      const r = await api.get(`/facturas/${factura.id}/recibo`);
      const recibo = r?.data?.data;

      if (!recibo?.factura) {
        throw new Error("No se pudo obtener los datos de la factura");
      }

      // Generar ticket 80mm
      generarTicket80mmPDF(recibo);

      setMsg({
        type: "success",
        text: `✅ Factura ${factura.numero_factura || factura.id} impresa correctamente.`,
      });
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || e?.message || "No se pudo imprimir la factura.",
      });
    }
  };

  // ✅ EXPORT CSV
  const exportarCSV = () => {
    const rows = filtradas.map((f) => ({
      numero: f.numero_factura,
      fecha: fmtDateTime(f.fecha),
      cliente: f.cliente_nombre,
      rtn: f.rtn || "",
      metodo_pago: f.metodo_pago || "",
      total: Number(f.total || 0).toFixed(2),
      es_copia: f.es_copia ? "SI" : "NO",
    }));

    const headers = Object.keys(rows[0] || {
      numero: "",
      fecha: "",
      cliente: "",
      rtn: "",
      metodo_pago: "",
      total: "",
      es_copia: "",
    });

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${desde}_a_${hasta}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Container fluid className="py-3">
      {/* Header */}
      <Row className="align-items-center g-2 mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40, background: "rgba(25,135,84,.12)" }}
            >
              <FaFileInvoiceDollar />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Facturas <Badge bg="success" className="ms-2">LIVE</Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Listado, detalle, reimpresión y exportación
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="outline-dark"
            onClick={exportarCSV}
            disabled={loading || filtradas.length === 0}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaDownload />
            Exportar CSV
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

      {msg.text ? <Alert variant={msg.type} className="mb-3">{msg.text}</Alert> : null}

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

            <Col lg={8}>
              <Form.Label className="fw-semibold">Buscar</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Número, cliente, RTN, método…"
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
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body className="py-5 text-center text-muted">
            <Spinner animation="border" className="me-2" />
            Cargando facturas...
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body>
            <div className="text-muted mb-2" style={{ fontSize: 12 }}>
              Mostrando <b>{filtradas.length}</b> factura(s)
            </div>

            <div style={{ maxHeight: "70vh", overflow: "auto" }}>
              <Table responsive hover className="mb-0 align-middle">
                <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "white" }}>
                  <tr>
                    <th style={{ minWidth: 170 }}>Número</th>
                    <th style={{ minWidth: 180 }}>Fecha</th>
                    <th style={{ minWidth: 240 }}>Cliente</th>
                    <th style={{ minWidth: 160 }}>RTN</th>
                    <th style={{ minWidth: 160 }}>Método</th>
                    <th style={{ minWidth: 130 }} className="text-end">Total</th>
                    <th style={{ minWidth: 260 }} className="text-end">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted py-4">
                        No hay facturas con esos filtros.
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((f) => (
                      <tr key={f.id}>
                        <td className="fw-bold">
                          {f.numero_factura}{" "}
                          {f.es_copia ? <Badge bg="warning" text="dark" className="ms-2">COPIA</Badge> : null}
                        </td>
                        <td className="text-muted" style={{ fontSize: 12 }}>{fmtDateTime(f.fecha)}</td>
                        <td className="fw-semibold">{f.cliente_nombre}</td>
                        <td className="text-muted">{f.rtn || "—"}</td>
                        <td>{f.metodo_pago ? <Badge bg="dark">{f.metodo_pago}</Badge> : "—"}</td>
                        <td className="text-end fw-bold">{money(f.total)}</td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2 flex-wrap justify-content-end">
                            <Button
                              size="sm"
                              variant="outline-dark"
                              className="d-inline-flex align-items-center gap-2"
                              onClick={() => openDetalle(f)}
                            >
                              <FaEye /> Ver
                            </Button>

                            <Button
                              size="sm"
                              variant="dark"
                              className="d-inline-flex align-items-center gap-2"
                              onClick={() => reimprimir(f)}
                            >
                              <FaPrint /> Reimprimir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
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
            {facturaSel?.numero_factura ? (
              <>
                <Badge bg="dark" className="ms-2">{facturaSel.numero_factura}</Badge>
                {facturaSel.es_copia ? <Badge bg="warning" text="dark" className="ms-2">COPIA</Badge> : null}
              </>
            ) : null}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detalleLoading ? (
            <div className="py-4 text-center text-muted">
              <Spinner animation="border" className="me-2" />
              Cargando detalle...
            </div>
          ) : !facturaSel ? (
            <div className="text-muted">Sin información.</div>
          ) : (
            <>
              <Row className="g-2">
                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Cliente</div>
                      <div className="fw-bold">{facturaSel.cliente_nombre}</div>
                      <div className="text-muted small mt-1">RTN: {facturaSel.rtn || "—"}</div>
                      <div className="text-muted small mt-1">Fecha: {fmtDateTime(facturaSel.fecha)}</div>
                      <div className="text-muted small mt-1">Dirección: {facturaSel.direccion || "—"}</div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="rounded-4 border">
                    <Card.Body className="py-3">
                      <div className="text-muted small">Total</div>
                      <div className="fw-bold" style={{ fontSize: 18 }}>{money(facturaSel.total)}</div>
                      <div className="text-muted small mt-1">
                        Método: {facturaSel.metodo_pago ? <Badge bg="dark">{facturaSel.metodo_pago}</Badge> : "—"}
                      </div>
                      <div className="text-muted small mt-2">
                        Subtotal: {money(facturaSel.subtotal)} · Desc: {money(facturaSel.descuento)} · Imp: {money(facturaSel.impuesto)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <hr />

              <div className="fw-bold mb-2">Items</div>
              <Table responsive className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Cant.</th>
                    <th>Producto</th>
                    <th className="text-end" style={{ width: 130 }}>Precio</th>
                    <th className="text-end" style={{ width: 130 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(facturaSel.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted">
                        No hay items en la respuesta (depende de orden_detalle y orden_id).
                      </td>
                    </tr>
                  ) : (
                    (facturaSel.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold">{it.cantidad}</td>
                        <td className="fw-semibold">
                          {it.nombre}
                          {it.notas ? <div className="text-muted small">Nota: {it.notas}</div> : null}
                        </td>
                        <td className="text-end">{money(it.precio)}</td>
                        <td className="text-end fw-bold">{money(it.subtotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
          <Button
            variant="dark"
            onClick={() => (facturaSel ? reimprimir(facturaSel) : null)}
            disabled={!facturaSel}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaPrint />
            Reimprimir (COPIA)
          </Button>

          <Button
            variant="outline-secondary"
            onClick={() => setShowDetalle(false)}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaTimes />
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
