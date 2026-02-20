import { Badge, Button, Card } from "react-bootstrap";
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
  const badgeStyle = { fontSize: 9 };
  if (estado === "NUEVA") return <Badge bg="secondary" style={badgeStyle}>Nueva</Badge>;
  if (estado === "EN_PREPARACION")
    return <Badge bg="warning" text="dark" style={badgeStyle}>En prep.</Badge>;
  if (estado === "LISTA") return <Badge bg="success" style={badgeStyle}>Lista</Badge>;
  return <Badge bg="light" text="dark" style={badgeStyle}>{estado}</Badge>;
}

function getTiempoTranscurrido(created_at) {
  const ahora = new Date();
  const creado = new Date(created_at);
  const diffMs = ahora - creado;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Recién creada";
  if (diffMins < 60) return `${diffMins} min`;
  
  const horas = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
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

  const totalMesa = ordenes.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <Card
      className={`shadow-sm border rounded-4 ${
        ocupada ? "border-danger" : "border-success"
      }`}
      style={{ 
        transition: "all 0.3s",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Card.Body className="p-2 d-flex flex-column" style={{ flex: 1 }}>
        {/* Header fijo */}
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 18 }}>
              Mesa {numero}
            </div>
            <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
              <FaChair /> {capacidad} personas
            </div>
          </div>

          {ocupada ? (
            <Badge bg="danger">Ocupada</Badge>
          ) : (
            <Badge bg="success">Libre</Badge>
          )}
        </div>

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
              {ordenes.map((orden) => (
                <div
                  key={orden.id}
                  className="mb-1 px-2 py-1 rounded-3 border shadow-sm"
                  style={{ 
                    fontSize: 12,
                    background: orden.estado === "LISTA" 
                      ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)" 
                      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                    transition: "all 0.2s",
                    borderLeft: orden.estado === "LISTA" ? "3px solid #28a745" : "3px solid transparent"
                  }}
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
                      {orden.codigo}
                    </div>
                    {getEstadoBadge(orden.estado)}
                  </div>

                  {/* Productos */}
                  <div className="text-dark mb-1" style={{ fontSize: 10, lineHeight: 1.3 }}>
                    <FaUtensils size={8} className="me-1 text-muted" />
                    {formatearProductos(orden.productos)}
                  </div>

                  {/* Tiempo transcurrido */}
                  <div className="text-muted d-flex align-items-center gap-1 mb-1" style={{ fontSize: 10 }}>
                    <FaClock size={8} />
                    {getTiempoTranscurrido(orden.created_at)}
                  </div>

                  {/* Cliente (si existe) */}
                  {orden.cliente_nombre ? (
                    <div className="text-muted mb-1" style={{ fontSize: 10 }}>
                      👤 {orden.cliente_nombre}
                    </div>
                  ) : null}

                  {/* Total */}
                  <div className="fw-bold text-primary mt-1" style={{ fontSize: 13 }}>
                    {money(orden.total)}
                  </div>
                </div>
              ))}
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
                <span className="fw-semibold text-danger" style={{ fontSize: 12 }}>
                  Total Mesa
                </span>
                <span className="fw-bold text-danger" style={{ fontSize: 16 }}>
                  {money(totalMesa)}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-100 d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
                onClick={() => onCrearOrden(mesa)}
                style={{
                  padding: "6px 10px",
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
                <FaPlus />
                Agregar orden
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-3 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                style={{
                  width: 50,
                  height: 50,
                  background: "linear-gradient(135deg, #198754 0%, #20c997 100%)",
                  boxShadow: "0 4px 12px rgba(25, 135, 84, 0.2)"
                }}
              >
                <FaUtensils className="text-white" style={{ fontSize: 24 }} />
              </div>
              <div className="text-muted fw-semibold" style={{ fontSize: 12 }}>
                Mesa disponible
              </div>
            </div>

            <Button
              variant="success"
              size="sm"
              className="w-100 d-inline-flex align-items-center justify-content-center gap-2 shadow-sm mt-auto"
              onClick={() => onCrearOrden(mesa)}
              style={{
                padding: "6px 10px",
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
              <FaPlus />
              Nueva orden
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
  );
}
