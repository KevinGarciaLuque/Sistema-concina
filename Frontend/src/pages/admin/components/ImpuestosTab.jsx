import { useState, useEffect } from "react";
import { Button, Table, Badge, Form, Modal, Alert, Spinner, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import { impuestosAPI } from "../../../api/impuestos";
import { obtenerCategorias } from "../../../api/categorias";

export default function ImpuestosTab() {
  const [impuestos, setImpuestos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    porcentaje: "",
    tipo_aplicacion: "POR_ITEM",
    incluido_en_precio: false,
    categoria_id: "",
    descripcion: "",
    activo: true,
    orden: 999,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [impuestosRes, categoriasRes] = await Promise.all([
        impuestosAPI.listar(),
        obtenerCategorias({ todas: true }),
      ]);
      setImpuestos(impuestosRes.data || []);
      setCategorias(categoriasRes || []);
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al cargar datos", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setEditando(null);
    setForm({
      nombre: "",
      porcentaje: "",
      tipo_aplicacion: "POR_ITEM",
      incluido_en_precio: false,
      categoria_id: "",
      descripcion: "",
      activo: true,
      orden: 999,
    });
    setShowModal(true);
  };

  const handleEditar = (item) => {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      porcentaje: item.porcentaje,
      tipo_aplicacion: item.tipo_aplicacion,
      incluido_en_precio: Boolean(item.incluido_en_precio),
      categoria_id: item.categoria_id || "",
      descripcion: item.descripcion || "",
      activo: Boolean(item.activo),
      orden: item.orden || 999,
    });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    try {
      if (editando) {
        await impuestosAPI.actualizar(editando.id, form);
        setMsg({ text: "Impuesto actualizado correctamente", type: "success" });
      } else {
        await impuestosAPI.crear(form);
        setMsg({ text: "Impuesto creado correctamente", type: "success" });
      }
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al guardar", type: "danger" });
    }
  };

  const handleEliminar = async (item) => {
    if (!confirm(`¿Eliminar el impuesto "${item.nombre}"?`)) return;
    
    try {
      await impuestosAPI.eliminar(item.id);
      setMsg({ text: "Impuesto eliminado correctamente", type: "success" });
      cargarDatos();
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al eliminar", type: "danger" });
    }
  };

  return (
    <div>
      {msg.text && (
        <Alert
          variant={msg.type}
          dismissible
          onClose={() => setMsg({ text: "", type: "" })}
          className="mb-3"
        >
          {msg.text}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">Impuestos Configurados</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Gestiona los impuestos que se aplicarán al hacer el cobro
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleNuevo}
          className="d-inline-flex align-items-center gap-2"
        >
          <FaPlus />
          Nuevo Impuesto
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : impuestos.length === 0 ? (
        <div className="text-center py-5">
          <div className="text-muted mb-3">
            No hay impuestos configurados
          </div>
          <Button variant="outline-primary" onClick={handleNuevo}>
            <FaPlus className="me-2" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <Table responsive hover className="align-middle">
          <thead className="table-light">
            <tr>
              <th>Orden</th>
              <th>Nombre</th>
              <th>%</th>
              <th>Tipo</th>
              <th>Incluido</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {impuestos.map((item) => (
              <tr key={item.id}>
                <td>
                  <Badge bg="secondary">{item.orden}</Badge>
                </td>
                <td className="fw-semibold">{item.nombre}</td>
                <td>
                  <Badge bg={item.porcentaje === 0 ? "secondary" : "info"}>
                    {Number(item.porcentaje).toFixed(2)}%
                  </Badge>
                </td>
                <td>
                  <Badge bg={item.tipo_aplicacion === "POR_ITEM" ? "primary" : "warning"}>
                    {item.tipo_aplicacion === "POR_ITEM" ? "Por ítem" : "Por total"}
                  </Badge>
                </td>
                <td>
                  {item.incluido_en_precio ? (
                    <Badge bg="success">Sí</Badge>
                  ) : (
                    <Badge bg="secondary">No</Badge>
                  )}
                </td>
                <td className="text-muted" style={{ fontSize: 13 }}>
                  {item.categoria_nombre || "Todas"}
                </td>
                <td>
                  {item.activo ? (
                    <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                      <FaCheckCircle size={12} />
                      Activo
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="d-inline-flex align-items-center gap-1">
                      <FaTimesCircle size={12} />
                      Inactivo
                    </Badge>
                  )}
                </td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleEditar(item)}
                    className="me-2"
                  >
                    <FaEdit />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleEliminar(item)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal de formulario */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editando ? "Editar Impuesto" : "Nuevo Impuesto"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: ISV 15%"
                />
                <Form.Text className="text-muted">
                  Ejemplo: ISV 15%, ISV 18%, Propina 10%, etc.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Porcentaje * (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.porcentaje}
                  onChange={(e) => setForm({ ...form, porcentaje: e.target.value })}
                  placeholder="15.00"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo de aplicación *</Form.Label>
                <Form.Select
                  value={form.tipo_aplicacion}
                  onChange={(e) => setForm({ ...form, tipo_aplicacion: e.target.value })}
                >
                  <option value="POR_ITEM">Por ítem (se aplica a cada producto)</option>
                  <option value="POR_TOTAL">Por total (se aplica al total de la orden)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  {form.tipo_aplicacion === "POR_ITEM"
                    ? "Se aplica a cada producto individualmente"
                    : "Se aplica al total de la orden (ej: propina)"}
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría específica (opcional)</Form.Label>
                <Form.Select
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Si se selecciona, el impuesto solo aplica a productos de esta categoría
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Alert variant="info" className="mb-3 d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1" />
            <div style={{ fontSize: 13 }}>
              <strong>Incluido en precio:</strong> Define si el impuesto ya está incluido en el precio del producto.
              <ul className="mb-0 mt-1">
                <li><strong>Sí:</strong> El precio ya incluye el impuesto (no se suma al cobrar)</li>
                <li><strong>No:</strong> El impuesto se suma al precio al cobrar</li>
              </ul>
            </div>
          </Alert>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="switch-impuesto-incluido"
              label="Impuesto incluido en el precio del producto"
              checked={form.incluido_en_precio}
              onChange={(e) => setForm({ ...form, incluido_en_precio: e.target.checked })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional del impuesto"
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Orden de visualización</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: e.target.value })}
                />
                <Form.Text className="text-muted">
                  Orden en que aparecerá en listados (menor número = primero)
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6} className="d-flex align-items-center">
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="switch-impuesto-activo"
                  label="Activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleGuardar}
            disabled={!form.nombre || form.porcentaje === ""}
          >
            {editando ? "Actualizar" : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
