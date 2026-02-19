// src/pages/admin/Permisos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { FaKey, FaPlus, FaEdit, FaTrash, FaSyncAlt, FaSearch } from "react-icons/fa";
import api from "../../api";

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

export default function Permisos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [permisos, setPermisos] = useState([]);
  const [q, setQ] = useState("");

  // Modal create/edit
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null); // {id,clave,modulo,descripcion}
  const [clave, setClave] = useState("");
  const [modulo, setModulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Modal delete
  const [showDel, setShowDel] = useState(false);
  const [delItem, setDelItem] = useState(null);

  const load = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const { data } = await api.get("/permisos");
      setPermisos(toArray(data));
    } catch (e) {
      setPermisos([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar permisos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return permisos;
    return permisos.filter((p) => {
      const a = String(p?.clave || "").toLowerCase();
      const b = String(p?.modulo || "").toLowerCase();
      const c = String(p?.descripcion || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [permisos, q]);

  const openCreate = () => {
    setEdit(null);
    setClave("");
    setModulo("");
    setDescripcion("");
    setShow(true);
  };

  const openEdit = (p) => {
    setEdit(p);
    setClave(String(p?.clave || ""));
    setModulo(String(p?.modulo || ""));
    setDescripcion(String(p?.descripcion || ""));
    setShow(true);
  };

  const normalizeClave = (v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9._-]/g, "");

  const normalizeModulo = (v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

  const submit = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });

    const c = normalizeClave(clave);
    const m = normalizeModulo(modulo || "GENERAL");
    const d = String(descripcion || "").trim();

    if (!c) return setMsg({ type: "warning", text: "La clave es obligatoria." });
    if (!m) return setMsg({ type: "warning", text: "El módulo es obligatorio." });

    setSaving(true);
    try {
      if (edit?.id) {
        await api.put(`/permisos/${edit.id}`, { clave: c, modulo: m, descripcion: d || null });
      } else {
        await api.post("/permisos", { clave: c, modulo: m, descripcion: d || null });
      }
      setShow(false);
      await load();
      setMsg({ type: "success", text: "✅ Permiso guardado." });
    } catch (e2) {
      setMsg({
        type: "danger",
        text: e2?.response?.data?.message || "No se pudo guardar el permiso (revisa clave duplicada).",
      });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (p) => {
    setDelItem(p);
    setShowDel(true);
  };

  const doDelete = async () => {
    if (!delItem?.id) return;
    setMsg({ type: "", text: "" });
    setSaving(true);
    try {
      await api.delete(`/permisos/${delItem.id}`);
      setShowDel(false);
      setDelItem(null);
      await load();
      setMsg({ type: "success", text: "✅ Permiso eliminado." });
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo eliminar. Si está asignado a roles, quítalo primero.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-3">
      <Row className="g-2 align-items-center mb-3">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40, background: "rgba(33,37,41,.10)" }}
            >
              <FaKey />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 22 }}>Permisos</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Claves que controlan el menú y el acceso (ej: POS.USAR, CAI.ADMIN…)
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={load}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Actualizar
          </Button>

          <Button
            variant="dark"
            onClick={openCreate}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaPlus /> Nuevo permiso
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <Row className="g-2 align-items-center mb-2">
            <Col md={7}>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por clave, módulo o descripción…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col className="text-md-end text-muted" style={{ fontSize: 12 }}>
              Total: <b>{filtered.length}</b>
            </Col>
          </Row>

          <div style={{ maxHeight: 560, overflow: "auto" }}>
            <Table hover responsive className="mb-0 align-middle">
              <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th style={{ minWidth: 260 }}>Clave</th>
                  <th style={{ minWidth: 140 }}>Módulo</th>
                  <th>Descripción</th>
                  <th style={{ width: 220 }} className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted">
                      <Spinner size="sm" animation="border" className="me-2" />
                      Cargando…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted">Sin resultados.</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td className="text-muted">{p.id}</td>
                      <td className="fw-semibold">{p.clave}</td>
                      <td>{p.modulo}</td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {p.descripcion || "—"}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-dark"
                            className="d-inline-flex align-items-center gap-2"
                            onClick={() => openEdit(p)}
                          >
                            <FaEdit /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            className="d-inline-flex align-items-center gap-2"
                            onClick={() => askDelete(p)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Tip: tu tabla <code>permisos</code> en DB tiene columnas <code>clave</code>, <code>modulo</code>, <code>descripcion</code>.
          </div>
        </Card.Body>
      </Card>

      {/* Modal Create/Edit */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={submit}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">{edit?.id ? "Editar permiso" : "Nuevo permiso"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-2">
              <Col md={7}>
                <Form.Group>
                  <Form.Label>Clave</Form.Label>
                  <Form.Control
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder="Ej: CAI.ADMIN"
                    autoFocus
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    Formato sugerido: <code>MODULO.ACCION</code>
                  </div>
                </Form.Group>
              </Col>

              <Col md={5}>
                <Form.Group>
                  <Form.Label>Módulo</Form.Label>
                  <Form.Control
                    value={modulo}
                    onChange={(e) => setModulo(e.target.value)}
                    placeholder="Ej: ADMIN"
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Crear/editar/eliminar/activar CAI"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="dark" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Delete */}
      <Modal show={showDel} onHide={() => setShowDel(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Eliminar permiso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Eliminar <b>{delItem?.clave}</b>?
          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Si está asignado a roles, primero quítalo en Roles → asignación.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDel(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={doDelete} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
