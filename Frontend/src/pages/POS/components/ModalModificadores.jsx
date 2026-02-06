import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import { FaCheck, FaXmark } from "react-icons/fa6";

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

export default function ModalModificadores({ show, loading, data, onHide, onConfirm }) {
  // data = { producto, modificadores: [{id,nombre,requerido,multiple,opciones:[...]}], preset }
  const producto = data?.producto || null;
  const modificadores = Array.isArray(data?.modificadores) ? data.modificadores : [];
  const preset = data?.preset || {};

  const [selecciones, setSelecciones] = useState({}); // { [modId]: [opcionId,...] }
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!show) return;
    // inicializa con preset si existe
    setSelecciones(preset && Object.keys(preset).length ? preset : {});
    setMsg("");
  }, [show, preset]);

  const totalExtras = useMemo(() => {
    let sum = 0;
    for (const m of modificadores) {
      const sel = selecciones[m.id] || [];
      for (const oid of sel) {
        const op = (m.opciones || []).find((x) => Number(x.id) === Number(oid));
        if (op) sum += Number(op.precio_extra || 0);
      }
    }
    return sum;
  }, [modificadores, selecciones]);

  const toggle = (mod, opcionId) => {
    setSelecciones((prev) => {
      const cur = prev[mod.id] ? [...prev[mod.id]] : [];
      const oid = Number(opcionId);

      if (mod.multiple) {
        const idx = cur.indexOf(oid);
        if (idx >= 0) cur.splice(idx, 1);
        else cur.push(oid);
        return { ...prev, [mod.id]: cur };
      } else {
        // single choice
        return { ...prev, [mod.id]: [oid] };
      }
    });
  };

  const validate = () => {
    for (const m of modificadores) {
      if (Number(m.requerido) === 1) {
        const sel = selecciones[m.id] || [];
        if (!sel.length) {
          return `Debes seleccionar una opción en: ${m.nombre}`;
        }
      }
    }
    return "";
  };

  const confirm = () => {
    const err = validate();
    if (err) {
      setMsg(err);
      return;
    }

    // construir opciones elegidas con nombres y precio_extra
    const opcionesElegidas = [];

    for (const m of modificadores) {
      const sel = selecciones[m.id] || [];
      for (const oid of sel) {
        const op = (m.opciones || []).find((x) => Number(x.id) === Number(oid));
        if (!op) continue;
        opcionesElegidas.push({
          modificador_id: Number(m.id),
          opcion_id: Number(op.id),
          opcion_nombre: String(op.nombre),
          precio_extra: Number(op.precio_extra || 0),
        });
      }
    }

    onConfirm({ producto, opcionesElegidas });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">
          Modificadores{" "}
          {producto?.nombre ? <Badge bg="dark" className="ms-2">{producto.nombre}</Badge> : null}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <div className="py-4 text-center text-muted">
            <Spinner animation="border" className="me-2" />
            Cargando modificadores...
          </div>
        ) : !producto ? (
          <div className="text-muted">Sin producto seleccionado.</div>
        ) : modificadores.length === 0 ? (
          <Alert variant="info" className="mb-0">
            Este producto no tiene modificadores. Presiona “Confirmar” para agregarlo al carrito.
          </Alert>
        ) : (
          <>
            {msg ? <Alert variant="warning">{msg}</Alert> : null}

            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Selecciona opciones (requeridos se validan)
              </div>
              <div className="fw-bold">
                Extras: {money(totalExtras)}
              </div>
            </div>

            {modificadores.map((m) => (
              <Card key={m.id} className="rounded-4 border mb-2">
                <Card.Body className="py-3">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="fw-bold">
                        {m.nombre}{" "}
                        {Number(m.requerido) === 1 ? <Badge bg="danger" className="ms-2">Requerido</Badge> : null}
                        {Number(m.multiple) === 1 ? <Badge bg="secondary" className="ms-2">Múltiple</Badge> : <Badge bg="secondary" className="ms-2">Única</Badge>}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {Number(m.multiple) === 1 ? "Puedes elegir varias." : "Elige una."}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {(m.opciones || []).length === 0 ? (
                      <div className="text-muted">Sin opciones activas.</div>
                    ) : (
                      (m.opciones || []).map((op) => {
                        const checked = (selecciones[m.id] || []).includes(Number(op.id));
                        return (
                          <Form.Check
                            key={op.id}
                            type={Number(m.multiple) === 1 ? "checkbox" : "radio"}
                            name={`mod_${m.id}`}
                            className="py-1"
                            checked={checked}
                            onChange={() => toggle(m, op.id)}
                            label={
                              <span className="d-flex align-items-center justify-content-between" style={{ width: "100%" }}>
                                <span className="fw-semibold">{op.nombre}</span>
                                <span className="text-muted">
                                  {Number(op.precio_extra || 0) > 0 ? `+ ${money(op.precio_extra)}` : "—"}
                                </span>
                              </span>
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} className="d-inline-flex align-items-center gap-2">
          <FaXmark />
          Cancelar
        </Button>
        <Button variant="success" onClick={confirm} className="d-inline-flex align-items-center gap-2">
          <FaCheck />
          Confirmar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
