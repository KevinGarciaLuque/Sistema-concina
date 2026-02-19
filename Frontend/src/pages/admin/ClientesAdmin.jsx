// Frontend/src/pages/admin/ClientesAdmin.jsx
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
  FaAddressCard,
  FaSearch,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaIdCard,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import api from "../../api";

/* ================= Helpers ================= */

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function pickCliente(c) {
  return {
    id: c?.id ?? c?.cliente_id ?? c?.ID,
    nombre: c?.nombre ?? c?.cliente_nombre ?? "",
    rtn: c?.rtn ?? c?.RTN ?? c?.cliente_rtn ?? "",
    telefono: c?.telefono ?? c?.tel ?? "",
    direccion: c?.direccion ?? c?.cliente_direccion ?? "",
    email: c?.email ?? "",
    activo:
      c?.activo !== undefined && c?.activo !== null
        ? Number(c.activo)
        : c?.estado !== undefined && c?.estado !== null
          ? String(c.estado).toUpperCase() === "ACTIVO"
            ? 1
            : 0
          : 1,
    created_at: c?.created_at ?? c?.createdAt ?? null,
  };
}

const isRTN = (s) => {
  const v = String(s || "").trim();
  if (!v) return false;
  // Honduras RTN suele ser 14 dígitos (empresa) o 13 (persona). Aceptamos 13-14.
  const digits = v.replace(/\D/g, "");
  return digits.length === 13 || digits.length === 14;
};

export default function ClientesAdmin() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // data
  const [clientes, setClientes] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  // modal create/edit
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);

  const [nombre, setNombre] = useState("");
  const [rtn, setRtn] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");

  // modal delete
  const [showDel, setShowDel] = useState(false);
  const [delCli, setDelCli] = useState(null);

  // ====== API ======
  // 👉 Ajusta SOLO si tu backend usa otra ruta:
  // GET    /api/clientes
  // POST   /api/clientes
  // PUT    /api/clientes/:id
  // PATCH  /api/clientes/:id/estado   body { activo: 0|1 }
  // DELETE /api/clientes/:id
  const ENDPOINT = "/clientes";

  const load = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const params = {};
      if (soloActivos) params.activo = 1;
      if (q.trim()) params.q = q.trim();

      const { data } = await api.get(ENDPOINT, { params });
      const rows = toArray(data).map(pickCliente);
      setClientes(rows);
    } catch (e) {
      setClientes([]);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudieron cargar clientes. (Asegúrate de tener rutas /api/clientes en backend)",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, soloActivos]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clientes;
    return clientes.filter((c) => {
      const a = String(c.nombre || "").toLowerCase();
      const b = String(c.rtn || "").toLowerCase();
      const d = String(c.direccion || "").toLowerCase();
      return a.includes(s) || b.includes(s) || d.includes(s);
    });
  }, [clientes, q]);

  // ====== UI handlers ======
  const openCreate = () => {
    setEdit(null);
    setNombre("");
    setRtn("");
    setTelefono("");
    setDireccion("");
    setEmail("");
    setShow(true);
  };

  const openEdit = (c) => {
    setEdit(c);
    setNombre(String(c.nombre || ""));
    setRtn(String(c.rtn || ""));
    setTelefono(String(c.telefono || ""));
    setDireccion(String(c.direccion || ""));
    setEmail(String(c.email || ""));
    setShow(true);
  };

  const normalizeRTN = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, "");

  const submit = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });

    const n = String(nombre || "").trim();
    const r = normalizeRTN(rtn);
    const tel = String(telefono || "").trim();
    const dir = String(direccion || "").trim();
    const em = String(email || "").trim();

    if (!n)
      return setMsg({ type: "warning", text: "El nombre es obligatorio." });

    // RTN opcional (hay clientes sin RTN), pero si lo escribe, valida 13-14 dígitos.
    if (r && !isRTN(r)) {
      return setMsg({
        type: "warning",
        text: "RTN inválido. Debe tener 13 o 14 dígitos (puede llevar guiones, pero se validan dígitos).",
      });
    }

    const payload = {
      nombre: n,
      rtn: r || null,
      telefono: tel || null,
      direccion: dir || null,
      email: em || null,
    };

    setBusy(true);
    try {
      if (edit?.id) {
        await api.put(`${ENDPOINT}/${edit.id}`, payload);
        setMsg({ type: "success", text: "✅ Cliente actualizado." });
      } else {
        await api.post(ENDPOINT, payload);
        setMsg({ type: "success", text: "✅ Cliente creado." });
      }

      setShow(false);
      await load();
    } catch (e2) {
      setMsg({
        type: "danger",
        text: e2?.response?.data?.message || "No se pudo guardar el cliente.",
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = async (c) => {
    if (!c?.id) return;
    setMsg({ type: "", text: "" });
    setBusy(true);
    try {
      const nuevo = c.activo ? 0 : 1;
      await api.patch(`${ENDPOINT}/${c.id}/estado`, { activo: nuevo });
      setMsg({
        type: "success",
        text: `✅ Cliente ${nuevo ? "activado" : "desactivado"}.`,
      });
      await load();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cambiar el estado.",
      });
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (c) => {
    setDelCli(c);
    setShowDel(true);
  };

  const doDelete = async () => {
    if (!delCli?.id) return;
    setMsg({ type: "", text: "" });
    setBusy(true);
    try {
      await api.delete(`${ENDPOINT}/${delCli.id}`);
      setShowDel(false);
      setDelCli(null);
      setMsg({ type: "success", text: "✅ Cliente eliminado." });
      await load();
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo eliminar. Si el cliente ya tiene facturas, mejor desactívalo.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-2 p-md-3">
      {/* ===== Header ===== */}
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
              <FaAddressCard />
            </div>
            <div>
              <div
                style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4 }}
              >
                Clientes
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                RTN · Dirección · Búsqueda rápida · Activar/Desactivar
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={load}
            disabled={loading || busy}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <FaSyncAlt />}
            Actualizar
          </Button>

          <Button
            variant="primary"
            onClick={openCreate}
            disabled={busy}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaPlus /> Nuevo
          </Button>
        </Col>
      </Row>

      {msg.text ? (
        <Alert variant={msg.type} className="rounded-4">
          {msg.text}
        </Alert>
      ) : null}

      {/* ===== Filters ===== */}
      <Card className="shadow-sm border-0 rounded-4 mb-3">
        <Card.Body>
          <Row className="g-2 align-items-center">
            <Col md={7}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por nombre, RTN o dirección…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col md={3}>
              <Form.Check
                type="switch"
                id="sw-activos"
                label="Solo activos"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
              />
            </Col>

            <Col
              md={2}
              className="text-md-end text-muted"
              style={{ fontSize: 12 }}
            >
              Total: <b>{filtered.length}</b>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ===== Table ===== */}
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <div style={{ maxHeight: 560, overflow: "auto" }}>
            <Table hover responsive className="mb-0 align-middle">
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "white",
                }}
              >
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th style={{ minWidth: 220 }}>Nombre</th>
                  <th style={{ minWidth: 160 }}>RTN</th>
                  <th style={{ minWidth: 160 }}>Teléfono</th>
                  <th style={{ minWidth: 260 }}>Dirección</th>
                  <th style={{ width: 120 }}>Estado</th>
                  <th style={{ width: 240 }} className="text-end">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-muted">
                      <Spinner size="sm" animation="border" className="me-2" />
                      Cargando clientes…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-muted">
                      No hay clientes para mostrar.
                      <div className="mt-1" style={{ fontSize: 12 }}>
                        Si aún no existe el backend, crea las rutas{" "}
                        <code>/api/clientes</code>.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="text-muted">{c.id}</td>
                      <td className="fw-semibold">
                        {c.nombre}
                        {!c.rtn ? (
                          <Badge bg="light" text="dark" className="ms-2">
                            Sin RTN
                          </Badge>
                        ) : null}
                      </td>
                      <td className="text-muted">
                        {c.rtn ? (
                          <span className="d-inline-flex align-items-center gap-2">
                            <FaIdCard /> {c.rtn}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-muted">
                        {c.telefono ? (
                          <span className="d-inline-flex align-items-center gap-2">
                            <FaPhoneAlt /> {c.telefono}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-muted">
                        {c.direccion ? (
                          <span className="d-inline-flex align-items-center gap-2">
                            <FaMapMarkerAlt /> {c.direccion}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {c.activo ? (
                          <Badge bg="success" className="px-3">
                            Activo
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="px-3">
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-dark"
                            onClick={() => openEdit(c)}
                            disabled={busy}
                            className="d-inline-flex align-items-center gap-2"
                          >
                            <FaEdit /> Editar
                          </Button>

                          <Button
                            size="sm"
                            variant={
                              c.activo ? "outline-warning" : "outline-success"
                            }
                            onClick={() => toggleActivo(c)}
                            disabled={busy}
                            className="d-inline-flex align-items-center gap-2"
                            title={c.activo ? "Desactivar" : "Activar"}
                          >
                            {c.activo ? <FaToggleOff /> : <FaToggleOn />}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => askDelete(c)}
                            disabled={busy}
                            className="d-inline-flex align-items-center gap-2"
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
            Listo para integrarse con POS: switch “Usar cliente con RTN” +
            autocompletado.
          </div>
        </Card.Body>
      </Card>

      {/* ===== Modal Create/Edit ===== */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={submit}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              {edit?.id ? "Editar cliente" : "Nuevo cliente"}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-2">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre completo o razón social"
                    autoFocus
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>RTN (opcional)</Form.Label>
                  <Form.Control
                    value={rtn}
                    onChange={(e) => setRtn(e.target.value)}
                    placeholder="13-14 dígitos"
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    Si se usará facturación con RTN, regístralo aquí.
                  </div>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 9999-9999"
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Dirección</Form.Label>
                  <Form.Control
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección para factura"
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShow(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ===== Modal Delete ===== */}
      <Modal show={showDel} onHide={() => setShowDel(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Eliminar cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Seguro que deseas eliminar a <b>{delCli?.nombre}</b>?
          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Recomendado: si el cliente tiene facturas, mejor desactívalo.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDel(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={doDelete} disabled={busy}>
            {busy ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
