import { useState, useEffect } from "react";
import { Badge, Button, Card, Modal } from "react-bootstrap";
import {
  FaChair,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaUtensils,
  FaFire,
  FaHourglassHalf,
} from "react-icons/fa";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

function getEstadoBadge(estado) {
  const badgeStyle = { fontSize: 10 };
  if (estado === "NUEVA") return <Badge bg="secondary" style={badgeStyle}>Nueva</Badge>;
  if (estado === "EN_PREPARACION")
    return <Badge bg="warning" text="dark" style={badgeStyle}>En prep.</Badge>;
  if (estado === "LISTA") return <Badge bg="success" style={badgeStyle}>Lista</Badge>;
  if (estado === "ENTREGADA") return <Badge bg="info" style={badgeStyle}>Entregada</Badge>;
  return <Badge bg="light" text="dark" style={badgeStyle}>{estado}</Badge>;
}

function getTiempoTranscurrido(created_at) {
  const ahora = new Date();
  const creado = new Date(created_at);
  const diffMs = ahora - creado;
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs}s`;
  }
  
  const diffMins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  
  if (diffMins < 60) {
    return `${diffMins}m ${secs}s`;
  }
  
  const horas = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${horas}h ${mins}m ${secs}s`;
}

function formatearProductos(productos) {
  if (!productos || productos.length === 0) return "Sin productos";
  
  if (productos.length === 1) {
    return `${productos[0].cantidad}x ${productos[0].producto_nombre}`;
  }
  
  if (productos.length === 2) {
    return productos.map(p => `${p.cantidad}x ${p.producto_nombre}`).join(", ");
  }
  
  // Si hay más de 2, mostrar los primeros 2 y +N más
  const primeros = productos.slice(0, 2).map(p => `${p.cantidad}x ${p.producto_nombre}`).join(", ");
  const restantes = productos.length - 2;
  return `${primeros} +${restantes} más`;
}

export default function MesaCard({ mesa, onCrearOrden, onVerDetalle }) {
  const { numero, capacidad, ordenes, ocupada } = mesa;

  // Estado para forzar re-render cada segundo y actualizar el tiempo
  const [, setTick] = useState(0);
  
  // Estado para el modal de detalle
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  // Verificar si hay alguna orden LISTA
  const tieneOrdenLista = ordenes.some(o => o.estado === "LISTA");

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalMesa = ordenes.reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Función para abrir el modal con el detalle de la orden
  const handleVerDetalle = (orden) => {
    setOrdenSeleccionada(orden);
    setShowDetalleModal(true);
  };

  // CSS para la animación de pulso
  const pulseStyle = tieneOrdenLista ? {
    animation: "pulse-border 2s ease-in-out infinite",
    borderColor: "#28a745",
    borderWidth: "3px"
  } : {};

  return (
    <>
      {/* Agregar estilos de animación */}
      <style>
        {`
          @keyframes pulse-border {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(40, 167, 69, 0);
            }
          }
        `}
      </style>
      
      <Card
        className={`shadow-sm border rounded-4 ${
          ocupada ? "border-danger" : "border-success"
        }`}
        style={{ 
          transition: "all 0.3s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...pulseStyle
        }}
      >
      <Card.Body className="p-2 d-flex flex-column" style={{ flex: 1 }}>
        {/* Header fijo */}
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 20 }}>
              Mesa {numero}
            </div>
            <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
              <FaChair size={11} /> {capacidad} personas
            </div>
          </div>

          <div className="d-flex flex-column gap-1 align-items-end">
            {ocupada ? (
              <Badge bg="danger" style={{ fontSize: 13 }}>Ocupada</Badge>
            ) : (
              <Badge bg="success" style={{ fontSize: 13 }}>Libre</Badge>
            )}
            
            {tieneOrdenLista && (
              <Badge 
                bg="success" 
                className="d-flex align-items-center gap-1" 
                style={{ fontSize: 11, animation: "pulse 1.5s ease-in-out infinite" }}
              >
                <FaCheckCircle size={10} /> LISTA
              </Badge>
            )}
          </div>
        </div>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { 
                opacity: 1; 
                transform: scale(1);
              }
              50% { 
                opacity: 0.8; 
                transform: scale(1.05);
              }
            }
          `}
        </style>

        {ocupada && ordenes.length > 0 ? (
          <>
            {/* Área de órdenes con scroll */}
            <div 
              style={{ 
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                maxHeight: "160px",
                minHeight: "80px",
                marginBottom: "8px",
                paddingRight: "4px"
              }}
              className="custom-scrollbar"
            >
              {ordenes.map((orden) => {
                // Definir el estilo según el estado
                let bgGradient = "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)";
                let borderColor = "transparent";
                
                if (orden.estado === "LISTA") {
                  bgGradient = "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)";
                  borderColor = "#28a745";
                } else if (orden.estado === "ENTREGADA") {
                  bgGradient = "linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)";
                  borderColor = "#17a2b8";
                }
                
                return (
                <div
                  key={orden.id}
                  className="mb-1 px-2 py-1 rounded-3 border shadow-sm"
                  style={{ 
                    fontSize: 12,
                    background: bgGradient,
                    transition: "all 0.2s",
                    borderLeft: `3px solid ${borderColor}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleVerDetalle(orden)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  {/* Header: Código y Estado */}
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="fw-semibold font-monospace d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                      {orden.estado === "LISTA" && <FaCheckCircle className="text-success" size={10} />}
                      {orden.estado === "EN_PREPARACION" && <FaFire className="text-warning" size={10} />}
                      {orden.estado === "ENTREGADA" && <FaCheckCircle className="text-info" size={10} />}
                      {orden.codigo}
                    </div>
                    {/* Solo mostrar badge si NO es LISTA (para evitar duplicación con el badge del header) */}
                    {orden.estado !== "LISTA" && getEstadoBadge(orden.estado)}
                  </div>

                  {/* Productos */}
                  <div className="text-dark mb-1" style={{ fontSize: 10, lineHeight: 1.3 }}>
                    <FaUtensils size={8} className="me-1 text-muted" />
                    {formatearProductos(orden.productos)}
                  </div>

                  {/* Tiempo transcurrido con color según antigüedad */}
                  {(() => {
                    const tiempoStr = getTiempoTranscurrido(orden.created_at);
                    const diffMs = Date.now() - new Date(orden.created_at).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    
                    let colorClass = "text-success";
                    if (diffMins > 30) colorClass = "text-danger";
                    else if (diffMins > 15) colorClass = "text-warning";
                    
                    return (
                      <div className={`${colorClass} d-flex align-items-center gap-1 mb-1 fw-semibold`} style={{ fontSize: 13 }}>
                        <FaClock size={8} />
                        {tiempoStr}
                      </div>
                    );
                  })()}

                  {/* Cliente (si existe) */}
                  {orden.cliente_nombre ? (
                    <div className="text-muted mb-1" style={{ fontSize: 15 }}>
                      👤 {orden.cliente_nombre}
                    </div>
                  ) : null}

                  {/* Total */}
                  <div className="fw-bold text-primary mt-1" style={{ fontSize: 15 }}>
                    {money(orden.total)}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Footer fijo con total y botón */}
            <div 
              className="border-top pt-2 mt-auto"
              style={{
                background: "white",
                position: "relative"
              }}
            >
              <div 
                className="d-flex align-items-center justify-content-between mb-2 px-2 py-1 rounded-3"
                style={{
                  background: "linear-gradient(135deg, #dc354533 0%, #dc354511 100%)",
                  border: "1px solid #dc354544"
                }}
              >
                <span className="fw-semibold text-danger" style={{ fontSize: 15 }}>
                  Total Mesa
                </span>
                <span className="fw-bold text-danger" style={{ fontSize: 20 }}>
                  {money(totalMesa)}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-100 d-inline-flex align-items-center justify-content-center gap-1 shadow-sm"
                onClick={() => onCrearOrden(mesa)}
                style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  transition: "all 0.3s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(13, 110, 253, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <FaPlus size={10} />
                Agregar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-2 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #198754 0%, #20c997 100%)",
                  boxShadow: "0 4px 12px rgba(25, 135, 84, 0.2)"
                }}
              >
                <FaUtensils className="text-white" style={{ fontSize: 18 }} />
              </div>
              <div className="text-muted fw-semibold" style={{ fontSize: 11 }}>
                Mesa disponible
              </div>
            </div>

            <Button
              variant="success"
              size="sm"
              className="w-100 d-inline-flex align-items-center justify-content-center gap-1 shadow-sm mt-auto"
              onClick={() => onCrearOrden(mesa)}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: 600,
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 135, 84, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <FaPlus size={10} />
              Nueva
            </Button>
          </>
        )}
      </Card.Body>

      {/* Estilos personalizados para scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </Card>

    {/* Modal de detalle de orden */}
    <Modal 
      show={showDetalleModal} 
      onHide={() => setShowDetalleModal(false)}
      size="md"
      centered
    >
      <Modal.Header closeButton style={{ padding: '0.75rem 1rem' }}>
        <Modal.Title style={{ fontSize: 16, fontWeight: 600 }}>
          📋 Detalle de Orden
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
        {ordenSeleccionada && (
          <>
            {/* Código y Estado */}
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <div className="text-muted" style={{ fontSize: 11 }}>Código de Orden</div>
                <div className="fw-bold font-monospace" style={{ fontSize: 14 }}>
                  {ordenSeleccionada.codigo}
                </div>
              </div>
              <div>
                {getEstadoBadge(ordenSeleccionada.estado)}
              </div>
            </div>

            {/* Cliente */}
            {ordenSeleccionada.cliente_nombre && (
              <div className="mb-3 pb-2 border-bottom">
                <div className="text-muted" style={{ fontSize: 11 }}>Cliente</div>
                <div className="fw-semibold" style={{ fontSize: 13 }}>
                  👤 {ordenSeleccionada.cliente_nombre}
                </div>
              </div>
            )}

            {/* Tiempo transcurrido */}
            <div className="mb-3 pb-2 border-bottom">
              <div className="text-muted" style={{ fontSize: 11 }}>Tiempo</div>
              <div className="d-flex align-items-center gap-1" style={{ fontSize: 13 }}>
                <FaClock size={12} />
                {getTiempoTranscurrido(ordenSeleccionada.created_at)}
              </div>
            </div>

            {/* Productos */}
            <div className="mb-3">
              <div className="text-muted mb-2" style={{ fontSize: 11 }}>Productos</div>
              <div className="d-flex flex-column gap-2">
                {ordenSeleccionada.productos.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-3 border"
                    style={{ 
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      fontSize: 12
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div className="fw-semibold" style={{ fontSize: 13 }}>
                        <span className="badge bg-primary me-2" style={{ fontSize: 10 }}>
                          {item.cantidad}x
                        </span>
                        {item.producto_nombre}
                      </div>
                    </div>
                    
                    {/* Modificadores/Opciones */}
                    {item.opciones && item.opciones.length > 0 && (
                      <div className="ms-4 mt-1">
                        {item.opciones.map((opcion, oidx) => (
                          <div 
                            key={oidx}
                            className="text-muted d-flex align-items-center gap-1"
                            style={{ fontSize: 10, lineHeight: 1.4 }}
                          >
                            <span style={{ opacity: 0.5 }}>▸</span>
                            {opcion.opcion_nombre}
                            {opcion.precio_adicional > 0 && (
                              <span className="text-success fw-semibold">
                                (+{money(opcion.precio_adicional)})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notas del producto */}
                    {item.nota_item && (
                      <div className="ms-4 mt-1 text-muted fst-italic" style={{ fontSize: 10 }}>
                        📝 {item.nota_item}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div 
              className="d-flex justify-content-between align-items-center p-2 rounded-3"
              style={{
                background: 'linear-gradient(135deg, #0d6efd22 0%, #0d6efd11 100%)',
                border: '1px solid #0d6efd44'
              }}
            >
              <span className="fw-semibold" style={{ fontSize: 14 }}>Total</span>
              <span className="fw-bold text-primary" style={{ fontSize: 18 }}>
                {money(ordenSeleccionada.total)}
              </span>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
    </>
  );
}
