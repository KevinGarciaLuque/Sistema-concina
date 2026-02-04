import { Card, Row, Col, Badge, Button, Table } from "react-bootstrap";
import {
  FaCashRegister,
  FaUtensils,
  FaClipboardList,
  FaMoneyBillWave,
  FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  // 👉 Estos valores luego los conectas al backend
  const stats = {
    ordenesHoy: 18,
    enCocina: 6,
    ventasHoy: 3250,
    cajaAbierta: true,
  };

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Dashboard</h2>
        <p className="text-muted mb-0">
          Resumen general del sistema de cocina
        </p>
      </div>

      {/* ===== KPIs ===== */}
      <Row className="g-3 mb-4">
        <Col md={6} xl={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Órdenes de hoy</div>
                  <div className="fs-3 fw-bold">{stats.ordenesHoy}</div>
                </div>
                <FaClipboardList size={28} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">En cocina</div>
                  <div className="fs-3 fw-bold">{stats.enCocina}</div>
                </div>
                <FaUtensils size={28} className="text-warning" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Ventas del día</div>
                  <div className="fs-3 fw-bold">
                    L {stats.ventasHoy.toLocaleString()}
                  </div>
                </div>
                <FaMoneyBillWave size={28} className="text-success" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} xl={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Estado de caja</div>
                  <div className="fs-5 fw-bold">
                    {stats.cajaAbierta ? (
                      <Badge bg="success">Abierta</Badge>
                    ) : (
                      <Badge bg="danger">Cerrada</Badge>
                    )}
                  </div>
                </div>
                <FaCashRegister size={28} className="text-dark" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== ACCESOS RÁPIDOS ===== */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold">POS (Cajero)</h5>
                <p className="text-muted small">
                  Crear órdenes y enviar a cocina
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate("/pos")}
                className="mt-2"
              >
                Ir al POS <FaArrowRight className="ms-2" />
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold">Cocina (KDS)</h5>
                <p className="text-muted small">
                  Ver y preparar órdenes en tiempo real
                </p>
              </div>
              <Button
                variant="warning"
                onClick={() => navigate("/cocina")}
                className="mt-2"
              >
                Ir a Cocina <FaArrowRight className="ms-2" />
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold">Caja</h5>
                <p className="text-muted small">
                  Apertura, cierre y facturación
                </p>
              </div>
              <Button
                variant="success"
                onClick={() => navigate("/caja")}
                className="mt-2"
              >
                Ir a Caja <FaArrowRight className="ms-2" />
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ===== ÚLTIMAS ÓRDENES (PLACEHOLDER) ===== */}
      <Card className="shadow-sm">
        <Card.Body>
          <h5 className="fw-bold mb-3">Últimas órdenes</h5>

          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>023</td>
                <td>Llevar</td>
                <td>
                  <Badge bg="warning" text="dark">
                    En preparación
                  </Badge>
                </td>
                <td>L 180.00</td>
              </tr>
              <tr>
                <td>022</td>
                <td>Mesa</td>
                <td>
                  <Badge bg="success">Lista</Badge>
                </td>
                <td>L 240.00</td>
              </tr>
              <tr>
                <td>021</td>
                <td>Delivery</td>
                <td>
                  <Badge bg="secondary">Nueva</Badge>
                </td>
                <td>L 95.00</td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
