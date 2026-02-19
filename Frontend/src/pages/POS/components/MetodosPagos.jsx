import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
} from "react-bootstrap";

const round2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;

export default function MetodosPagos({ total = 0, value, onChange }) {
  const total2 = useMemo(() => round2(total), [total]);

  const [modo, setModo] = useState(value?.modo || "EFECTIVO");
  const [efectivoRecibido, setEfectivoRecibido] = useState(
    value?.efectivoRecibido ?? "",
  );

  const [tarjetaMonto, setTarjetaMonto] = useState(value?.tarjetaMonto ?? "");
  const [tarjetaRef, setTarjetaRef] = useState(value?.tarjetaRef ?? "");

  const [transMonto, setTransMonto] = useState(value?.transMonto ?? "");
  const [transRef, setTransRef] = useState(value?.transRef ?? "");

  const [mixEf, setMixEf] = useState(value?.mixEf ?? "");
  const [mixTar, setMixTar] = useState(value?.mixTar ?? "");
  const [mixTrans, setMixTrans] = useState(value?.mixTrans ?? "");
  const [mixTarRef, setMixTarRef] = useState(value?.mixTarRef ?? "");
  const [mixTransRef, setMixTransRef] = useState(value?.mixTransRef ?? "");

  const cambio = useMemo(() => {
    if (modo !== "EFECTIVO") return 0;
    const rec = round2(efectivoRecibido);
    return rec > total2 ? round2(rec - total2) : 0;
  }, [modo, efectivoRecibido, total2]);

  const pagos = useMemo(() => {
    if (modo === "EFECTIVO") {
      return [
        {
          metodo: "EFECTIVO",
          monto: total2,
          efectivo_recibido:
            efectivoRecibido === "" ? null : round2(efectivoRecibido),
          cambio: efectivoRecibido === "" ? null : cambio,
        },
      ];
    }

    if (modo === "TARJETA") {
      const m = round2(tarjetaMonto === "" ? total2 : tarjetaMonto);
      return [{ metodo: "TARJETA", monto: m, referencia: tarjetaRef || null }];
    }

    if (modo === "TRANSFERENCIA") {
      const m = round2(transMonto === "" ? total2 : transMonto);
      return [
        { metodo: "TRANSFERENCIA", monto: m, referencia: transRef || null },
      ];
    }

    // MIXTO: 1..3 filas según montos
    const arr = [];
    const ef = round2(mixEf);
    const ta = round2(mixTar);
    const tr = round2(mixTrans);

    if (ef > 0)
      arr.push({
        metodo: "EFECTIVO",
        monto: ef,
        efectivo_recibido: null,
        cambio: null,
      });
    if (ta > 0)
      arr.push({ metodo: "TARJETA", monto: ta, referencia: mixTarRef || null });
    if (tr > 0)
      arr.push({
        metodo: "TRANSFERENCIA",
        monto: tr,
        referencia: mixTransRef || null,
      });

    return arr;
  }, [
    modo,
    total2,
    efectivoRecibido,
    cambio,
    tarjetaMonto,
    tarjetaRef,
    transMonto,
    transRef,
    mixEf,
    mixTar,
    mixTrans,
    mixTarRef,
    mixTransRef,
  ]);

  const sumaPagos = useMemo(
    () => round2(pagos.reduce((a, p) => a + Number(p.monto || 0), 0)),
    [pagos],
  );

  const error = useMemo(() => {
    if (!pagos.length) return "Debes ingresar al menos un pago.";
    if (modo === "EFECTIVO") {
      if (efectivoRecibido === "") return "Ingresa el efectivo recibido.";
      if (round2(efectivoRecibido) < total2)
        return "El efectivo recibido no puede ser menor al total.";
      return "";
    }
    // En tarjeta/transferencia permitimos igual al total por defecto
    if (modo === "MIXTO" && sumaPagos !== total2)
      return `La suma de pagos (${sumaPagos}) debe ser igual a ${total2}.`;
    return "";
  }, [modo, pagos.length, efectivoRecibido, total2, sumaPagos]);

  useEffect(() => {
    onChange?.({
      modo,
      pagos,
      sumaPagos,
      cambio,
      isValid: !error,
      error,
      // guardamos campos para persistencia del modal
      efectivoRecibido,
      tarjetaMonto,
      tarjetaRef,
      transMonto,
      transRef,
      mixEf,
      mixTar,
      mixTrans,
      mixTarRef,
      mixTransRef,
    });
  }, [
    modo,
    pagos,
    sumaPagos,
    cambio,
    error,
    efectivoRecibido,
    tarjetaMonto,
    tarjetaRef,
    transMonto,
    transRef,
    mixEf,
    mixTar,
    mixTrans,
    mixTarRef,
    mixTransRef,
    onChange,
  ]);

  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="fw-bold">Método de pago</div>
          <Badge bg="light" text="dark">
            Total: L {total2.toFixed(2)}
          </Badge>
        </div>

        <Form.Select value={modo} onChange={(e) => setModo(e.target.value)}>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TARJETA">Tarjeta</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="MIXTO">Mixto</option>
        </Form.Select>

        {modo === "EFECTIVO" ? (
          <Row className="g-2 mt-2">
            <Col md={6}>
              <Form.Label className="small text-muted">
                Efectivo recibido
              </Form.Label>
              <InputGroup>
                <InputGroup.Text>L</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <Form.Label className="small text-muted">Cambio</Form.Label>
              <Form.Control value={`L ${cambio.toFixed(2)}`} disabled />
            </Col>
          </Row>
        ) : null}

        {modo === "TARJETA" ? (
          <Row className="g-2 mt-2">
            <Col md={6}>
              <Form.Label className="small text-muted">Monto</Form.Label>
              <InputGroup>
                <InputGroup.Text>L</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={tarjetaMonto}
                  onChange={(e) => setTarjetaMonto(e.target.value)}
                  placeholder={total2.toFixed(2)}
                  step="0.01"
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <Form.Label className="small text-muted">
                Referencia (opcional)
              </Form.Label>
              <Form.Control
                value={tarjetaRef}
                onChange={(e) => setTarjetaRef(e.target.value)}
              />
            </Col>
          </Row>
        ) : null}

        {modo === "TRANSFERENCIA" ? (
          <Row className="g-2 mt-2">
            <Col md={6}>
              <Form.Label className="small text-muted">Monto</Form.Label>
              <InputGroup>
                <InputGroup.Text>L</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={transMonto}
                  onChange={(e) => setTransMonto(e.target.value)}
                  placeholder={total2.toFixed(2)}
                  step="0.01"
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <Form.Label className="small text-muted">Referencia</Form.Label>
              <Form.Control
                value={transRef}
                onChange={(e) => setTransRef(e.target.value)}
              />
            </Col>
          </Row>
        ) : null}

        {modo === "MIXTO" ? (
          <div className="mt-2">
            <Row className="g-2">
              <Col md={4}>
                <Form.Label className="small text-muted">Efectivo</Form.Label>
                <InputGroup>
                  <InputGroup.Text>L</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={mixEf}
                    onChange={(e) => setMixEf(e.target.value)}
                    step="0.01"
                  />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form.Label className="small text-muted">Tarjeta</Form.Label>
                <InputGroup>
                  <InputGroup.Text>L</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={mixTar}
                    onChange={(e) => setMixTar(e.target.value)}
                    step="0.01"
                  />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form.Label className="small text-muted">
                  Transferencia
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text>L</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={mixTrans}
                    onChange={(e) => setMixTrans(e.target.value)}
                    step="0.01"
                  />
                </InputGroup>
              </Col>

              <Col md={6}>
                <Form.Label className="small text-muted">
                  Ref. Tarjeta (opcional)
                </Form.Label>
                <Form.Control
                  value={mixTarRef}
                  onChange={(e) => setMixTarRef(e.target.value)}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small text-muted">
                  Ref. Transferencia
                </Form.Label>
                <Form.Control
                  value={mixTransRef}
                  onChange={(e) => setMixTransRef(e.target.value)}
                />
              </Col>
            </Row>

            <div className="mt-2 d-flex align-items-center justify-content-between">
              <div className="text-muted small">Suma pagos</div>
              <div className="fw-bold">
                L {sumaPagos.toFixed(2)} / L {total2.toFixed(2)}
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert variant="warning" className="mt-3 mb-0">
            {error}
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
}
