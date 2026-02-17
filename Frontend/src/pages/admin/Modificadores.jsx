//src/pages/admin/Modificadores.jsx
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
import { FaEdit, FaPlus, FaSearch, FaToggleOn, FaToggleOff, FaTrash } from "react-icons/fa";
import {
  obtenerModificadores,
  crearModificador,
  actualizarModificador,
  eliminarModificador,
  toggleModificador,
} from "../../api/modificadores";

function getNombre(m) {
  return m?.nombre ?? m?.descripcion ?? m?.titulo ?? "—";
}

function getPrecio(m) {
  const v = m?.precio ?? m?.precio_extra ?? m?.monto ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function Modificadores() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [mods, setMods] = useState([]); // ✅ SIEMPRE array
  const modsArr = useMemo(() => (Array.isArray(mods) ? mods : []), [mods]);

  const [q, setQ] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    activo: 1,
  });

  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, id: null, label: "" });

  const cargar = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const data = await obtenerModificadores();
      setMods(Array.isArray(data) ? data : []);
    } catch (e) {
      setMods([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar los modificadores.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return modsArr;

    return modsArr.filter((m) => {
      const base = `${getNombre(m)} ${m?.id ?? ""}`.toLowerCase();
      return base.includes(text);
    });
  }, [modsArr, q]);

  const abrirCrear = () => {
    setEdit(null);
    setForm({ nombre: "", precio: "", activo: 1 });
    setShowForm(true);
  };

  const abrirEditar = (m) => {
    setEdit(m);
    setForm({
      nombre: getNombre(m) === "—" ? "" : getNombre(m),
      precio: String(getPrecio(m)),
      activo: m?.activo ?? 1,
    });
    setShowForm(true);
  };

  const guardar = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });

    const nombre = form.nombre.trim();
    const precio = Number(form.precio || 0);

    if (!nombre) {
      setMsg({ type: "warning", text: "El nombre es obligatorio." });
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setMsg({ type: "warning", text: "Precio inválido." });
      return;
    }

    try {
      if (edit?.id) {
        await actualizarModificador(edit.id, { nombre, precio, activo: Number(form.activo) ? 1 : 0 });
        setMsg({ type: "success", text: "Modificador actualizado." });
      } else {
        await crearModificador({ nombre, precio, activo: Number(form.activo) ? 1 : 0 });
        setMsg({ type: "success", text: "Modificador creado." });
      }
      setShowForm(false);
      await cargar();
    } catch (e2) {
      setMsg({ type: "danger", text: e2?.response?.data?.message || "No se pudo guardar." });
    }
  };

  const onToggle = async (m) => {
    const id = m?.id;
    if (!id) return;
    setBusyId(id);
    setMsg({ type: "", text: "" });
    try {
      const next = m?.activo ? 0 : 1;
      await toggleModificador(id, next);
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

      {msg.text ? <Alert variant={msg.type}>{msg.text}</Alert> : null}

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
                  <th style={{ minWidth: 140 }}>Precio</th>
                  <th style={{ minWidth: 110 }}>Estado</th>
                  <th style={{ minWidth: 220 }} className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Cargando…
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted">
                      No hay modificadores con ese filtro.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((m) => {
                    const activo = Number(m?.activo) === 1;
                    const isBusy = busyId === m?.id;

                    return (
                      <tr key={m.id}>
                        <td className="text-muted">{m.id}</td>
                        <td className="fw-semibold">{getNombre(m)}</td>
                        <td className="fw-bold">L {getPrecio(m).toFixed(2)}</td>
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
                              className="d-inline-flex align-items-center gap-2"
                              title="Activar/Desactivar"
                            >
                              {isBusy ? <Spinner size="sm" animation="border" /> : (activo ? <FaToggleOn /> : <FaToggleOff />)}
                              {activo ? "ON" : "OFF"}
                            </Button>

                            <Button
                              variant="outline-dark"
                              size="sm"
                              onClick={() => abrirEditar(m)}
                              className="d-inline-flex align-items-center gap-2"
                            >
                              <FaEdit />
                              Editar
                            </Button>

                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => setConfirm({ show: true, id: m.id, label: getNombre(m) })}
                              className="d-inline-flex align-items-center gap-2"
                            >
                              <FaTrash />
                              Eliminar
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
            {edit?.id ? "Editar modificador" : "Nuevo modificador"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={guardar}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold">Nombre</Form.Label>
              <Form.Control
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Queso extra"
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold">Precio</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={form.precio}
                onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                placeholder="0.00"
              />
            </Form.Group>

            <Form.Check
              type="switch"
              id="mod-activo"
              label="Activo"
              checked={Number(form.activo) === 1}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked ? 1 : 0 }))}
            />
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirm Delete */}
      <Modal show={confirm.show} onHide={() => setConfirm({ show: false, id: null, label: "" })} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Deseas eliminar <b>{confirm.label}</b>?
          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
            Esta acción no se puede deshacer.
          </div>
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
