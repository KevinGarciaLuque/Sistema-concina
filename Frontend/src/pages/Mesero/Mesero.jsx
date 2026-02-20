import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  FaUtensils,
  FaSyncAlt,
  FaPlus,
  FaCheckCircle,
  FaPrint,
} from "react-icons/fa";
import api from "../../api";
import { socket } from "../../socket";
import MesaCard from "./components/MesaCard";
import CrearOrdenModal from "./components/CrearOrdenModal";

// Configuración de mesas (puede venir del backend después)
const MESAS_CONFIG = Array.from({ length: 12 }, (_, i) => ({
  numero: i + 1,
  capacidad: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
}));

export default function Mesero() {
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [showCrearOrden, setShowCrearOrden] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  // Cargar órdenes activas
  const loadOrdenes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ordenes", {
        params: { 
          estado: "NUEVA,EN_PREPARACION,LISTA",
          sin_facturar: 1  // ✅ Excluir órdenes ya cobradas
        },
      });
      // Asegurar que siempre sea un array
      const ordenesData = data?.data || data?.rows || data || [];
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
    } catch (e) {
      console.error(e);
      setOrdenes([]); // Asegurar array vacío en error
      setMsg({
        type: "danger",
        text: "Error al cargar órdenes activas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdenes();
  }, []);

  // Realtime updates
  useEffect(() => {
    if (!socket?.on) return;

    const onUpdate = () => loadOrdenes();
    socket.on("ordenes:update", onUpdate);
    socket.on("cocina:update", onUpdate);

    return () => {
      try {
        socket.off("ordenes:update", onUpdate);
        socket.off("cocina:update", onUpdate);
      } catch {}
    };
  }, []);

  // Agrupar mesas con sus órdenes
  const mesasConEstado = useMemo(() => {
    // Asegurar que ordenes sea un array
    const ordenesArray = Array.isArray(ordenes) ? ordenes : [];
    
    return MESAS_CONFIG.map((mesa) => {
      const ordenesEnMesa = ordenesArray.filter(
        (o) => o.tipo === "MESA" && String(o.mesa) === String(mesa.numero)
      );
      return {
        ...mesa,
        ordenes: ordenesEnMesa,
        ocupada: ordenesEnMesa.length > 0,
      };
    });
  }, [ordenes]);

  const handleAbrirCrearOrden = (mesa) => {
    setMesaSeleccionada(mesa);
    setShowCrearOrden(true);
  };

  const handleOrdenCreada = async () => {
    setShowCrearOrden(false);
    setMesaSeleccionada(null);
    
    // Pequeño delay para asegurar que la transacción se complete
    setTimeout(() => {
      loadOrdenes();
    }, 300);
    
    setMsg({
      type: "success",
      text: "✅ Orden creada y enviada a cocina exitosamente.",
    });
  };

  const mesasOcupadas = mesasConEstado.filter((m) => m.ocupada).length;
  const mesasLibres = mesasConEstado.filter((m) => !m.ocupada).length;

  return (
    <Container fluid className="py-3">
      {/* Header */}
      <Row className="align-items-center g-2 mb-3">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                background: "rgba(13,110,253,.15)",
              }}
            >
              <FaUtensils />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Módulo Mesero
                <Badge bg="primary" className="ms-2">
                  MESAS
                </Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Gestión de mesas y órdenes
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={loadOrdenes}
            className="d-inline-flex align-items-center gap-2"
            disabled={loading}
          >
            <FaSyncAlt className={loading ? "fa-spin" : ""} />
            Actualizar
          </Button>
        </Col>
      </Row>

      {/* Estadísticas */}
      <Card className="shadow-sm border-0 rounded-4 mb-3">
        <Card.Body className="py-3">
          <Row className="g-2">
            <Col md={3}>
              <div className="text-muted small">Total mesas</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>
                {MESAS_CONFIG.length}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Ocupadas</div>
              <div className="fw-bold text-danger" style={{ fontSize: 20 }}>
                {mesasOcupadas}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Libres</div>
              <div className="fw-bold text-success" style={{ fontSize: 20 }}>
                {mesasLibres}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Órdenes activas</div>
              <div className="fw-bold text-primary" style={{ fontSize: 20 }}>
                {Array.isArray(ordenes) ? ordenes.length : 0}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {msg.text ? (
        <Alert
          variant={msg.type}
          dismissible
          onClose={() => setMsg({ type: "", text: "" })}
        >
          {msg.text}
        </Alert>
      ) : null}

      {/* Grid de mesas */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2 text-muted">Cargando mesas...</div>
        </div>
      ) : (
        <Row className="g-3">
          {mesasConEstado.map((mesa) => (
            <Col key={mesa.numero} xs={12} sm={6} md={4} lg={3} xl={2}>
              <MesaCard
                mesa={mesa}
                onCrearOrden={handleAbrirCrearOrden}
                onVerDetalle={(orden) => {
                  // Abrir modal de detalle de orden si es necesario
                  console.log("Ver detalle:", orden);
                }}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Modal crear orden */}
      <CrearOrdenModal
        show={showCrearOrden}
        onHide={() => {
          setShowCrearOrden(false);
          setMesaSeleccionada(null);
        }}
        mesa={mesaSeleccionada}
        onOrdenCreada={handleOrdenCreada}
      />
    </Container>
  );
}
