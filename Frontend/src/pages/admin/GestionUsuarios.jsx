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
  FaUsers,
  FaUserPlus,
  FaEdit,
  FaSearch,
  FaSyncAlt,
  FaToggleOn,
  FaToggleOff,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import api from "../../api/axios";

/* ========= Helpers ========= */

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.usuarios)) return payload.usuarios;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function pickUser(u) {
  // Normaliza nombres por si tu backend usa otra convención
  return {
    id: u?.id ?? u?.usuario_id ?? u?.ID,
    nombre: u?.nombre ?? u?.name ?? "",
    usuario: u?.usuario ?? u?.username ?? "",
    rol: u?.rol ?? u?.role ?? "",
    activo: Number(u?.activo ?? u?.is_active ?? 1) === 1,
    creado_en: u?.creado_en ?? u?.created_at ?? null,
  };
}

function roleBadgeVariant(rol) {
  const r = String(rol || "").toLowerCase();
  if (r === "admin") return "danger";
  if (r === "supervisor") return "primary";
  if (r === "cajero") return "success";
  if (r === "cocina") return "warning";
  return "secondary";
}

/* ========= API (ajusta rutas si tu backend difiere) ========= */

async function apiObtenerUsuarios() {
  const { data } = await api.get("/api/usuarios");
  return toArray(data).map(pickUser);
}

async function apiCrearUsuario(body) {
  const { data } = await api.post("/api/usuarios", body);
  return data;
}

async function apiActualizarUsuario(id, body) {
  const { data } = await api.put(`/api/usuarios/${id}`, body);
  return data;
}

async function apiToggleUsuario(id, activo) {
  // Ruta recomendada: PATCH /api/usuarios/:id/activo  {activo: 1|0}
  // Si tu backend usa PUT, cambia aquí.
  const { data } = await api.patch(`/api/usuarios/${id}/activo`, { activo });
  return data;
}

/* ========= Component ========= */

export default function GestionUsuarios() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [usuarios, setUsuarios] = useState([]);
  const [q, setQ] = useState("");
  const [fRol, setFRol] = useState("todos");

  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);

  const [verPass, setVerPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const ROLES = ["admin", "supervisor", "cajero", "cocina"];

  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    password: "",
    rol: "cajero",
    activo: 1,
  });

  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [usuarios]);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();
    return usuarios.filter((u) => {
      const matchRol = fRol === "todos" ? true : String(u.rol).toLowerCase() === fRol;
      const base = `${u.id} ${u.nombre} ${u.usuario} ${u.rol}`.toLowerCase();
      const matchText = !text ? true : base.includes(text);
      return matchRol && matchText;
    });
  }, [usuarios, q, fRol]);

  const cargar = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const data = await apiObtenerUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsuarios([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar los usuarios.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCrear = () => {
    setEdit(null);
    setVerPass(false);
    setForm({ nombre: "", usuario: "", password: "", rol: "cajero", activo: 1 });
    setShowForm(true);
  };

  const abrirEditar = (u) => {
    setEdit(u);
    setVerPass(false);
    setForm({
      nombre: u.nombre || "",
      usuario: u.usuario || "",
      password: "", // en edición, password opcional (solo si lo quieres cambiar)
      rol: u.rol || "cajero",
      activo: u.activo ? 1 : 0,
    });
    setShowForm(true);
  };

  const validar = () => {
    const nombre = form.nombre.trim();
    const usuarioTxt = form.usuario.trim();

    if (!nombre) return "El nombre es obligatorio.";
    if (!usuarioTxt) return "El usuario es obligatorio.";
    if (!ROLES.includes(String(form.rol).toLowerCase())) return "Rol inválido.";

    // en crear => password requerido
    if (!edit?.id && !String(form.password || "").trim()) {
      return "La contraseña es obligatoria al crear.";
    }
    return "";
  };

  const guardar = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });

    const err = validar();
    if (err) {
      setMsg({ type: "warning", text: err });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim(),
        rol: String(form.rol).toLowerCase(),
        activo: Number(form.activo) ? 1 : 0,
      };

      // si escribió password en edición, lo enviamos (si tu backend lo soporta)
      const pass = String(form.password || "").trim();
      if (pass) payload.password = pass;

      if (edit?.id) {
        await apiActualizarUsuario(edit.id, payload);
        setMsg({ type: "success", text: "Usuario actualizado." });
      } else {
        await apiCrearUsuario(payload);
        setMsg({ type: "success", text: "Usuario creado." });
      }

      setShowForm(false);
      await cargar();
    } catch (e2) {
      setMsg({
        type: "danger",
        text: e2?.response?.data?.message || "No se pudo guardar el usuario.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (u) => {
    if (!u?.id) return;
    setBusyId(u.id);
    setMsg({ type: "", text: "" });
    try {
      const next = u.activo ? 0 : 1;
      await apiToggleUsuario(u.id, next);
      await cargar();
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo cambiar el estado. (Revisa la ruta PATCH /api/usuarios/:id/activo)",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-2 p-md-3">
      {/* Header */}
      <Row className="g-2 align-items-center mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-3"
              style={{ width: 40, height: 40, background: "#e9f2ff" }}
            >
              <FaUsers />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Gestión de Usuarios
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Control de accesos por rol · Activación/Desactivación · Administración
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={cargar} disabled={loading}>
            {loading ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : (
              <FaSyncAlt className="me-2" />
            )}
            Recargar
          </Button>

          <Button variant="primary" onClick={abrirCrear}>
            <FaUserPlus className="me-2" />
            Nuevo
          </Button>
        </Col>
      </Row>

      {/* Stats */}
      <Row className="g-2 mb-2">
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>Total</div>
                <div className="fw-bold" style={{ fontSize: 22 }}>{stats.total}</div>
              </div>
              <Badge bg="secondary">Usuarios</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>Activos</div>
                <div className="fw-bold" style={{ fontSize: 22 }}>{stats.activos}</div>
              </div>
              <Badge bg="success">ON</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>Inactivos</div>
                <div className="fw-bold" style={{ fontSize: 22 }}>{stats.inactivos}</div>
              </div>
              <Badge bg="secondary">OFF</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Message */}
      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* Filters + Table */}
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <Row className="g-2 align-items-end mb-2">
            <Col lg={6}>
              <Form.Label className="fw-semibold">Buscar</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre, usuario, rol, id…"
                />
              </InputGroup>
            </Col>

            <Col lg={3}>
              <Form.Label className="fw-semibold">Rol</Form.Label>
              <Form.Select value={fRol} onChange={(e) => setFRol(e.target.value)}>
                <option value="todos">Todos</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Form.Select>
            </Col>

            <Col lg={3} className="text-lg-end">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Mostrando <b>{filtrados.length}</b> de <b>{usuarios.length}</b>
              </div>
            </Col>
          </Row>

          <div style={{ maxHeight: "65vh", overflow: "auto" }}>
            <Table responsive hover className="align-middle mb-0">
              <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <tr>
                  <th style={{ minWidth: 70 }}>ID</th>
                  <th style={{ minWidth: 240 }}>Nombre</th>
                  <th style={{ minWidth: 220 }}>Usuario</th>
                  <th style={{ minWidth: 140 }}>Rol</th>
                  <th style={{ minWidth: 120 }}>Estado</th>
                  <th style={{ minWidth: 220 }} className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Cargando usuarios…
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-muted">
                      No hay usuarios con esos filtros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => {
                    const isBusy = busyId === u.id;
                    return (
                      <tr key={u.id}>
                        <td className="text-muted">{u.id}</td>
                        <td className="fw-semibold">{u.nombre}</td>
                        <td>{u.usuario}</td>
                        <td>
                          <Badge bg={roleBadgeVariant(u.rol)}>{u.rol || "—"}</Badge>
                        </td>
                        <td>
                          <Badge bg={u.activo ? "success" : "secondary"}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <Button
                              size="sm"
                              variant={u.activo ? "outline-success" : "outline-secondary"}
                              onClick={() => toggleActivo(u)}
                              disabled={isBusy}
                              className="d-inline-flex align-items-center gap-2"
                              title="Activar/Desactivar"
                            >
                              {isBusy ? (
                                <Spinner size="sm" animation="border" />
                              ) : u.activo ? (
                                <FaToggleOn />
                              ) : (
                                <FaToggleOff />
                              )}
                              {u.activo ? "ON" : "OFF"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline-dark"
                              onClick={() => abrirEditar(u)}
                              className="d-inline-flex align-items-center gap-2"
                            >
                              <FaEdit />
                              Editar
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
        </Card.Body>
      </Card>

      {/* Modal Crear/Editar */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {edit?.id ? "Editar usuario" : "Nuevo usuario"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={guardar}>
          <Modal.Body>
            <Row className="g-2">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nombre</Form.Label>
                  <Form.Control
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Kevin García"
                    autoFocus
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Usuario</Form.Label>
                  <Form.Control
                    value={form.usuario}
                    onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                    placeholder="Ej: kevin"
                    autoComplete="off"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Contraseña {edit?.id ? <span className="text-muted">(opcional)</span> : null}
                  </Form.Label>

                  <InputGroup>
                    <Form.Control
                      type={verPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={edit?.id ? "Dejar vacío para no cambiar" : "Ingresar contraseña"}
                      autoComplete="new-password"
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setVerPass((v) => !v)}
                      type="button"
                      title={verPass ? "Ocultar" : "Mostrar"}
                    >
                      {verPass ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>

                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    Tip: usa mínimo 6 caracteres para evitar contraseñas débiles.
                  </div>
                </Form.Group>
              </Col>

              <Col md={7}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Rol</Form.Label>
                  <Form.Select
                    value={form.rol}
                    onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={5} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="user-activo"
                  label="Activo"
                  checked={Number(form.activo) === 1}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked ? 1 : 0 }))}
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
