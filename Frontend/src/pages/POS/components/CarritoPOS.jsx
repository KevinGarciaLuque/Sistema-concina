import { Button, Card, Form } from "react-bootstrap";
import { FaMinus, FaPlus, FaTrash, FaPen, FaBroom } from "react-icons/fa";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

export default function CarritoPOS({
  carrito,
  inc,
  dec,
  remove,
  setQty,
  setNotasItem,
  onEditItem,
  onClearCart,
}) {
  const lineTotal = (it) => {
    const extra = (it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0);
    const total = (Number(it.precio_unitario || 0) + extra) * Number(it.cantidad || 1);
    return total;
  };

  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <div className="fw-bold">Carrito</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Edita cantidades y modificadores
            </div>
          </div>
          {carrito.length > 0 && (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={onClearCart}
              className="d-inline-flex align-items-center gap-1"
              title="Limpiar carrito"
            >
              <FaBroom />
              <span className="d-none d-md-inline">Limpiar</span>
            </Button>
          )}
        </div>

        <hr className="my-2" />

        {carrito.length === 0 ? (
          <div className="text-muted">Tu carrito está vacío.</div>
        ) : (
          <div style={{ overflowX: "hidden", overflowY: "auto", maxHeight: "calc(100vh - 350px)" }}>
            {carrito.map((it) => (
              <Card key={it.id} className="mb-2 border shadow-sm">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold" style={{ wordBreak: "break-word" }}>
                        {it.producto_nombre}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        Unit: {money(it.precio_unitario)}{" "}
                        {(it.opciones || []).length ? (
                          <>· Extras: +{money((it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0))}</>
                        ) : null}
                      </div>
                    </div>
                    <div className="fw-bold text-end" style={{ whiteSpace: "nowrap" }}>
                      {money(lineTotal(it))}
                    </div>
                  </div>

                  {(it.opciones || []).length ? (
                    <div className="mb-2">
                      {(it.opciones || []).map((o, idx) => (
                        <span key={`${it.id}_${idx}`} className="badge text-bg-light me-1 mb-1" style={{ fontSize: 11 }}>
                          {o.opcion_nombre} (+{money(o.precio_extra).replace("L ", "")})
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Form.Control
                    className="mb-2"
                    size="sm"
                    placeholder="Notas (opcional)"
                    value={it.notas || ""}
                    onChange={(e) => setNotasItem(it.id, e.target.value)}
                  />

                  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <Button size="sm" variant="outline-dark" onClick={() => dec(it.id)}>
                        <FaMinus />
                      </Button>

                      <Form.Control
                        size="sm"
                        type="number"
                        min={1}
                        value={it.cantidad}
                        onChange={(e) => setQty(it.id, e.target.value)}
                        style={{ width: 60, textAlign: "center" }}
                      />

                      <Button size="sm" variant="outline-dark" onClick={() => inc(it.id)}>
                        <FaPlus />
                      </Button>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="d-inline-flex align-items-center gap-1"
                        onClick={() => onEditItem(it)}
                        title="Editar modificadores"
                      >
                        <FaPen />
                        <span className="d-none d-sm-inline">Editar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => remove(it.id)}
                        title="Eliminar"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
