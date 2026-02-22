import { useState, useEffect, useMemo } from "react";
import { Modal, Form, Row, Col, Table, Alert, Button, InputGroup, Badge, Card } from "react-bootstrap";
import { FaCalculator, FaMoneyBillWave, FaCreditCard, FaExchangeAlt, FaInfoCircle, FaCheck } from "react-icons/fa";

const money = (n) => {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
};

// Denominaciones de billetes y monedas de Honduras
const DENOMINACIONES = {
  billetes: [
    { valor: 500, label: "L 500" },
    { valor: 200, label: "L 200" },
    { valor: 100, label: "L 100" },
    { valor: 50, label: "L 50" },
    { valor: 20, label: "L 20" },
    { valor: 10, label: "L 10" },
    { valor: 5, label: "L 5" },
    { valor: 2, label: "L 2" },
    { valor: 1, label: "L 1" },
  ],
  monedas: [
    { valor: 0.5, label: "L 0.50" },
    { valor: 0.2, label: "L 0.20" },
    { valor: 0.1, label: "L 0.10" },
    { valor: 0.05, label: "L 0.05" },
  ],
};

export default function ModalCerrarCaja({ 
  show, 
  onHide, 
  resumenActiva, 
  sesionActiva,
  onConfirmarCierre,
  loading 
}) {
  // Estado para denominaciones
  const [denominaciones, setDenominaciones] = useState({});
  
  // Estado para otros métodos
  const [transferencias, setTransferencias] = useState("");
  const [tarjetas, setTarjetas] = useState("");
  const [otros, setOtros] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Reiniciar cuando se abre el modal
  useEffect(() => {
    if (show) {
      setDenominaciones({});
      setTransferencias("");
      setTarjetas("");
      setOtros("");
      setObservaciones("");
    }
  }, [show]);

  // Calcular total de efectivo por denominaciones
  const totalEfectivo = useMemo(() => {
    let total = 0;
    Object.entries(denominaciones).forEach(([valor, cantidad]) => {
      total += Number(valor) * Number(cantidad || 0);
    });
    return Math.round(total * 100) / 100;
  }, [denominaciones]);

  // Calcular total general contado
  const totalContado = useMemo(() => {
    return (
      totalEfectivo +
      Number(transferencias || 0) +
      Number(tarjetas || 0) +
      Number(otros || 0)
    );
  }, [totalEfectivo, transferencias, tarjetas, otros]);

  // Calcular esperado vs contado
  const esperadoTotal = resumenActiva?.cuadre?.esperado_en_caja || 0;
  const diferencia = totalContado - esperadoTotal;

  // Valores esperados por método de pago
  const esperadoEfectivo = useMemo(() => {
    const efectivo = resumenActiva?.pagos?.EFECTIVO?.total_monto || 0;
    const cambio = resumenActiva?.pagos?.EFECTIVO?.total_cambio || 0;
    const apertura = sesionActiva?.monto_apertura || 0;
    return apertura + efectivo - cambio;
  }, [resumenActiva, sesionActiva]);

  const esperadoTransferencias = resumenActiva?.pagos?.TRANSFERENCIA?.total_monto || 0;
  const esperadoTarjetas = resumenActiva?.pagos?.TARJETA?.total_monto || 0;

  const handleChangeDenominacion = (valor, cantidad) => {
    setDenominaciones((prev) => ({
      ...prev,
      [valor]: cantidad === "" ? "" : Number(cantidad),
    }));
  };

  const handleConfirmar = () => {
    const detalleCierre = {
      efectivo: {
        denominaciones: Object.entries(denominaciones).reduce((acc, [valor, cantidad]) => {
          if (cantidad > 0) {
            acc[valor] = Number(cantidad);
          }
          return acc;
        }, {}),
        subtotal: totalEfectivo,
      },
      transferencia: Number(transferencias || 0),
      tarjeta: Number(tarjetas || 0),
      otros: Number(otros || 0),
      observaciones: observaciones.trim(),
    };

    onConfirmarCierre(totalContado, detalleCierre);
  };

  const diferenciaEfectivo = totalEfectivo - esperadoEfectivo;
  const diferenciaTransferencias = Number(transferencias || 0) - esperadoTransferencias;
  const diferenciaTarjetas = Number(tarjetas || 0) - esperadoTarjetas;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" keyboard={false}>
      <Modal.Header 
        closeButton 
        className="border-0 text-white"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaCalculator size={24} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Cerrar Caja</div>
            <small style={{ opacity: 0.9, fontWeight: 400, fontSize: 13 }}>
              Conteo de efectivo y métodos de pago
            </small>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Resumen esperado */}
        <Alert variant="info" className="mb-4 rounded-4 border-0" style={{ backgroundColor: "#e7f3ff" }}>
          <Row className="g-3 align-items-center">
            <Col md={3}>
              <div className="text-muted small mb-1">Total esperado en caja:</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>{money(esperadoTotal)}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small mb-1">Efectivo esperado:</div>
              <div className="fw-semibold">{money(esperadoEfectivo)}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small mb-1">Transferencias:</div>
              <div className="fw-semibold">{money(esperadoTransferencias)}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small mb-1">Tarjetas:</div>
              <div className="fw-semibold">{money(esperadoTarjetas)}</div>
            </Col>
          </Row>
        </Alert>

        <Row>
          {/* Columna izquierda: Denominaciones de efectivo */}
          <Col lg={7}>
            <Card className="mb-3 border-0 shadow-sm rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FaMoneyBillWave className="text-success" size={20} />
                  <h6 className="mb-0 fw-bold">Conteo de Efectivo</h6>
                </div>

                {/* Billetes */}
                <div className="mb-3">
                  <div className="text-muted small mb-2 fw-semibold">💵 Billetes</div>
                  <Table size="sm" className="mb-0">
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th style={{ width: "40%" }}>Denominación</th>
                        <th style={{ width: "30%" }} className="text-center">Cantidad</th>
                        <th style={{ width: "30%" }} className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DENOMINACIONES.billetes.map((d) => (
                        <tr key={d.valor}>
                          <td className="fw-semibold">{d.label}</td>
                          <td>
                            <Form.Control
                              type="number"
                              min="0"
                              step="1"
                              size="sm"
                              value={denominaciones[d.valor] ?? ""}
                              onChange={(e) => handleChangeDenominacion(d.valor, e.target.value)}
                              placeholder="0"
                              style={{ textAlign: "center" }}
                            />
                          </td>
                          <td className="text-end">
                            {money(d.valor * (denominaciones[d.valor] || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Monedas */}
                <div>
                  <div className="text-muted small mb-2 fw-semibold">🪙 Monedas</div>
                  <Table size="sm" className="mb-0">
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th style={{ width: "40%" }}>Denominación</th>
                        <th style={{ width: "30%" }} className="text-center">Cantidad</th>
                        <th style={{ width: "30%" }} className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DENOMINACIONES.monedas.map((d) => (
                        <tr key={d.valor}>
                          <td className="fw-semibold">{d.label}</td>
                          <td>
                            <Form.Control
                              type="number"
                              min="0"
                              step="1"
                              size="sm"
                              value={denominaciones[d.valor] ?? ""}
                              onChange={(e) => handleChangeDenominacion(d.valor, e.target.value)}
                              placeholder="0"
                              style={{ textAlign: "center" }}
                            />
                          </td>
                          <td className="text-end">
                            {money(d.valor * (denominaciones[d.valor] || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: "#e7f3ff", borderTop: "2px solid #0d6efd" }}>
                      <tr>
                        <td colSpan="2" className="fw-bold text-end">Total Efectivo:</td>
                        <td className="text-end fw-bold" style={{ fontSize: 16 }}>
                          {money(totalEfectivo)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="text-end text-muted small">Esperado:</td>
                        <td className="text-end text-muted small">{money(esperadoEfectivo)}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="text-end text-muted small">Diferencia:</td>
                        <td className={`text-end small fw-semibold ${
                          Math.abs(diferenciaEfectivo) < 0.01 ? "text-success" : 
                          diferenciaEfectivo > 0 ? "text-primary" : "text-danger"
                        }`}>
                          {diferenciaEfectivo >= 0 ? "+" : ""}{money(diferenciaEfectivo)}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Columna derecha: Otros métodos y resumen */}
          <Col lg={5}>
            <Card className="mb-3 border-0 shadow-sm rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FaCreditCard className="text-primary" size={20} />
                  <h6 className="mb-0 fw-bold">Otros Métodos de Pago</h6>
                </div>

                {/* Transferencias */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold mb-1">
                    <FaExchangeAlt className="me-2" />
                    Transferencias
                  </Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text>L</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transferencias}
                      onChange={(e) => setTransferencias(e.target.value)}
                    />
                  </InputGroup>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-muted">Esperado: {money(esperadoTransferencias)}</small>
                    {Number(transferencias || 0) > 0 && (
                      <small className={`fw-semibold ${
                        Math.abs(diferenciaTransferencias) < 0.01 ? "text-success" : 
                        diferenciaTransferencias > 0 ? "text-primary" : "text-danger"
                      }`}>
                        Dif: {diferenciaTransferencias >= 0 ? "+" : ""}{money(diferenciaTransferencias)}
                      </small>
                    )}
                  </div>
                </Form.Group>

                {/* Tarjetas */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold mb-1">
                    <FaCreditCard className="me-2" />
                    Tarjetas
                  </Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text>L</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={tarjetas}
                      onChange={(e) => setTarjetas(e.target.value)}
                    />
                  </InputGroup>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-muted">Esperado: {money(esperadoTarjetas)}</small>
                    {Number(tarjetas || 0) > 0 && (
                      <small className={`fw-semibold ${
                        Math.abs(diferenciaTarjetas) < 0.01 ? "text-success" : 
                        diferenciaTarjetas > 0 ? "text-primary" : "text-danger"
                      }`}>
                        Dif: {diferenciaTarjetas >= 0 ? "+" : ""}{money(diferenciaTarjetas)}
                      </small>
                    )}
                  </div>
                </Form.Group>

                {/* Otros */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold mb-1">
                    <FaInfoCircle className="me-2" />
                    Otros métodos
                  </Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text>L</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={otros}
                      onChange={(e) => setOtros(e.target.value)}
                    />
                  </InputGroup>
                  <small className="text-muted">Ej: cheques, vales, etc.</small>
                </Form.Group>

                {/* Observaciones */}
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Observaciones</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Notas sobre el cierre..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Resumen final */}
            <Card 
              className="border-0 shadow-sm rounded-4" 
              style={{
                background: diferencia === 0 
                  ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)" 
                  : Math.abs(diferencia) < 0.01
                  ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)"
                  : "linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)"
              }}
            >
              <Card.Body className="p-3">
                <div className="text-center mb-2">
                  <div className="text-muted small fw-semibold mb-1">TOTAL CONTADO</div>
                  <div className="fw-bold" style={{ fontSize: 32, lineHeight: 1 }}>
                    {money(totalContado)}
                  </div>
                </div>
                
                <hr className="my-2" />
                
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small">Esperado:</div>
                    <div className="fw-semibold">{money(esperadoTotal)}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted small">Diferencia:</div>
                    <Badge 
                      bg={
                        Math.abs(diferencia) < 0.01 ? "success" : 
                        diferencia > 0 ? "primary" : "danger"
                      }
                      style={{ fontSize: 15, padding: "6px 12px" }}
                    >
                      {diferencia >= 0 ? "+" : ""}{money(diferencia)}
                    </Badge>
                  </div>
                </div>

                {Math.abs(diferencia) >= 0.01 && (
                  <Alert 
                    variant={diferencia > 0 ? "info" : "warning"} 
                    className="mt-3 mb-0 py-2 small"
                  >
                    <FaInfoCircle className="me-2" />
                    {diferencia > 0 
                      ? "Hay más dinero del esperado. Verifica el conteo." 
                      : "Falta dinero en caja. Revisa las denominaciones."}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="border-0 bg-light">
        <Button 
          variant="outline-secondary" 
          onClick={onHide} 
          disabled={loading}
          className="px-4"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirmar}
          disabled={loading || totalContado === 0}
          className="px-4 d-inline-flex align-items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            fontWeight: 600,
          }}
        >
          <FaCheck />
          {loading ? "Cerrando..." : "Cerrar Caja"}
        </Button>
      </Modal.Footer>

      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>
    </Modal>
  );
}
