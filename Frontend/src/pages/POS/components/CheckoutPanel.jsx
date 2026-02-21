import { Badge, Button, Card, Form, Alert } from "react-bootstrap";
import { FaPaperPlane, FaReceipt, FaCashRegister, FaClock } from "react-icons/fa";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

export default function CheckoutPanel({
  tipo,
  setTipo,
  mesa,
  setMesa,
  notasOrden,
  setNotasOrden,
  subtotal,
  carritoCount,
  busyCrear,
  onCrearOrden,
  ordenCreada,
  onCobrarAhora,
  onCobrarDespues,
}) {
  const disableCrear = busyCrear || carritoCount === 0 || (tipo === "MESA" && !String(mesa || "").trim()) || ordenCreada?.codigo;

  // Si la orden ya fue creada, mostrar solo opciones de cobro
  if (ordenCreada?.codigo) {
    return (
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <Alert variant="success" className="mb-0">
            <div className="d-flex align-items-center gap-2 mb-3">
              <FaReceipt style={{ fontSize: 24 }} />
              <div>
                <div className="fw-bold" style={{ fontSize: 16 }}>Orden creada exitosamente</div>
                <div style={{ fontSize: 13 }}>
                  Código: <span className="fw-bold">{ordenCreada.codigo}</span> #{ordenCreada.id}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Subtotal: <span className="fw-bold">{money(subtotal)}</span> (ajustes al cobrar)
                </div>
              </div>
            </div>
            
            <div className="d-flex gap-2 mt-3">
              <Button
                variant="success"
                size="lg"
                className="flex-fill d-inline-flex align-items-center justify-content-center gap-2"
                onClick={onCobrarAhora}
              >
                <FaCashRegister />
                Cobrar ahora
              </Button>
              
              <Button
                variant="outline-secondary"
                size="lg"
                className="flex-fill d-inline-flex align-items-center justify-content-center gap-2"
                onClick={onCobrarDespues}
              >
                <FaClock />
                Cobrar después
              </Button>
            </div>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Vista normal para crear la orden
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
          <Form.Label className="fw-semibold">Notas de la orden (opcional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={notasOrden}
            onChange={(e) => setNotasOrden(e.target.value)}
            placeholder="Ej: sin cebolla, extra salsa..."
          />
        </Form.Group>

        <Card className="rounded-4 border mt-2">
          <Card.Body className="py-3">
            <div className="d-flex justify-content-between">
              <span className="text-muted">Subtotal productos</span>
              <span className="fw-bold" style={{ fontSize: 18 }}>{money(subtotal)}</span>
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              * Descuentos e impuestos se aplicarán al cobrar
            </div>
          </Card.Body>
        </Card>

        <Button
          className="w-100 mt-3 d-inline-flex align-items-center justify-content-center gap-2"
          variant="success"
          size="lg"
          onClick={onCrearOrden}
          disabled={disableCrear}
        >
          <FaPaperPlane />
          Enviar a cocina (crear orden)
        </Button>

        {tipo === "MESA" && !String(mesa || "").trim() ? (
          <div className="text-danger mt-2" style={{ fontSize: 12 }}>
            Mesa es obligatoria cuando el tipo es MESA.
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
