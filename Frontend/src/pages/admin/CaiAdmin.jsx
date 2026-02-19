// Frontend/src/pages/admin/CaiAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FaKey,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaSyncAlt,
  FaSearch,
  FaExclamationTriangle,
} from "react-icons/fa";
import api from "../../api";

/* ================= Helpers ================= */

const onlyDigits = (v) => String(v ?? "").replace(/\D/g, "");
const pad = (v, len) => String(v ?? "").padStart(len, "0");
const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function buildNumeroPreview(row, correlativo) {
  const est = pad(onlyDigits(row?.establecimiento).slice(0, 3), 3);
  const pto = pad(onlyDigits(row?.punto_emision).slice(0, 3), 3);
  const tipo = pad(onlyDigits(row?.tipo_documento).slice(0, 2), 2);
  const cor = pad(onlyDigits(correlativo).slice(0, 8), 8);
  return `${est}-${pto}-${tipo}-${cor}`;
}

function badgeActivo(v) {
  return v ? (
    <Badge bg="success" className="px-3 py-2" style={{ fontSize: 12 }}>
      ACTIVO
    </Badge>
  ) : (
    <Badge bg="secondary" className="px-3 py-2" style={{ fontSize: 12 }}>
      INACTIVO
    </Badge>
  );
}

function fmtFecha(v) {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  return s || "—";
}

function fmtLempira(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

/* ================= Modal Form ================= */

function CaiFormModal({
  show,
  onHide,
  onSave,
  saving,
  initial,
  mode = "create", // create | edit
}) {
  const [form, setForm] = useState({
    cai_codigo: "",
    establecimiento: "000",
    punto_emision: "000",
    tipo_documento: "00",
    rango_desde: "",
    rango_hasta: "",
    correlativo_actual: "0",
    fecha_limite: "",
    activo: 0,
  });

  const [err, setErr] = useState("");

  useEffect(() => {
    if (!show) return;
    const i = initial || {};
    setErr("");
    setForm({
      cai_codigo: i.cai_codigo ?? "",
      establecimiento: i.establecimiento ?? "000",
      punto_emision: i.punto_emision ?? "000",
      tipo_documento: i.tipo_documento ?? "00",
      rango_desde: i.rango_desde ?? "",
      rango_hasta: i.rango_hasta ?? "",
      correlativo_actual:
        i.correlativo_actual != null ? String(i.correlativo_actual) : "0",
      fecha_limite: i.fecha_limite ? String(i.fecha_limite).slice(0, 10) : "",
      activo: Number(i.activo) === 1 ? 1 : 0,
    });
  }, [show, initial]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const cai_codigo = String(form.cai_codigo || "").trim();
    const establecimiento = pad(
      onlyDigits(form.establecimiento).slice(0, 3),
      3,
    );
    const punto_emision = pad(onlyDigits(form.punto_emision).slice(0, 3), 3);
    const tipo_documento = pad(onlyDigits(form.tipo_documento).slice(0, 2), 2);

    const rd = toNum(form.rango_desde);
    const rh = toNum(form.rango_hasta);
    const ca = toNum(form.correlativo_actual);

    if (!cai_codigo) return "El CAI (código) es obligatorio.";
    if (
      establecimiento.length !== 3 ||
      punto_emision.length !== 3 ||
      tipo_documento.length !== 2
    )
      return "Formato inválido: establecimiento(3), punto_emision(3), tipo_documento(2).";
    if (
      !Number.isFinite(rd) ||
      !Number.isFinite(rh) ||
      rd <= 0 ||
      rh <= 0 ||
      rd > rh
    )
      return "Rango inválido (desde/hasta).";
    if (!Number.isFinite(ca) || ca < 0) return "correlativo_actual inválido.";
    if (!form.fecha_limite) return "Fecha límite obligatoria.";

    // Importante: para iniciar bien, lo ideal es que correlativo_actual sea (rango_desde - 1)
    // Para no bloquear el cobro en backend.
    if (ca < rd - 1)
      return `correlativo_actual debe ser >= (rango_desde - 1). Sugerido: ${rd - 1}`;

    return "";
  };

  const previewNumero = useMemo(() => {
    const rd = toNum(form.rango_desde);
    const ca = toNum(form.correlativo_actual);
    const next = Number.isFinite(ca) ? ca + 1 : "";
    const row = {
      establecimiento: form.establecimiento,
      punto_emision: form.punto_emision,
      tipo_documento: form.tipo_documento,
    };
    if (!Number.isFinite(rd) || !Number.isFinite(ca)) return "—";
    return buildNumeroPreview(row, next);
  }, [
    form.establecimiento,
    form.punto_emision,
    form.tipo_documento,
    form.rango_desde,
    form.correlativo_actual,
  ]);

  const handleSave = () => {
    const e = validate();
    if (e) {
      setErr(e);
      return;
    }

    const payload = {
      cai_codigo: String(form.cai_codigo || "").trim(),
      establecimiento: pad(onlyDigits(form.establecimiento).slice(0, 3), 3),
      punto_emision: pad(onlyDigits(form.punto_emision).slice(0, 3), 3),
      tipo_documento: pad(onlyDigits(form.tipo_documento).slice(0, 2), 2),
      rango_desde: Number(form.rango_desde),
      rango_hasta: Number(form.rango_hasta),
      correlativo_actual: Number(form.correlativo_actual),
      fecha_limite: form.fecha_limite,
      activo: Number(form.activo) === 1 ? 1 : 0,
    };

    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">
          {mode === "edit" ? "Editar CAI" : "Registrar CAI"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {err ? (
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            <FaExclamationTriangle /> {err}
          </Alert>
        ) : null}

        <Row className="g-3">
          <Col md={8}>
            <Form.Label className="fw-semibold">Código CAI</Form.Label>
            <Form.Control
              value={form.cai_codigo}
              onChange={(e) => setField("cai_codigo", e.target.value)}
              placeholder="Ej: ABCD-EFGH-IJKL-MNOP-QRST-UVWX"
            />
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              Se guarda como texto (tal cual te lo dan).
            </div>
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Fecha límite</Form.Label>
            <Form.Control
              type="date"
              value={form.fecha_limite}
              onChange={(e) => setField("fecha_limite", e.target.value)}
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Establecimiento (3)</Form.Label>
            <Form.Control
              value={form.establecimiento}
              onChange={(e) => setField("establecimiento", e.target.value)}
              placeholder="000"
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Punto emisión (3)</Form.Label>
            <Form.Control
              value={form.punto_emision}
              onChange={(e) => setField("punto_emision", e.target.value)}
              placeholder="000"
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Tipo doc (2)</Form.Label>
            <Form.Control
              value={form.tipo_documento}
              onChange={(e) => setField("tipo_documento", e.target.value)}
              placeholder="00"
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Rango desde</Form.Label>
            <Form.Control
              type="number"
              value={form.rango_desde}
              onChange={(e) => setField("rango_desde", e.target.value)}
              placeholder="1"
              min={1}
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Rango hasta</Form.Label>
            <Form.Control
              type="number"
              value={form.rango_hasta}
              onChange={(e) => setField("rango_hasta", e.target.value)}
              placeholder="99999999"
              min={1}
            />
          </Col>

          <Col md={4}>
            <Form.Label className="fw-semibold">Correlativo actual</Form.Label>
            <Form.Control
              type="number"
              value={form.correlativo_actual}
              onChange={(e) => setField("correlativo_actual", e.target.value)}
              min={0}
            />
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              Para empezar bien: recomendado <b>rango_desde - 1</b>.
            </div>
          </Col>

          <Col md={8}>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="py-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="fw-bold">
                      Vista previa del próximo número
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      (est-pto-tipo-correlativo)
                    </div>
                  </div>
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    {previewNumero}
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={12}>
            <Form.Check
              type="switch"
              id="switch-activo"
              checked={Number(form.activo) === 1}
              onChange={(e) => setField("activo", e.target.checked ? 1 : 0)}
              label={
                <span className="fw-semibold">
                  Activar este CAI al guardar (desactiva los demás)
                </span>
              }
            />
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />{" "}
              Guardando...
            </>
          ) : (
            <>Guardar</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ================= Confirm Modal ================= */

function ConfirmModal({ show, onHide, onConfirm, title, body, busy }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />{" "}
              Procesando...
            </>
          ) : (
            "Eliminar"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ================= Main Page ================= */

export default function CaiAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const [stock, setStock] = useState(null);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editRow, setEditRow] = useState(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const filtered = useMemo(() => {
    const s = String(q || "")
      .trim()
      .toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const a = String(r.cai_codigo || "").toLowerCase();
      const b = String(r.establecimiento || "");
      const c = String(r.punto_emision || "");
      const d = String(r.tipo_documento || "");
      return (
        a.includes(s) ||
        `${b}-${c}-${d}`.includes(s) ||
        String(r.rango_desde ?? "").includes(s) ||
        String(r.rango_hasta ?? "").includes(s)
      );
    });
  }, [rows, q]);

  const loadAll = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const [a, b] = await Promise.all([
        api.get("/cai"),
        api.get("/cai/stock"),
      ]);
      setRows(Array.isArray(a?.data?.data) ? a.data.data : []);
      setStock(b?.data?.data ?? null);
    } catch (e) {
      setRows([]);
      setStock(null);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cargar CAI.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreate = () => {
    setFormMode("create");
    setEditRow(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setFormMode("edit");
    setEditRow(r);
    setShowForm(true);
  };

  const save = async (payload) => {
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      if (formMode === "edit" && editRow?.id) {
        await api.put(`/cai/${editRow.id}`, payload);
        setMsg({ type: "success", text: "✅ CAI actualizado." });
      } else {
        await api.post("/cai", payload);
        setMsg({ type: "success", text: "✅ CAI registrado." });
      }
      setShowForm(false);
      setEditRow(null);
      await loadAll();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo guardar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const activar = async (id) => {
    setMsg({ type: "", text: "" });
    try {
      await api.put(`/cai/${id}/activar`);
      setMsg({ type: "success", text: "✅ CAI activado." });
      await loadAll();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo activar.",
      });
    }
  };

  const askDelete = (r) => {
    setDeleteRow(r);
    setShowDelete(true);
  };

  const doDelete = async () => {
    if (!deleteRow?.id) return;
    setBusyDelete(true);
    setMsg({ type: "", text: "" });
    try {
      await api.delete(`/cai/${deleteRow.id}`);
      setMsg({ type: "success", text: "✅ CAI eliminado." });
      setShowDelete(false);
      setDeleteRow(null);
      await loadAll();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo eliminar.",
      });
    } finally {
      setBusyDelete(false);
    }
  };

  const activoRow = useMemo(
    () => rows.find((r) => Number(r.activo) === 1) || null,
    [rows],
  );

  const stockBadge = useMemo(() => {
    if (!stock?.cai_id) return <Badge bg="secondary">Sin CAI activo</Badge>;
    const restante = Number(stock.restante || 0);
    if (restante <= 0) return <Badge bg="danger">Sin stock</Badge>;
    if (restante <= 25)
      return (
        <Badge bg="warning" text="dark">
          Stock bajo: {restante}
        </Badge>
      );
    return <Badge bg="success">Stock: {restante}</Badge>;
  }, [stock]);

  return (
    <div className="p-2 p-md-3">
      <Row className="g-2 align-items-center mb-3">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                background: "rgba(13,110,253,.12)",
              }}
            >
              <FaKey />
            </div>
            <div>
              <div
                style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4 }}
              >
                Control CAI
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Registrar · Editar · Eliminar · Activar · Stock
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex align-items-center gap-2">
          {stockBadge}

          <Button
            variant="outline-primary"
            onClick={loadAll}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Actualizar
          </Button>

          <Button
            variant="primary"
            onClick={openCreate}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaPlus /> Nuevo CAI
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* Tarjeta CAI activo */}
      <Row className="g-3 mb-3">
        <Col lg={12}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <div className="fw-bold">CAI activo</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  El POS usará este CAI para generar el número fiscal
                  automáticamente.
                </div>
              </div>

              {activoRow ? (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    {activoRow.cai_codigo}
                  </Badge>
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    {pad(onlyDigits(activoRow.establecimiento), 3)}-
                    {pad(onlyDigits(activoRow.punto_emision), 3)}-
                    {pad(onlyDigits(activoRow.tipo_documento), 2)}
                  </Badge>
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    Rango: {activoRow.rango_desde} → {activoRow.rango_hasta}
                  </Badge>
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    Límite: {fmtFecha(activoRow.fecha_limite)}
                  </Badge>
                </div>
              ) : (
                <Badge bg="secondary" className="px-3 py-2">
                  No hay CAI activo
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <Row className="g-2 align-items-center mb-3">
            <Col md={6} lg={5}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por CAI, establecimiento, rango..."
                />
              </InputGroup>
            </Col>

            <Col className="text-muted" style={{ fontSize: 12 }}>
              {loading ? "Cargando..." : `${filtered.length} registros`}
            </Col>
          </Row>

          <div style={{ overflow: "auto" }}>
            <Table hover responsive className="align-middle mb-0">
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "white",
                }}
              >
                <tr>
                  <th style={{ minWidth: 110 }}>Estado</th>
                  <th style={{ minWidth: 320 }}>CAI</th>
                  <th style={{ minWidth: 160 }}>Est-PE-Tipo</th>
                  <th style={{ minWidth: 180 }}>Rango</th>
                  <th style={{ minWidth: 140 }}>Correlativo</th>
                  <th style={{ minWidth: 140 }}>Fecha límite</th>
                  <th style={{ minWidth: 220 }} className="text-end">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />{" "}
                      Cargando...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-muted">
                      No hay CAI registrados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const next = Number(r.correlativo_actual || 0) + 1;
                    const preview = buildNumeroPreview(r, next);
                    return (
                      <tr key={r.id}>
                        <td>{badgeActivo(Number(r.activo) === 1)}</td>

                        <td>
                          <div className="fw-bold">{r.cai_codigo}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            Próximo:{" "}
                            <span className="fw-semibold">{preview}</span>
                          </div>
                        </td>

                        <td className="text-muted">
                          {pad(onlyDigits(r.establecimiento), 3)}-
                          {pad(onlyDigits(r.punto_emision), 3)}-
                          {pad(onlyDigits(r.tipo_documento), 2)}
                        </td>

                        <td>
                          <Badge bg="light" text="dark" className="px-3 py-2">
                            {r.rango_desde} → {r.rango_hasta}
                          </Badge>
                        </td>

                        <td>
                          <Badge bg="light" text="dark" className="px-3 py-2">
                            {r.correlativo_actual}
                          </Badge>
                        </td>

                        <td>
                          <Badge bg="light" text="dark" className="px-3 py-2">
                            {fmtFecha(r.fecha_limite)}
                          </Badge>
                        </td>

                        <td className="text-end">
                          <div className="d-inline-flex gap-2 flex-wrap justify-content-end">
                            <Button
                              size="sm"
                              variant="outline-dark"
                              onClick={() => openEdit(r)}
                              className="d-inline-flex align-items-center gap-2"
                            >
                              <FaEdit /> Editar
                            </Button>

                            {Number(r.activo) === 1 ? (
                              <Button
                                size="sm"
                                variant="success"
                                disabled
                                className="d-inline-flex align-items-center gap-2"
                              >
                                <FaToggleOn /> Activo
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => activar(r.id)}
                                className="d-inline-flex align-items-center gap-2"
                              >
                                <FaToggleOff /> Activar
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => askDelete(r)}
                              className="d-inline-flex align-items-center gap-2"
                            >
                              <FaTrash /> Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Panel stock activo */}
          <Row className="g-2 mt-3">
            <Col lg={12}>
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="py-3">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="fw-bold">Stock CAI (activo)</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        Basado en correlativo_actual + rango_hasta.
                      </div>
                    </div>

                    {!stock?.cai_id ? (
                      <Badge bg="secondary" className="px-3 py-2">
                        Sin CAI activo
                      </Badge>
                    ) : (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Badge bg="light" text="dark" className="px-3 py-2">
                          Próximo:{" "}
                          {buildNumeroPreview(
                            activoRow,
                            stock.next_correlativo,
                          )}
                        </Badge>
                        <Badge bg="light" text="dark" className="px-3 py-2">
                          Restante: {stock.restante}
                        </Badge>
                        <Badge bg="light" text="dark" className="px-3 py-2">
                          Límite: {fmtFecha(stock.fecha_limite)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Modals */}
      <CaiFormModal
        show={showForm}
        onHide={() => setShowForm(false)}
        onSave={save}
        saving={saving}
        initial={formMode === "edit" ? editRow : null}
        mode={formMode}
      />

      <ConfirmModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        onConfirm={doDelete}
        busy={busyDelete}
        title="Eliminar CAI"
        body={
          <div>
            <div className="mb-2">
              Vas a eliminar este CAI:
              <div className="fw-bold mt-1">{deleteRow?.cai_codigo}</div>
            </div>
            <Alert variant="warning" className="mb-0">
              Si el CAI ya se usó en facturas, el backend debe bloquear la
              eliminación.
            </Alert>
          </div>
        }
      />
    </div>
  );
}
