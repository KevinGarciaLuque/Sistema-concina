import { useEffect, useState } from "react";
import { Modal, Badge, Spinner, Table, Alert } from "react-bootstrap";
import { FaUtensils, FaInfoCircle } from "react-icons/fa";
import api from "../../../api";

function money(n) {
  return `L ${Number(n || 0).toFixed(2)}`;
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  try {
    const d = new Date(fecha);
    return d.toLocaleString("es-HN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ModalDetalleOrden({ show, onHide, ordenId }) {
  const [loading, setLoading] = useState(false);
  const [orden, setOrden] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show && ordenId) {
      cargarDetalle();
    } else {
      setOrden(null);
      setDetalle([]);
      setError("");
    }
  }, [show, ordenId]);

  const cargarDetalle = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/ordenes/${ordenId}`);
      const response = data?.data || data;
      setOrden(response?.orden || null);
      setDetalle(response?.detalle || []);
    } catch (e) {
      console.error("Error cargando detalle:", e);
      setError(e?.response?.data?.message || "Error al cargar el detalle de la orden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div
            className="rounded-3 d-inline-flex align-items-center justify-content-center"
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <FaUtensils size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Detalle de Orden
            </div>
            {orden && (
              <div style={{ fontSize: 12, fontWeight: 400, color: "#6c757d" }}>
                {orden.codigo}
              </div>
            )}
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <div className="py-5 text-center">
            <Spinner animation="border" />
            <div className="mt-2 text-muted">Cargando detalle...</div>
          </div>
        ) : error ? (
          <Alert variant="danger" className="mb-0">
            <FaInfoCircle className="me-2" />
            {error}
          </Alert>
        ) : !orden ? (
          <div className="text-center text-muted py-4">
            No hay información disponible
          </div>
        ) : (
          <>
            {/* Información general */}
            <div className="bg-light rounded-3 p-3 mb-3">
              <div className="row g-2">
                <div className="col-6">
                  <small className="text-muted d-block">Tipo de orden</small>
                  <Badge
                    bg={
                      orden.tipo === "MESA"
                        ? "primary"
                        : orden.tipo === "LLEVAR"
                        ? "success"
                        : "info"
                    }
                    className="text-uppercase"
                  >
                    {orden.tipo}
                  </Badge>
                  {orden.tipo === "MESA" && orden.mesa && (
                    <Badge bg="dark" className="ms-2">
                      Mesa {orden.mesa}
                    </Badge>
                  )}
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Estado</small>
                  <Badge
                    bg={
                      orden.estado === "LISTA"
                        ? "success"
                        : orden.estado === "EN_PREPARACION"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {orden.estado?.replace(/_/g, " ")}
                  </Badge>
                </div>
                {orden.cliente_nombre && (
                  <div className="col-6">
                    <small className="text-muted d-block">Cliente</small>
                    <div className="fw-semibold">{orden.cliente_nombre}</div>
                  </div>
                )}
                <div className="col-6">
                  <small className="text-muted d-block">Fecha</small>
                  <div style={{ fontSize: 13 }}>{formatFecha(orden.created_at)}</div>
                </div>
              </div>
              {orden.notas && (
                <div className="mt-2 pt-2 border-top">
                  <small className="text-muted d-block">Notas de la orden</small>
                  <div style={{ fontSize: 13 }}>{orden.notas}</div>
                </div>
              )}
            </div>

            {/* Detalle de productos */}
            <div className="mb-3">
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                <FaUtensils size={14} />
                Productos
              </h6>
              <div className="border rounded-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <Table hover className="mb-0" style={{ fontSize: 13 }}>
                  <thead className="table-light position-sticky top-0" style={{ zIndex: 1 }}>
                    <tr>
                      <th style={{ width: 60 }}>Cant.</th>
                      <th>Producto</th>
                      <th style={{ width: 100 }} className="text-end">Precio</th>
                      <th style={{ width: 100 }} className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!detalle || detalle.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          Sin productos
                        </td>
                      </tr>
                    ) : (
                      detalle.map((item) => (
                        <tr key={item.id}>
                          <td className="fw-bold text-center">{item.cantidad}x</td>
                          <td>
                            <div className="fw-semibold">{item.producto_nombre}</div>
                            
                            {/* Modificadores/opciones */}
                            {item.opciones && item.opciones.length > 0 && (
                              <div className="mt-1">
                                {item.opciones.map((op, idx) => (
                                  <div
                                    key={idx}
                                    className="text-muted d-flex align-items-center gap-1"
                                    style={{ fontSize: 11 }}
                                  >
                                    <span>•</span>
                                    <span>{op.opcion_nombre}</span>
                                    {Number(op.precio_extra) > 0 && (
                                      <span className="text-success">
                                        (+{money(op.precio_extra)})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Notas del producto */}
                            {item.notas && (
                              <div className="mt-1 text-muted" style={{ fontSize: 11 }}>
                                <em>Nota: {item.notas}</em>
                              </div>
                            )}
                          </td>
                          <td className="text-end">{money(item.precio_unitario)}</td>
                          <td className="text-end fw-bold">{money(item.total_linea)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-light rounded-3 p-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Subtotal:</span>
                <span className="fw-semibold">{money(orden.subtotal)}</span>
              </div>
              {Number(orden.descuento) > 0 && (
                <div className="d-flex justify-content-between mb-1 text-danger">
                  <span>Descuento:</span>
                  <span>-{money(orden.descuento)}</span>
                </div>
              )}
              {Number(orden.impuesto) > 0 && (
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Impuesto:</span>
                  <span>+{money(orden.impuesto)}</span>
                </div>
              )}
              <div className="border-top pt-2 mt-2">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold" style={{ fontSize: 16 }}>TOTAL:</span>
                  <span className="fw-bold" style={{ fontSize: 18 }}>
                    {money(orden.total)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
