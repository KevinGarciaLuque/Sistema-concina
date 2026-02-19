//src/pages/admin/Modificadores.jsx
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
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
import { FaEdit, FaPlus, FaSearch, FaToggleOn, FaToggleOff, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import {
  obtenerModificadores,
  crearModificador,
  actualizarModificador,
  eliminarModificador,
  toggleModificador,
  obtenerOpciones,
  crearOpcion,
  actualizarOpcion,
  eliminarOpcion,
} from "../../api/modificadores";

function getNombre(m) {
  return m?.nombre ?? m?.descripcion ?? m?.titulo ?? "—";
}

export default function Modificadores() {
  const { data, error, isLoading, refetch } = useSWR(
    "modificadores",
    obtenerModificadores
  );

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [mods, setMods] = useState([]);
  const modsArr = useMemo(() => (Array.isArray(mods) ? mods : []), [mods]);

  const [q, setQ] = useState("");

  // ─── Modal modificador ───
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", requerido: 0, multiple: 0, activo: 1 });

  // ─── Opciones dentro del modal ───
  const [opciones, setOpciones] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);
  // fila de nueva opción
  const [nuevaOp, setNuevaOp] = useState({ nombre: "", precio_extra: "" });
  const [savingNuevaOp, setSavingNuevaOp] = useState(false);
  // opción en edición inline
  const [editOpId, setEditOpId] = useState(null);
  const [editOpForm, setEditOpForm] = useState({ nombre: "", precio_extra: "" });
  const [savingEditOp, setSavingEditOp] = useState(false);
  const [deletingOpId, setDeletingOpId] = useState(null);

  // ─── Misc ───
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, id: null, label: "" });

  // ═══════════════════════════════════════
  const cargar = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const data = await obtenerModificadores();
      setMods(Array.isArray(data) ? data : []);
    } catch (e) {
      setMods([]);
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudieron cargar los modificadores." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return modsArr;
    return modsArr.filter((m) => {
      const base = `${getNombre(m)} ${m?.id ?? ""}`.toLowerCase();
      return base.includes(text);
    });
  }, [modsArr, q]);

  // ─── abrir modal ───────────────────────
  const abrirCrear = () => {
    setEdit(null);
    setForm({ nombre: "", requerido: 0, multiple: 0, activo: 1 });
    setOpciones([]);
    setNuevaOp({ nombre: "", precio_extra: "" });
    setEditOpId(null);
    setMsg({ type: "", text: "" });
    setShowForm(true);
  };

  const abrirEditar = async (m) => {
    setEdit(m);
    setForm({
      nombre: getNombre(m) === "—" ? "" : getNombre(m),
      requerido: m?.requerido ?? 0,
      multiple: m?.multiple ?? 0,
      activo: m?.activo ?? 1,
    });
    setNuevaOp({ nombre: "", precio_extra: "" });
    setEditOpId(null);
    setMsg({ type: "", text: "" });
    setShowForm(true);
    // cargar opciones
    setLoadingOps(true);
    try {
      const ops = await obtenerOpciones(m.id);
      setOpciones(Array.isArray(ops) ? ops : []);
    } catch {
      setOpciones([]);
    } finally {
      setLoadingOps(false);
    }
  };

  // ─── guardar modificador (nombre/flags) ─
  const guardar = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });
    const nombre = form.nombre.trim();
    if (!nombre) { setMsg({ type: "warning", text: "El nombre es obligatorio." }); return; }

    try {
      if (edit?.id) {
        await actualizarModificador(edit.id, {
          nombre,
          requerido: Number(form.requerido) ? 1 : 0,
          multiple: Number(form.multiple) ? 1 : 0,
          activo: Number(form.activo) ? 1 : 0,
        });
        setMsg({ type: "success", text: "Modificador actualizado." });
      } else {
        const r = await crearModificador({
          nombre,
          requerido: Number(form.requerido) ? 1 : 0,
          multiple: Number(form.multiple) ? 1 : 0,
          activo: Number(form.activo) ? 1 : 0,
        });
        // pasar a modo edición para que puedan añadir opciones
        const nuevoId = r?.id ?? r?.insertId;
        if (nuevoId) {
          const nuevo = { id: nuevoId, nombre, requerido: form.requerido, multiple: form.multiple, activo: form.activo };
          setEdit(nuevo);
          setOpciones([]);
        }
        setMsg({ type: "success", text: "Modificador creado. Ahora agrega opciones." });
      }
      await cargar();
    } catch (e2) {
      setMsg({ type: "danger", text: e2?.response?.data?.message || "No se pudo guardar." });
    }
  };

  // ─── CRUD opciones ─────────────────────
  const agregarOpcion = async () => {
    const nombre = nuevaOp.nombre.trim();
    const precio_extra = parseFloat(nuevaOp.precio_extra) || 0;
    if (!nombre) return;
    const modId = edit?.id;
    if (!modId) return;
    setSavingNuevaOp(true);
    try {
      await crearOpcion(modId, { nombre, precio_extra, activo: 1 });
      const ops = await obtenerOpciones(modId);
      setOpciones(Array.isArray(ops) ? ops : []);
      setNuevaOp({ nombre: "", precio_extra: "" });
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo agregar la opción." });
    } finally {
      setSavingNuevaOp(false);
    }
  };

  const iniciarEditOp = (op) => {
    setEditOpId(op.id);
    setEditOpForm({ nombre: op.nombre, precio_extra: String(op.precio_extra ?? 0) });
  };

  const guardarEditOp = async () => {
    const nombre = editOpForm.nombre.trim();
    const precio_extra = parseFloat(editOpForm.precio_extra) || 0;
    if (!nombre) return;
    const modId = edit?.id;
    setSavingEditOp(true);
    try {
      await actualizarOpcion(modId, editOpId, { nombre, precio_extra, activo: 1 });
      const ops = await obtenerOpciones(modId);
      setOpciones(Array.isArray(ops) ? ops : []);
      setEditOpId(null);
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo guardar la opción." });
    } finally {
      setSavingEditOp(false);
    }
  };

  const borrarOpcion = async (opId) => {
    const modId = edit?.id;
    setDeletingOpId(opId);
    try {
      await eliminarOpcion(modId, opId);
      setOpciones((prev) => prev.filter((o) => o.id !== opId));
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo eliminar la opción." });
    } finally {
      setDeletingOpId(null);
    }
  };

  // ─── toggle/delete modificador ─────────
  const onToggle = async (m) => {
    setBusyId(m.id);
    setMsg({ type: "", text: "" });
    try {
      await toggleModificador(m.id, m?.activo ? 0 : 1);
      await cargar();
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo cambiar estado." });
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    const id = confirm.id;
    if (!id) return;
    setBusyId(id);
    setMsg({ type: "", text: "" });
    try {
      await eliminarModificador(id);
      setMsg({ type: "success", text: "Modificador eliminado." });
      setConfirm({ show: false, id: null, label: "" });
      await cargar();
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo eliminar." });
    } finally {
      setBusyId(null);
    }
  };

  // ═══════════════════════════════════════
  return (
    <div className="p-2 p-md-3">
      <Row className="g-2 align-items-center mb-2">
        <Col>
          <div className="fw-bold" style={{ fontSize: 18 }}>
            Modificadores <Badge bg="secondary" className="ms-2">{modsArr.length}</Badge>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Catálogo de extras (ej: queso, tocino, bebida, etc.)
          </div>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={cargar} disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Recargar
          </Button>
          <Button variant="primary" onClick={abrirCrear}>
            <FaPlus className="me-2" />
            Nuevo
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type} className="py-2">{msg.text}</Alert> : null}

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <Row className="g-2 align-items-end mb-2">
            <Col lg={5}>
              <Form.Label className="fw-semibold">Buscar</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Nombre o id…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>

          <div style={{ maxHeight: "65vh", overflow: "auto" }}>
            <Table responsive hover className="align-middle mb-0">
              <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <tr>
                  <th style={{ minWidth: 70 }}>ID</th>
                  <th style={{ minWidth: 220 }}>Nombre</th>
                  <th style={{ minWidth: 120 }}>Opciones</th>
                  <th style={{ minWidth: 110 }}>Estado</th>
                  <th style={{ minWidth: 220 }} className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-4 text-muted">
                    <Spinner animation="border" size="sm" className="me-2" />Cargando…
                  </td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-muted">No hay modificadores con ese filtro.</td></tr>
                ) : (
                  filtrados.map((m) => {
                    const activo = Number(m?.activo) === 1;
                    const isBusy = busyId === m?.id;
                    return (
                      <tr key={m.id}>
                        <td className="text-muted">{m.id}</td>
                        <td>
                          <div className="fw-semibold">{getNombre(m)}</div>
                          <small className="text-muted">
                            {Number(m.requerido) ? "Requerido" : "Opcional"} · {Number(m.multiple) ? "Múltiple" : "Único"}
                          </small>
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="border">
                            {m.opciones_count ?? "—"} opciones
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={activo ? "success" : "secondary"}>
                            {activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <Button
                              variant={activo ? "outline-success" : "outline-secondary"}
                              size="sm"
                              onClick={() => onToggle(m)}
                              disabled={isBusy}
                              className="d-inline-flex align-items-center gap-1"
                              title="Activar/Desactivar"
                            >
                              {isBusy ? <Spinner size="sm" animation="border" /> : (activo ? <FaToggleOn /> : <FaToggleOff />)}
                              {activo ? "ON" : "OFF"}
                            </Button>
                            <Button
                              variant="outline-dark"
                              size="sm"
                              onClick={() => abrirEditar(m)}
                              className="d-inline-flex align-items-center gap-1"
                            >
                              <FaEdit />Editar
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => setConfirm({ show: true, id: m.id, label: getNombre(m) })}
                              className="d-inline-flex align-items-center gap-1"
                            >
                              <FaTrash />Eliminar
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

      {/* ═══ Modal Crear/Editar ═══ */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {edit?.id ? `Editar: ${getNombre(edit)}` : "Nuevo modificador"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {msg.text ? <Alert variant={msg.type} className="py-2">{msg.text}</Alert> : null}

          {/* ── Datos del modificador ── */}
          <Form onSubmit={guardar}>
            <Row className="g-2 mb-2">
              <Col xs={12} md={6}>
                <Form.Label className="fw-semibold">Nombre</Form.Label>
                <Form.Control
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Queso extra"
                  autoFocus
                />
              </Col>
              <Col xs={6} md={3}>
                <Form.Label className="fw-semibold">Tipo selección</Form.Label>
                <Form.Select
                  value={Number(form.multiple) ? "multiple" : "unico"}
                  onChange={(e) => setForm((f) => ({ ...f, multiple: e.target.value === "multiple" ? 1 : 0 }))}
                >
                  <option value="unico">Único (1 opción)</option>
                  <option value="multiple">Múltiple (varias)</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={3} className="d-flex flex-column justify-content-end gap-2 pb-1">
                <Form.Check
                  type="switch"
                  id="mod-requerido"
                  label="Requerido"
                  checked={Number(form.requerido) === 1}
                  onChange={(e) => setForm((f) => ({ ...f, requerido: e.target.checked ? 1 : 0 }))}
                />
                <Form.Check
                  type="switch"
                  id="mod-activo"
                  label="Activo"
                  checked={Number(form.activo) === 1}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked ? 1 : 0 }))}
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end mb-3">
              <Button type="submit" variant="primary" size="sm">
                {edit?.id ? "Actualizar datos" : "Crear modificador"}
              </Button>
            </div>
          </Form>

          {/* ── Opciones (solo si ya existe el modificador) ── */}
          {edit?.id && (
            <>
              <hr />
              <div className="fw-bold mb-2">
                Opciones{" "}
                <small className="text-muted fw-normal">
                  (cada opción tiene nombre y precio extra)
                </small>
              </div>

              {loadingOps ? (
                <div className="text-center py-3"><Spinner size="sm" animation="border" /></div>
              ) : (
                <Table size="sm" bordered className="mb-0" style={{ fontSize: 13 }}>
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th style={{ width: 120 }}>Precio extra (L)</th>
                      <th style={{ width: 110 }} className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opciones.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-2">
                          Sin opciones aún.
                        </td>
                      </tr>
                    )}
                    {opciones.map((op) =>
                      editOpId === op.id ? (
                        /* ── fila edición inline ── */
                        <tr key={op.id} className="table-warning">
                          <td>
                            <Form.Control
                              size="sm"
                              value={editOpForm.nombre}
                              onChange={(e) => setEditOpForm((f) => ({ ...f, nombre: e.target.value }))}
                              autoFocus
                            />
                          </td>
                          <td>
                            <InputGroup size="sm">
                              <InputGroup.Text>L</InputGroup.Text>
                              <Form.Control
                                type="number"
                                step="0.01"
                                min="0"
                                value={editOpForm.precio_extra}
                                onChange={(e) => setEditOpForm((f) => ({ ...f, precio_extra: e.target.value }))}
                              />
                            </InputGroup>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button size="sm" variant="success" onClick={guardarEditOp} disabled={savingEditOp}>
                                {savingEditOp ? <Spinner size="sm" animation="border" /> : <FaCheck />}
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => setEditOpId(null)}>
                                <FaTimes />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        /* ── fila normal ── */
                        <tr key={op.id}>
                          <td>{op.nombre}</td>
                          <td>L {Number(op.precio_extra ?? 0).toFixed(2)}</td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button size="sm" variant="outline-dark" onClick={() => iniciarEditOp(op)}>
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => borrarOpcion(op.id)}
                                disabled={deletingOpId === op.id}
                              >
                                {deletingOpId === op.id ? <Spinner size="sm" animation="border" /> : <FaTrash />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}

                    {/* ── fila nueva opción ── */}
                    <tr className="table-success">
                      <td>
                        <Form.Control
                          size="sm"
                          placeholder="Nueva opción (ej: Coca-Cola)"
                          value={nuevaOp.nombre}
                          onChange={(e) => setNuevaOp((f) => ({ ...f, nombre: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOpcion(); } }}
                        />
                      </td>
                      <td>
                        <InputGroup size="sm">
                          <InputGroup.Text>L</InputGroup.Text>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={nuevaOp.precio_extra}
                            onChange={(e) => setNuevaOp((f) => ({ ...f, precio_extra: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOpcion(); } }}
                          />
                        </InputGroup>
                      </td>
                      <td className="text-center">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={agregarOpcion}
                          disabled={savingNuevaOp || !nuevaOp.nombre.trim()}
                        >
                          {savingNuevaOp ? <Spinner size="sm" animation="border" /> : <FaPlus />}
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Confirm Delete ═══ */}
      <Modal show={confirm.show} onHide={() => setConfirm({ show: false, id: null, label: "" })} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Deseas eliminar <b>{confirm.label}</b>?
          <div className="text-muted mt-1" style={{ fontSize: 12 }}>Esta acción no se puede deshacer.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setConfirm({ show: false, id: null, label: "" })}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={busyId === confirm.id}>
            {busyId === confirm.id ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
