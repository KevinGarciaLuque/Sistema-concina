// Frontend/src/pages/admin/Roles.jsx
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
  FaUserShield,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSyncAlt,
  FaSave,
  FaKey,
} from "react-icons/fa";
import api from "../../api/axios";

/**
 * ✅ AJUSTE RÁPIDO (si tu backend usa otra forma):
 * - Cargar permisos asignados a un rol
 * - Guardar permisos asignados a un rol
 *
 * Solo toca estos paths si hiciera falta.
 */
const API_ROLES_PERMISOS = {
  // leer asignación (probamos en orden hasta que uno funcione)
  readTry: (rolId) => [
    { method: "get", url: `/roles-permisos/${rolId}` },
    { method: "get", url: `/roles-permisos`, params: { rol_id: rolId } },
    { method: "get", url: `/roles_permisos/${rolId}` },
  ],
  // guardar asignación (probamos en orden)
  saveTry: (rolId, permisoIds) => [
    {
      method: "post",
      url: `/roles-permisos/set`,
      data: { rol_id: rolId, permiso_ids: permisoIds },
    },
    {
      method: "post",
      url: `/roles-permisos`,
      data: { rol_id: rolId, permiso_ids: permisoIds },
    },
    {
      method: "put",
      url: `/roles-permisos/${rolId}`,
      data: { permiso_ids: permisoIds },
    },
  ],
};

/* ========= Helpers ========= */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeRol(r) {
  return {
    id: r?.id ?? r?.rol_id ?? r?.ID,
    nombre: String(r?.nombre ?? "").trim(),
  };
}

function normalizePerm(p) {
  return {
    id: p?.id ?? p?.permiso_id ?? p?.ID,
    clave: String(p?.clave ?? "").trim(),
    modulo: String(p?.modulo ?? "").trim(),
    descripcion: String(p?.descripcion ?? "").trim(),
  };
}

async function tryRequests(list) {
  let lastErr = null;
  for (const req of list) {
    try {
      const { method, url, params, data } = req;
      const res = await api[method](url, method === "get" ? { params } : data);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export default function Roles() {
  const [loading, setLoading] = useState(true);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  const [msg, setMsg] = useState({ type: "", text: "" });

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);

  // filtros
  const [qRol, setQRol] = useState("");
  const [qPerm, setQPerm] = useState("");
  const [modulo, setModulo] = useState("");

  // modal create/edit rol
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombreRol, setNombreRol] = useState("");

  // confirm delete
  const [showDel, setShowDel] = useState(false);
  const [delItem, setDelItem] = useState(null);

  // selección rol + permisos asignados
  const [rolSel, setRolSel] = useState(null);
  const [permSel, setPermSel] = useState(new Set()); // permiso_id
  const [permSelOriginal, setPermSelOriginal] = useState(new Set());

  const modulos = useMemo(() => {
    const set = new Set(permisos.map((p) => p.modulo).filter(Boolean));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [permisos]);

  const rolesFiltered = useMemo(() => {
    const qq = qRol.trim().toLowerCase();
    if (!qq) return roles;
    return roles.filter(
      (r) => r.nombre.toLowerCase().includes(qq) || String(r.id).includes(qq),
    );
  }, [roles, qRol]);

  const permisosFiltered = useMemo(() => {
    const qq = qPerm.trim().toLowerCase();
    return permisos.filter((p) => {
      if (modulo && p.modulo !== modulo) return false;
      if (!qq) return true;
      return (
        p.clave.toLowerCase().includes(qq) ||
        p.modulo.toLowerCase().includes(qq) ||
        p.descripcion.toLowerCase().includes(qq) ||
        String(p.id).includes(qq)
      );
    });
  }, [permisos, qPerm, modulo]);

  const hasChanges = useMemo(() => {
    if (permSel.size !== permSelOriginal.size) return true;
    for (const id of permSel) if (!permSelOriginal.has(id)) return true;
    return false;
  }, [permSel, permSelOriginal]);

  const loadBase = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const [r1, r2] = await Promise.all([
        api.get("/roles"),
        api.get("/permisos"),
      ]);

      const rolesArr = toArray(r1.data?.data ?? r1.data)
        .map(normalizeRol)
        .filter((x) => x.id && x.nombre);
      rolesArr.sort((a, b) => a.nombre.localeCompare(b.nombre));

      const permArr = toArray(r2.data?.data ?? r2.data)
        .map(normalizePerm)
        .filter((x) => x.id && x.clave);
      permArr.sort(
        (a, b) =>
          (a.modulo || "").localeCompare(b.modulo || "") ||
          a.clave.localeCompare(b.clave),
      );

      setRoles(rolesArr);
      setPermisos(permArr);

      // seleccionar primer rol si no hay
      if (!rolSel && rolesArr.length) setRolSel(rolesArr[0]);
    } catch (e) {
      setRoles([]);
      setPermisos([]);
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message || "No se pudieron cargar roles/permisos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line
  }, []);

  // cargar asignación cuando cambia rolSel
  const loadAsignacion = async (rol) => {
    if (!rol?.id) return;
    setLoadingAssign(true);
    setMsg({ type: "", text: "" });

    try {
      const res = await tryRequests(API_ROLES_PERMISOS.readTry(rol.id));
      const payload = res.data?.data ?? res.data;

      // aceptamos múltiples formatos:
      // - { data: [ {permiso_id} ] }
      // - { data: [ ids ] }
      // - { permisos: [...] }
      const arr = toArray(payload?.permisos ?? payload);

      const ids = new Set(
        arr
          .map((x) => (typeof x === "number" ? x : (x?.permiso_id ?? x?.id)))
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v)),
      );

      setPermSel(ids);
      setPermSelOriginal(new Set(ids));
    } catch (e) {
      // si falla, no rompemos; solo avisamos
      setPermSel(new Set());
      setPermSelOriginal(new Set());
      setMsg({
        type: "warning",
        text:
          e?.response?.data?.message ||
          "No se pudo cargar la asignación de permisos del rol. Revisa backend /api/roles-permisos.",
      });
    } finally {
      setLoadingAssign(false);
    }
  };

  useEffect(() => {
    if (rolSel?.id) loadAsignacion(rolSel);
    // eslint-disable-next-line
  }, [rolSel?.id]);

  /* ========= CRUD Roles ========= */
  const openCreate = () => {
    setEditing(null);
    setNombreRol("");
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setNombreRol(r.nombre);
    setShowModal(true);
  };

  const saveRol = async () => {
    const nombre = nombreRol.trim().toLowerCase();
    if (!nombre)
      return setMsg({
        type: "warning",
        text: "El nombre del rol es obligatorio.",
      });

    setBusySave(true);
    setMsg({ type: "", text: "" });

    try {
      if (editing?.id) {
        await api.put(`/roles/${editing.id}`, { nombre });
        setMsg({ type: "success", text: "✅ Rol actualizado." });
      } else {
        await api.post("/roles", { nombre });
        setMsg({ type: "success", text: "✅ Rol creado." });
      }
      setShowModal(false);
      await loadBase();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo guardar el rol.",
      });
    } finally {
      setBusySave(false);
    }
  };

  const askDelete = (r) => {
    setDelItem(r);
    setShowDel(true);
  };

  const doDelete = async () => {
    if (!delItem?.id) return;
    setBusyDelete(true);
    setMsg({ type: "", text: "" });

    try {
      await api.delete(`/roles/${delItem.id}`);
      setShowDel(false);
      setDelItem(null);
      setMsg({ type: "success", text: "🗑️ Rol eliminado." });
      await loadBase();
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo eliminar. Puede estar asignado a usuarios o permisos.",
      });
    } finally {
      setBusyDelete(false);
    }
  };

  /* ========= Asignación permisos ========= */
  const togglePerm = (permId) => {
    setPermSel((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setPermSel((prev) => {
      const next = new Set(prev);
      for (const p of permisosFiltered) next.add(Number(p.id));
      return next;
    });
  };

  const clearAllFiltered = () => {
    setPermSel((prev) => {
      const next = new Set(prev);
      for (const p of permisosFiltered) next.delete(Number(p.id));
      return next;
    });
  };

  const saveAsignacion = async () => {
    if (!rolSel?.id) return;

    setBusySave(true);
    setMsg({ type: "", text: "" });

    try {
      const permisoIds = Array.from(permSel)
        .map(Number)
        .filter((v) => Number.isFinite(v));

      await tryRequests(API_ROLES_PERMISOS.saveTry(rolSel.id, permisoIds));

      setPermSelOriginal(new Set(permSel));
      setMsg({ type: "success", text: "✅ Permisos del rol guardados." });
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          "No se pudo guardar asignación. Dime cómo espera el backend /api/roles-permisos y lo ajusto exacto.",
      });
    } finally {
      setBusySave(false);
    }
  };

  return (
    <div className="p-2 p-md-3">
      <Row className="g-3 align-items-center">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 42,
                height: 42,
                background: "rgba(33,37,41,.10)",
              }}
            >
              <FaUserShield />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 22 }}>
                Roles
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Crear roles y asignar permisos por rol
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={loadBase}
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
            <FaPlus /> Nuevo rol
          </Button>
        </Col>
      </Row>

      {msg.text ? (
        <Alert variant={msg.type} className="mt-3">
          {msg.text}
        </Alert>
      ) : null}

      <Row className="g-3 mt-1">
        {/* ROLES LIST */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 rounded-4 h-100">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-bold">Listado de roles</div>
                <Badge bg="light" text="dark" className="border">
                  {rolesFiltered.length}
                </Badge>
              </div>

              <InputGroup className="mb-2">
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  value={qRol}
                  onChange={(e) => setQRol(e.target.value)}
                  placeholder="Buscar rol..."
                />
              </InputGroup>

              <div style={{ maxHeight: "62vh", overflow: "auto" }}>
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
                      <th style={{ minWidth: 80 }}>ID</th>
                      <th style={{ minWidth: 180 }}>Rol</th>
                      <th style={{ minWidth: 160 }} className="text-end">
                        Acciones
                      </th>
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
                    ) : rolesFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-muted">
                          No hay roles.
                        </td>
                      </tr>
                    ) : (
                      rolesFiltered.map((r) => {
                        const active = rolSel?.id === r.id;
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setRolSel(r)}
                            style={{
                              cursor: "pointer",
                              background: active
                                ? "rgba(13,110,253,.08)"
                                : "transparent",
                            }}
                          >
                            <td className="text-muted">{r.id}</td>
                            <td className="fw-bold">{r.nombre}</td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  className="d-inline-flex align-items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(r);
                                  }}
                                >
                                  <FaEdit /> Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  className="d-inline-flex align-items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    askDelete(r);
                                  }}
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

              {rolSel ? (
                <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                  Seleccionado: <b>{rolSel.nombre}</b>
                </div>
              ) : null}
            </Card.Body>
          </Card>
        </Col>

        {/* ASSIGN PERMISSIONS */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 rounded-4 h-100">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaKey />
                  Permisos por rol
                  {rolSel ? (
                    <Badge bg="light" text="dark" className="border">
                      {rolSel.nombre}
                    </Badge>
                  ) : (
                    <Badge bg="secondary">Selecciona un rol</Badge>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={selectAllFiltered}
                    disabled={!rolSel || loading || loadingAssign}
                  >
                    Seleccionar (filtrados)
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={clearAllFiltered}
                    disabled={!rolSel || loading || loadingAssign}
                  >
                    Limpiar (filtrados)
                  </Button>

                  <Button
                    variant="success"
                    className="d-inline-flex align-items-center gap-2"
                    onClick={saveAsignacion}
                    disabled={
                      !rolSel || busySave || loadingAssign || !hasChanges
                    }
                  >
                    {busySave ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      <FaSave />
                    )}
                    Guardar
                  </Button>
                </div>
              </div>

              {!rolSel ? (
                <div className="text-muted py-5 text-center">
                  Selecciona un rol a la izquierda para asignarle permisos.
                </div>
              ) : loadingAssign ? (
                <div className="py-5 text-center text-muted">
                  <Spinner animation="border" className="me-2" />
                  Cargando asignación...
                </div>
              ) : (
                <>
                  <Row className="g-2 align-items-end">
                    <Col md={7}>
                      <Form.Label className="text-muted small">
                        Buscar permisos
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <FaSearch />
                        </InputGroup.Text>
                        <Form.Control
                          value={qPerm}
                          onChange={(e) => setQPerm(e.target.value)}
                          placeholder="Clave, módulo, descripción..."
                        />
                      </InputGroup>
                    </Col>

                    <Col md={3}>
                      <Form.Label className="text-muted small">
                        Módulo
                      </Form.Label>
                      <Form.Select
                        value={modulo}
                        onChange={(e) => setModulo(e.target.value)}
                      >
                        {modulos.map((m) => (
                          <option key={m || "__all__"} value={m}>
                            {m ? m : "Todos"}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    <Col md={2} className="text-md-end">
                      <div className="text-muted small">
                        Seleccionados: <b>{permSel.size}</b>
                      </div>
                    </Col>
                  </Row>

                  <div
                    className="mt-3"
                    style={{ maxHeight: "54vh", overflow: "auto" }}
                  >
                    <Table hover responsive className="mb-0 align-middle">
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          background: "white",
                        }}
                      >
                        <tr>
                          <th style={{ width: 56 }} className="text-center">
                            ✔
                          </th>
                          <th style={{ minWidth: 240 }}>Clave</th>
                          <th style={{ minWidth: 150 }}>Módulo</th>
                          <th style={{ minWidth: 420 }}>Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permisosFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-muted">
                              No hay permisos con ese filtro.
                            </td>
                          </tr>
                        ) : (
                          permisosFiltered.map((p) => {
                            const checked = permSel.has(Number(p.id));
                            return (
                              <tr
                                key={p.id}
                                onClick={() => togglePerm(Number(p.id))}
                                style={{ cursor: "pointer" }}
                              >
                                <td className="text-center">
                                  <Form.Check
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePerm(Number(p.id))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="fw-bold">{p.clave}</td>
                                <td>
                                  <Badge
                                    bg="light"
                                    text="dark"
                                    className="border"
                                  >
                                    {p.modulo || "—"}
                                  </Badge>
                                </td>
                                <td className="text-muted">
                                  {p.descripcion || "—"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {hasChanges ? (
                    <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                      Hay cambios pendientes. Presiona <b>Guardar</b>.
                    </div>
                  ) : (
                    <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                      Sin cambios pendientes.
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal create/edit rol */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {editing?.id ? "Editar rol" : "Nuevo rol"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Label className="text-muted small">Nombre del rol</Form.Label>
          <Form.Control
            value={nombreRol}
            onChange={(e) => setNombreRol(e.target.value)}
            placeholder="Ej: admin"
            autoFocus
          />
          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Recomendado en minúsculas: <code>admin</code>, <code>cajero</code>,{" "}
            <code>cocina</code>, <code>supervisor</code>.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowModal(false)}
            disabled={busySave}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={saveRol} disabled={busySave}>
            {busySave ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm delete */}
      <Modal show={showDel} onHide={() => setShowDel(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Eliminar rol</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Seguro que deseas eliminar <b>{delItem?.nombre}</b>?
          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Si el rol está asignado a usuarios o tiene permisos, el backend
            puede bloquearlo.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDel(false)}
            disabled={busyDelete}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={doDelete} disabled={busyDelete}>
            {busyDelete ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
