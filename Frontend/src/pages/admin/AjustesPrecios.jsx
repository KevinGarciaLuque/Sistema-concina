import { useState, useEffect } from "react";
import { Card, Nav, Tab, Container, Row, Col, Badge } from "react-bootstrap";
import { FaPercent, FaTags, FaChartLine } from "react-icons/fa";

// Componentes de las pestañas
import ImpuestosTab from "./components/ImpuestosTab";
import DescuentosTab from "./components/DescuentosTab";
import { impuestosAPI } from "../../api/impuestos";
import { descuentosAPI } from "../../api/descuentos";

export default function AjustesPrecios() {
  const [activeTab, setActiveTab] = useState("impuestos");
  const [contadores, setContadores] = useState({
    impuestos: 0,
    descuentos: 0,
  });

  useEffect(() => {
    cargarContadores();
  }, [activeTab]);

  const cargarContadores = async () => {
    try {
      const [impuestosRes, descuentosRes] = await Promise.all([
        impuestosAPI.listar(),
        descuentosAPI.listar(),
      ]);
      setContadores({
        impuestos: (impuestosRes.data || []).length,
        descuentos: (descuentosRes.data || []).length,
      });
    } catch (error) {
      // Silenciar errores de contadores
    }
  };

  return (
    <Container fluid className="py-3">
      <Row className="align-items-center g-2 mb-3">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                background: "rgba(96,165,250,.12)",
              }}
            >
              <FaPercent size={22} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 20 }}>
                Ajustes de Precio
              </div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                Configuración de impuestos y descuentos aplicables
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Card.Header className="bg-white border-0 px-4 pt-3 pb-0">
              <Nav variant="tabs" className="border-0">
                <Nav.Item>
                  <Nav.Link
                    eventKey="impuestos"
                    className="d-flex align-items-center gap-2 px-3 py-2"
                    style={{
                      borderRadius: "8px 8px 0 0",
                      border: "none",
                      background:
                        activeTab === "impuestos"
                          ? "rgba(96,165,250,.08)"
                          : "transparent",
                      color: activeTab === "impuestos" ? "#60a5fa" : "#6c757d",
                      fontWeight: activeTab === "impuestos" ? 600 : 400,
                    }}
                  >
                    <FaChartLine />
                    Impuestos
                    <Badge
                      bg={activeTab === "impuestos" ? "primary" : "secondary"}
                      className="ms-1"
                    >
                      {contadores.impuestos}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item>
                  <Nav.Link
                    eventKey="descuentos"
                    className="d-flex align-items-center gap-2 px-3 py-2"
                    style={{
                      borderRadius: "8px 8px 0 0",
                      border: "none",
                      background:
                        activeTab === "descuentos"
                          ? "rgba(96,165,250,.08)"
                          : "transparent",
                      color: activeTab === "descuentos" ? "#60a5fa" : "#6c757d",
                      fontWeight: activeTab === "descuentos" ? 600 : 400,
                    }}
                  >
                    <FaTags />
                    Descuentos
                    <Badge
                      bg={activeTab === "descuentos" ? "primary" : "secondary"}
                      className="ms-1"
                    >
                      {contadores.descuentos}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>

            <Tab.Content className="p-4">
              <Tab.Pane eventKey="impuestos">
                <ImpuestosTab />
              </Tab.Pane>

              <Tab.Pane eventKey="descuentos">
                <DescuentosTab />
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </Container>
  );
}
