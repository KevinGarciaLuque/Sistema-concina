import { Badge, Button, Card, Form, InputGroup } from "react-bootstrap";
import { FaPaperPlane, FaReceipt } from "react-icons/fa";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

export default function CheckoutPanel({
  tipo,
  setTipo,
  mesa,
  setMesa,
  clienteNombre,
  setClienteNombre,
  notasOrden,
  setNotasOrden,
  descuento,
  setDescuento,
  impuesto,
  setImpuesto,
  subtotal,
  total,
  carritoCount,
  busyCrear,
  onCrearOrden,
  ordenCreada,
}) {
  const disableCrear = busyCrear || carritoCount === 0 || (tipo === "MESA" && !String(mesa || "").trim());

  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="fw-bold">Orden</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Datos y totales antes de enviar a cocina
            </div>
          </div>

          <Badge bg="dark">{carritoCount} items</Badge>
        </div>

        <hr />

        <Form.Group className="mb-2">
          <Form.Label className="fw-semibold">Tipo</Form.Label>
          <Form.Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="LLEVAR">LLEVAR</option>
            <option value="MESA">MESA</option>
            <option value="DELIVERY">DELIVERY</option>
          </Form.Select>
        </Form.Group>

        {tipo === "MESA" ? (
          <Form.Group className="mb-2">
            <Form.Label className="fw-semibold">Mesa</Form.Label>
            <Form.Control
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              placeholder="Ej: 4"
            />
          </Form.Group>
        ) : null}

        <Form.Group className="mb-2">
          <Form.Label className="fw-semibold">Cliente (opcional)</Form.Label>
          <Form.Control
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Nombre del cliente"
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label className="fw-semibold">Notas de la orden (opcional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={notasOrden}
            onChange={(e) => setNotasOrden(e.target.value)}
            placeholder="Ej: sin cebolla, extra salsa..."
          />
        </Form.Group>

        <div className="d-flex gap-2">
          <Form.Group className="mb-2" style={{ flex: 1 }}>
            <Form.Label className="fw-semibold">Descuento</Form.Label>
            <InputGroup>
              <InputGroup.Text>L</InputGroup.Text>
              <Form.Control
                type="number"
                step="0.01"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-2" style={{ flex: 1 }}>
            <Form.Label className="fw-semibold">Impuesto</Form.Label>
            <InputGroup>
              <InputGroup.Text>L</InputGroup.Text>
              <Form.Control
                type="number"
                step="0.01"
                value={impuesto}
                onChange={(e) => setImpuesto(e.target.value)}
              />
            </InputGroup>
          </Form.Group>
        </div>

        <Card className="rounded-4 border mt-2">
          <Card.Body className="py-3">
            <div className="d-flex justify-content-between">
              <span className="text-muted">Subtotal</span>
              <span className="fw-bold">{money(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Total</span>
              <span className="fw-bold" style={{ fontSize: 18 }}>{money(total)}</span>
            </div>
          </Card.Body>
        </Card>

        <Button
          className="w-100 mt-3 d-inline-flex align-items-center justify-content-center gap-2"
          variant="success"
          onClick={onCrearOrden}
          disabled={disableCrear}
        >
          <FaPaperPlane />
          Enviar a cocina (crear orden)
        </Button>

        {ordenCreada?.codigo ? (
          <div className="mt-3 p-3 rounded-4 border bg-light">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-bold d-flex align-items-center gap-2">
                  <FaReceipt />
                  Orden creada
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Código: <span className="fw-semibold">{ordenCreada.codigo}</span>
                </div>
              </div>
              <Badge bg="dark">#{ordenCreada.id}</Badge>
            </div>
          </div>
        ) : null}

        {tipo === "MESA" && !String(mesa || "").trim() ? (
          <div className="text-danger mt-2" style={{ fontSize: 12 }}>
            Mesa es obligatoria cuando el tipo es MESA.
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
