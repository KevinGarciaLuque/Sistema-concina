import { useState, useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { FaClock, FaMoneyBillWave, FaUtensils, FaSearch, FaFilter } from "react-icons/fa";

function money(n) {
  return `L ${Number(n || 0).toFixed(2)}`;
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  try {
    const d = new Date(fecha);
    const horas = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${d.toLocaleDateString()} ${horas}:${mins}`;
  } catch {
    return "—";
  }
}

export default function OrdenesPendientesCobro({ ordenes, loading, onCobrar }) {
  const [expandido, setExpandido] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroMesa, setFiltroMesa] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Filtrar órdenes según los filtros aplicados
  const ordenesFiltradas = useMemo(() => {
    if (!ordenes) return [];
    
    return ordenes.filter((orden) => {
      // Filtro por tipo
      if (filtroTipo !== "TODOS" && orden.tipo !== filtroTipo) {
        return false;
      }
      
      // Filtro por mesa
      if (filtroMesa && orden.tipo === "MESA") {
        if (String(orden.mesa) !== String(filtroMesa)) {
          return false;
        }
      }
      
      // Búsqueda general
      if (busqueda) {
        const searchLower = busqueda.toLowerCase();
        const matchCodigo = orden.codigo?.toLowerCase().includes(searchLower);
        const matchCliente = orden.cliente_nombre?.toLowerCase().includes(searchLower);
        const matchMesa = orden.mesa?.toString().includes(busqueda);
        
        if (!matchCodigo && !matchCliente && !matchMesa) {
          return false;
        }
      }
      
      return true;
    });
  }, [ordenes, filtroTipo, filtroMesa, busqueda]);

  // Obtener lista única de mesas
  const mesasDisponibles = useMemo(() => {
    if (!ordenes) return [];
    const mesas = ordenes
      .filter(o => o.tipo === "MESA" && o.mesa)
      .map(o => String(o.mesa))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => Number(a) - Number(b));
    return mesas;
  }, [ordenes]);

  if (loading) {
    return (
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body className="py-5 text-center">
          <Spinner animation="border" />
          <div className="mt-2 text-muted">Cargando órdenes pendientes...</div>
        </Card.Body>
      </Card>
    );
  }

  if (!ordenes || ordenes.length === 0) {
    return (
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body className="py-5 text-center text-muted">
          <FaMoneyBillWave size={40} className="mb-3 opacity-25" />
          <div>No hay órdenes pendientes de cobro</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Body className="p-3">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="rounded-3 d-inline-flex align-items-center justify-content-center"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,193,7,.15)",
            }}
          >
            <FaClock size={18} color="#ffc107" />
          </div>
          <div className="flex-grow-1">
            <div className="fw-bold" style={{ fontSize: 15 }}>
              Órdenes Pendientes de Cobro
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              {ordenesFiltradas.length} de {ordenes.length} orden{ordenes.length !== 1 ? "es" : ""} esperando pago
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Row className="g-2 mb-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label className="fw-semibold d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                <FaFilter size={10} /> Tipo
              </Form.Label>
              <Form.Select
                size="sm"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="TODOS">Todos</option>
                <option value="MESA">Mesa</option>
                <option value="LLEVAR">Para llevar</option>
                <option value="DELIVERY">Delivery</option>
              </Form.Select>
            </Form.Group>
          </Col>
          
          {filtroTipo === "MESA" && mesasDisponibles.length > 0 && (
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ fontSize: 12 }}>
                  Mesa
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={filtroMesa}
                  onChange={(e) => setFiltroMesa(e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="">Todas</option>
                  {mesasDisponibles.map((mesa) => (
                    <option key={mesa} value={mesa}>
                      Mesa {mesa}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          )}
          
          <Col md={filtroTipo === "MESA" && mesasDisponibles.length > 0 ? 6 : 9}>
            <Form.Group>
              <Form.Label className="fw-semibold d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                <FaSearch size={10} /> Búsqueda
              </Form.Label>
              <Form.Control
                size="sm"
                type="text"
                placeholder="Código, cliente, mesa..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Tabla con scroll */}
        <div 
          style={{ 
            maxHeight: "calc(100vh - 380px)", 
            minHeight: "400px",
            overflowY: "auto",
            overflowX: "auto"
          }}
          className="border rounded-3"
        >
          <Table hover className="mb-0" style={{ fontSize: 13 }}>
            <thead className="table-light position-sticky top-0" style={{ zIndex: 1 }}>
              <tr>
                <th style={{ width: 100 }}>Código</th>
                <th style={{ width: 80 }}>Tipo</th>
                <th style={{ width: 80 }}>Mesa</th>
                <th>Cliente</th>
                <th style={{ width: 100 }}>Total</th>
                <th style={{ width: 120 }}>Estado</th>
                <th style={{ width: 140 }}>Creada</th>
                <th style={{ width: 100 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    {busqueda || filtroTipo !== "TODOS" || filtroMesa 
                      ? "No se encontraron órdenes con los filtros aplicados"
                      : "No hay órdenes pendientes de cobro"
                    }
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((orden) => (
                  <tr key={orden.id}>
                    <td className="fw-semibold font-monospace">{orden.codigo}</td>
                    <td>
                      <Badge
                        bg={
                          orden.tipo === "MESA"
                            ? "primary"
                            : orden.tipo === "LLEVAR"
                            ? "success"
                            : "info"
                        }
                        className="text-uppercase"
                        style={{ fontSize: 10 }}
                      >
                        {orden.tipo}
                      </Badge>
                    </td>
                    <td>
                      {orden.tipo === "MESA" && orden.mesa ? (
                        <Badge bg="dark">Mesa {orden.mesa}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{orden.cliente_nombre || <span className="text-muted">Sin nombre</span>}</td>
                    <td className="fw-bold">{money(orden.total)}</td>
                    <td>
                      <Badge
                        bg={
                          orden.estado === "LISTA"
                            ? "success"
                            : orden.estado === "EN_PREPARACION"
                            ? "warning"
                            : "secondary"
                        }
                        style={{ fontSize: 10 }}
                      >
                        {orden.estado?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="text-muted" style={{ fontSize: 11 }}>
                      {formatFecha(orden.created_at)}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="success"
                        className="d-inline-flex align-items-center gap-1"
                        onClick={() => onCobrar(orden)}
                        style={{ fontSize: 12 }}
                      >
                        <FaMoneyBillWave size={12} />
                        Cobrar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
