import { useState, useEffect } from "react";
import { Button, Table, Badge, Form, Modal, Alert, Spinner, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaPercentage, FaDollarSign, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";
import { descuentosAPI } from "../../../api/descuentos";

const MOTIVOS = [
  { value: "PROMO", label: "Promoción" },
  { value: "CORTESIA", label: "Cortesía" },
  { value: "CUPON", label: "Cupón" },
  { value: "TERCERA_EDAD", label: "Tercera Edad" },
  { value: "CUARTA_EDAD", label: "Cuarta Edad" },
  { value: "DISCAPACIDAD", label: "Discapacidad" },
  { value: "DANO", label: "Daño/Producto defectuoso" },
  { value: "OTRO", label: "Otro" },
];

export default function DescuentosTab() {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    tipo: "PORCENTAJE",
    valor: "",
    tipo_aplicacion: "POR_TOTAL",
    motivo: "PROMO",
    requiere_autorizacion: false,
    limite_porcentaje: "",
    descripcion: "",
    activo: true,
    orden: 999,
  });

  useEffect(() => {
    cargarDescuentos();
  }, []);

  const cargarDescuentos = async () => {
    setLoading(true);
    try {
      const res = await descuentosAPI.listar();
      setDescuentos(res.data || []);
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al cargar descuentos", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setEditando(null);
    setForm({
      nombre: "",
      tipo: "PORCENTAJE",
      valor: "",
      tipo_aplicacion: "POR_TOTAL",
      motivo: "PROMO",
      requiere_autorizacion: false,
      limite_porcentaje: "",
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
      tipo: item.tipo,
      valor: item.valor,
      tipo_aplicacion: item.tipo_aplicacion,
      motivo: item.motivo,
      requiere_autorizacion: Boolean(item.requiere_autorizacion),
      limite_porcentaje: item.limite_porcentaje || "",
      descripcion: item.descripcion || "",
      activo: Boolean(item.activo),
      orden: item.orden || 999,
    });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    try {
      if (editando) {
        await descuentosAPI.actualizar(editando.id, form);
        setMsg({ text: "Descuento actualizado correctamente", type: "success" });
      } else {
        await descuentosAPI.crear(form);
        setMsg({ text: "Descuento creado correctamente", type: "success" });
      }
      setShowModal(false);
      cargarDescuentos();
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al guardar", type: "danger" });
    }
  };

  const handleEliminar = async (item) => {
    if (!confirm(`¿Eliminar el descuento "${item.nombre}"?`)) return;
    
    try {
      await descuentosAPI.eliminar(item.id);
      setMsg({ text: "Descuento eliminado correctamente", type: "success" });
      cargarDescuentos();
    } catch (error) {
      setMsg({ text: error.response?.data?.error || "Error al eliminar", type: "danger" });
    }
  };

  const getMotivoLabel = (motivo) => {
    return MOTIVOS.find(m => m.value === motivo)?.label || motivo;
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

      <Alert variant="info" className="mb-3 d-flex align-items-start gap-2">
        <FaInfoCircle className="mt-1" size={18} />
        <div style={{ fontSize: 13 }}>
          <strong>Regla importante:</strong> Los descuentos se aplican <strong>antes</strong> de calcular el impuesto (ISV).
          <br />
          <span className="text-muted">Base imponible = Subtotal - Descuento, luego se calcula el ISV sobre esa base.</span>
        </div>
      </Alert>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">Descuentos Configurados</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Gestiona los descuentos que se podrán aplicar al hacer el cobro
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleNuevo}
          className="d-inline-flex align-items-center gap-2"
        >
          <FaPlus />
          Nuevo Descuento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : descuentos.length === 0 ? (
        <div className="text-center py-5">
          <div className="text-muted mb-3">
            No hay descuentos configurados
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
              <th>Tipo</th>
              <th>Valor</th>
              <th>Aplicación</th>
              <th>Motivo</th>
              <th>Autorización</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {descuentos.map((item) => (
              <tr key={item.id}>
                <td>
                  <Badge bg="secondary">{item.orden}</Badge>
                </td>
                <td className="fw-semibold">{item.nombre}</td>
                <td>
                  <Badge bg={item.tipo === "PORCENTAJE" ? "info" : "warning"}>
                    {item.tipo === "PORCENTAJE" ? (
                      <>
                        <FaPercentage size={10} className="me-1" />
                        %
                      </>
                    ) : (
                      <>
                        <FaDollarSign size={10} className="me-1" />
                        Fijo
                      </>
                    )}
                  </Badge>
                </td>
                <td>
                  <Badge bg="success">
                    {item.tipo === "PORCENTAJE"
                      ? `${Number(item.valor).toFixed(2)}%`
                      : `L ${Number(item.valor).toFixed(2)}`}
                  </Badge>
                </td>
                <td>
                  <Badge bg={item.tipo_aplicacion === "POR_ITEM" ? "primary" : "warning"}>
                    {item.tipo_aplicacion === "POR_ITEM" ? "Por ítem" : "Por total"}
                  </Badge>
                </td>
                <td className="text-muted" style={{ fontSize: 12 }}>
                  {getMotivoLabel(item.motivo)}
                </td>
                <td>
                  {item.requiere_autorizacion ? (
                    <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
                      <FaExclamationTriangle size={10} />
                      Requiere
                    </Badge>
                  ) : (
                    <Badge bg="secondary">No requiere</Badge>
                  )}
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
            {editando ? "Editar Descuento" : "Nuevo Descuento"}
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
                  placeholder="Ej: Tercera Edad 25%"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Motivo *</Form.Label>
                <Form.Select
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                >
                  {MOTIVOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo *</Form.Label>
                <Form.Select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="PORCENTAJE">Porcentaje (%)</option>
                  <option value="MONTO_FIJO">Monto Fijo (L)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  {form.tipo === "PORCENTAJE" ? "Porcentaje * (%)" : "Monto * (L)"}
                </Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.tipo === "PORCENTAJE" ? "100" : undefined}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder={form.tipo === "PORCENTAJE" ? "25.00" : "50.00"}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Límite máximo (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.limite_porcentaje}
                  onChange={(e) => setForm({ ...form, limite_porcentaje: e.target.value })}
                  placeholder="Opcional"
                />
                <Form.Text className="text-muted">
                  Límite máximo permitido
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Tipo de aplicación *</Form.Label>
            <Form.Select
              value={form.tipo_aplicacion}
              onChange={(e) => setForm({ ...form, tipo_aplicacion: e.target.value })}
            >
              <option value="POR_TOTAL">Por total (se aplica al total de la orden)</option>
              <option value="POR_ITEM">Por ítem (se aplica a cada producto)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {form.tipo_aplicacion === "POR_ITEM"
                ? "Se aplica a cada producto individualmente"
                : "Se aplica al subtotal de la orden"}
            </Form.Text>
          </Form.Group>

          <Alert variant="warning" className="mb-3 d-flex align-items-start gap-2">
            <FaExclamationTriangle className="mt-1" />
            <div style={{ fontSize: 13 }}>
              <strong>Autorización requerida:</strong> Si se activa, este descuento requerirá aprobación de un supervisor antes de aplicarse.
              <br />
              <span className="text-muted">Recomendado para descuentos altos (&gt;15%) o cortesías.</span>
            </div>
          </Alert>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="switch-desc-autorizacion"
              label="Requiere autorización de supervisor"
              checked={form.requiere_autorizacion}
              onChange={(e) => setForm({ ...form, requiere_autorizacion: e.target.checked })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional del descuento"
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
                  Orden en que aparecerá en listados
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6} className="d-flex align-items-center">
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="switch-descuento-activo"
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
            disabled={!form.nombre || form.valor === ""}
          >
            {editando ? "Actualizar" : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
