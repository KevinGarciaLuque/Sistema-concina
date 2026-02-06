import { Button, Card, Form, Table } from "react-bootstrap";
import { FaMinus, FaPlus, FaTrash, FaPen } from "react-icons/fa";

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
}) {
  const lineTotal = (it) => {
    const extra = (it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0);
    const total = (Number(it.precio_unitario || 0) + extra) * Number(it.cantidad || 1);
    return total;
  };

  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <div className="fw-bold">Carrito</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Edita cantidades y modificadores
            </div>
          </div>
        </div>

        <hr />

        {carrito.length === 0 ? (
          <div className="text-muted">Tu carrito está vacío.</div>
        ) : (
          <Table responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ width: 160 }}>Cantidad</th>
                <th className="text-end">Total</th>
                <th className="text-end" style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map((it) => (
                <tr key={it.id}>
                  <td>
                    <div className="fw-semibold">{it.producto_nombre}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Unit: {money(it.precio_unitario)}{" "}
                      {(it.opciones || []).length ? (
                        <>· +Extras: {money((it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0))}</>
                      ) : null}
                    </div>

                    {(it.opciones || []).length ? (
                      <div className="mt-1">
                        {(it.opciones || []).map((o, idx) => (
                          <span key={`${it.id}_${idx}`} className="badge text-bg-light me-1">
                            {o.opcion_nombre} (+{money(o.precio_extra).replace("L ", "")})
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <Form.Control
                      className="mt-2"
                      size="sm"
                      placeholder="Notas del item (opcional)"
                      value={it.notas || ""}
                      onChange={(e) => setNotasItem(it.id, e.target.value)}
                    />
                  </td>

                  <td>
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
                        style={{ width: 70, textAlign: "center" }}
                      />

                      <Button size="sm" variant="outline-dark" onClick={() => inc(it.id)}>
                        <FaPlus />
                      </Button>
                    </div>
                  </td>

                  <td className="text-end fw-bold">{money(lineTotal(it))}</td>

                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="d-inline-flex align-items-center gap-2"
                        onClick={() => onEditItem(it)}
                        title="Editar modificadores"
                      >
                        <FaPen />
                        Editar
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
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
