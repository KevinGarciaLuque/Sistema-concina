//Frontend/src/pages/admin/GastionUsuarios.jsx
import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "react-bootstrap";
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
  FaEllipsisV,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
  
} from "react-icons/fa";
import api from "../../api/axios";

/* ========= Helpers ========= */

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.usuarios)) return payload.usuarios;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.roles)) return payload.roles;
  return [];
}

function pickRole(r) {
  return {
    id: Number(r?.id ?? r?.rol_id ?? 0) || 0,
    nombre: String(r?.nombre ?? r?.rol ?? r?.name ?? "").trim(),
  };
}

function pickUser(u) {
  return {
    id: Number(u?.id ?? u?.usuario_id ?? u?.ID ?? 0) || 0,
    rol_id: Number(u?.rol_id ?? u?.role_id ?? 0) || 0,
    nombre: u?.nombre ?? u?.name ?? "",
    usuario: u?.usuario ?? u?.username ?? "",
    rol: u?.rol ?? u?.role ?? "", // nombre del rol (si tu backend lo manda)
    activo: Number(u?.activo ?? u?.is_active ?? 1) === 1,
    creado_en: u?.creado_en ?? u?.created_at ?? null,
  };
}

function roleBadgeVariant(rolNombre) {
  const r = String(rolNombre || "").toLowerCase();
  if (r === "admin") return "danger";
  if (r === "supervisor") return "primary";
  if (r === "cajero") return "success";
  if (r === "cocina") return "warning";
  return "secondary";
}

/* ========= API ========= */

async function apiObtenerUsuarios() {
  const { data } = await api.get("/usuarios");
  return toArray(data).map(pickUser);
}

async function apiObtenerRoles() {
  const { data } = await api.get("/roles");
  return toArray(data).map(pickRole);
}

async function apiCrearUsuario(body) {
  const { data } = await api.post("/usuarios", body);
  return data;
}

async function apiActualizarUsuario(id, body) {
  const { data } = await api.put(`/usuarios/${id}`, body);
  return data;
}

async function apiToggleUsuario(id, activo) {
  const { data } = await api.patch(`/usuarios/${id}/activo`, { activo });
  return data;
}

/* ========= Component ========= */

export default function GestionUsuarios() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);

  const [q, setQ] = useState("");
  const [fRol, setFRol] = useState("todos"); // ahora filtra por nombre de rol

  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);

  const [verPass, setVerPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // rol_id por defecto: intenta encontrar "cajero" si existe, si no el primero
  const defaultRolId = useMemo(() => {
    const cajero = roles.find(
      (r) => String(r.nombre).toLowerCase() === "cajero",
    );
    return cajero?.id || roles?.[0]?.id || 0;
  }, [roles]);

  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    password: "",
    rol_id: 0,
    activo: 1,
  });

  // map rol_id => nombre
  const rolNombreById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(Number(r.id), r.nombre));
    return m;
  }, [roles]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [usuarios]);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();

    return usuarios.filter((u) => {
      const rolNombre = (
        u.rol ||
        rolNombreById.get(Number(u.rol_id)) ||
        ""
      ).toLowerCase();
      const matchRol =
        fRol === "todos" ? true : rolNombre === String(fRol).toLowerCase();

      const base =
        `${u.id} ${u.nombre} ${u.usuario} ${rolNombre}`.toLowerCase();
      const matchText = !text ? true : base.includes(text);

      return matchRol && matchText;
    });
  }, [usuarios, q, fRol, rolNombreById]);

  const cargar = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const [users, rs] = await Promise.all([
        apiObtenerUsuarios(),
        apiObtenerRoles(),
      ]);
      setUsuarios(Array.isArray(users) ? users : []);
      setRoles(Array.isArray(rs) ? rs : []);
    } catch (e) {
      setUsuarios([]);
      setRoles([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar los datos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Cuando carguen roles por primera vez, setea rol_id por defecto si está en 0
  useEffect(() => {
    if (!showForm) return;
    if (Number(form.rol_id) === 0 && defaultRolId) {
      setForm((f) => ({ ...f, rol_id: defaultRolId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, defaultRolId, showForm]);

  const abrirCrear = () => {
    setEdit(null);
    setVerPass(false);
    setForm({
      nombre: "",
      usuario: "",
      password: "",
      rol_id: defaultRolId || 0,
      activo: 1,
    });
    setShowForm(true);
  };

  const abrirEditar = (u) => {
    setEdit(u);
    setVerPass(false);
    setForm({
      nombre: u.nombre || "",
      usuario: u.usuario || "",
      password: "", // opcional
      rol_id: Number(u.rol_id) || defaultRolId || 0,
      activo: u.activo ? 1 : 0,
    });
    setShowForm(true);
  };

  const validar = () => {
    const nombre = String(form.nombre || "").trim();
    const usuarioTxt = String(form.usuario || "").trim();
    const rolId = Number(form.rol_id);

    if (!nombre) return "El nombre es obligatorio.";
    if (!usuarioTxt) return "El usuario es obligatorio.";
    if (!rolId || rolId <= 0) return "rol_id inválido.";

    // crear => password requerido
    if (!edit?.id && !String(form.password || "").trim()) {
      return "La contraseña es obligatoria al crear.";
    }

    // opcional: mínimo de contraseña
    const pass = String(form.password || "").trim();
    if (pass && pass.length < 6)
      return "La contraseña debe tener mínimo 6 caracteres.";

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
        nombre: String(form.nombre || "").trim(),
        usuario: String(form.usuario || "").trim(),
        rol_id: Number(form.rol_id),
        activo: Number(form.activo) ? 1 : 0,
      };

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

  const rolesOptions = useMemo(() => {
    // solo roles válidos
    return roles.filter((r) => r?.id && r?.nombre);
  }, [roles]);

  const roleName = (u) => {
    const name = u?.rol || rolNombreById.get(Number(u?.rol_id)) || "";
    return name || "—";
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
                Control de accesos por rol · Activación/Desactivación ·
                Administración
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

          <Button variant="primary" onClick={abrirCrear} disabled={loading}>
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
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Total
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {stats.total}
                </div>
              </div>
              <Badge bg="secondary">Usuarios</Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Activos
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {stats.activos}
                </div>
              </div>
              <Badge bg="success">ON</Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Inactivos
                </div>
                <div className="fw-bold" style={{ fontSize: 22 }}>
                  {stats.inactivos}
                </div>
              </div>
              <Badge bg="secondary">OFF</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Message */}
      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

      {/* Aviso si roles no cargan */}
      {!loading && rolesOptions.length === 0 ? (
        <Alert variant="warning" className="d-flex align-items-center gap-2">
          <FaExclamationTriangle />
          No se pudieron cargar los roles. Verifica que exista la ruta{" "}
          <b>GET /api/roles</b>.
        </Alert>
      ) : null}

      {/* Filters + Table */}
     <Card className="border-0 shadow-sm rounded-4 w-100 overflow-hidden">
  <Card.Body className="p-0">
    {/* Filtros */}
    <div className="p-3 pb-2">
      <Row className="g-2 align-items-end">
        <Col lg={6}>
          <Form.Label className="fw-semibold">Buscar</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
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
            {rolesOptions.map((r) => (
              <option key={r.id} value={String(r.nombre).toLowerCase()}>
                {r.nombre}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col lg={3} className="text-lg-end">
          <div className="text-muted" style={{ fontSize: 12 }}>
            Mostrando <b>{filtrados.length}</b> de <b>{usuarios.length}</b>
          </div>
        </Col>
      </Row>
    </div>

    {/* Tabla */}
    <div
      className="w-100 overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: "65vh" }}
    >
      <Table hover size="sm" className="align-middle mb-0 w-100">
        <thead className="table-light sticky-top">
          <tr className="small text-uppercase">
            <th className="text-nowrap" style={{ width: 70 }}>
              ID
            </th>
            <th>Nombre</th>
            <th>Usuario</th>
            <th className="text-nowrap">Rol</th>
            <th className="text-nowrap">Estado</th>
            <th className="text-nowrap text-end">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="py-4 text-muted text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando usuarios…
              </td>
            </tr>
          ) : filtrados.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-muted text-center">
                No hay usuarios con esos filtros.
              </td>
            </tr>
          ) : (
            filtrados.map((u) => {
              const isBusy = busyId === u.id;
              const rolNom = roleName(u);

              return (
                <tr key={u.id} className="small">
                  <td className="text-muted text-nowrap">{u.id}</td>

                  {/* ✅ no ensancha */}
                  <td className="fw-semibold">
                    <span
                      className="d-inline-block text-truncate"
                      style={{ maxWidth: 260 }}
                      title={u.nombre}
                    >
                      {u.nombre}
                    </span>
                  </td>

                  <td>
                    <span
                      className="d-inline-block text-truncate"
                      style={{ maxWidth: 220 }}
                      title={u.usuario}
                    >
                      {u.usuario}
                    </span>
                  </td>

                  <td className="text-nowrap">
                    <Badge bg={roleBadgeVariant(rolNom)}>{rolNom}</Badge>
                  </td>

                  <td className="text-nowrap">
                    <Badge bg={u.activo ? "success" : "secondary"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>

                  {/* ✅ Dropdown elegante (no rompe ancho) */}
                  <td className="text-end text-nowrap">
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        size="sm"
                        variant="outline-dark"
                        className="d-inline-flex align-items-center gap-2"
                        disabled={isBusy}
                      >
                        <FaEllipsisV />
                        Acciones
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item
                          className="d-flex align-items-center gap-2"
                          onClick={() => toggleActivo(u)}
                          disabled={isBusy}
                        >
                          {isBusy ? (
                            <Spinner size="sm" animation="border" />
                          ) : u.activo ? (
                            <FaToggleOn />
                          ) : (
                            <FaToggleOff />
                          )}
                          {u.activo ? "Desactivar" : "Activar"}
                        </Dropdown.Item>

                        <Dropdown.Item
                          className="d-flex align-items-center gap-2"
                          onClick={() => abrirEditar(u)}
                          disabled={isBusy}
                        >
                          <FaEdit /> Editar
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nombre: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usuario: e.target.value }))
                    }
                    placeholder="Ej: kevin"
                    autoComplete="off"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Contraseña{" "}
                    {edit?.id ? (
                      <span className="text-muted">(opcional)</span>
                    ) : null}
                  </Form.Label>

                  <InputGroup>
                    <Form.Control
                      type={verPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      placeholder={
                        edit?.id
                          ? "Dejar vacío para no cambiar"
                          : "Ingresar contraseña"
                      }
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
                    Tip: usa mínimo 6 caracteres para evitar contraseñas
                    débiles.
                  </div>
                </Form.Group>
              </Col>

              <Col md={7}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Rol</Form.Label>
                  <Form.Select
                    value={form.rol_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rol_id: Number(e.target.value) }))
                    }
                    disabled={rolesOptions.length === 0}
                  >
                    {rolesOptions.length === 0 ? (
                      <option value={0}>Sin roles (revisa /api/roles)</option>
                    ) : (
                      rolesOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={5} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="user-activo"
                  label="Activo"
                  checked={Number(form.activo) === 1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activo: e.target.checked ? 1 : 0 }))
                  }
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || rolesOptions.length === 0}
            >
              {saving ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
