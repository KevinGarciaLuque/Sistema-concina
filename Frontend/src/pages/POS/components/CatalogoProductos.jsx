import { Badge, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { FaPlus, FaSearch } from "react-icons/fa";

function imgSrc(imagen_url) {
  if (!imagen_url) return null;
  if (String(imagen_url).startsWith("http")) return imagen_url;
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${imagen_url}`;
}

export default function CatalogoProductos({
  loadingCat,
  loadingProd,
  categorias,
  productos,
  categoriaId,
  setCategoriaId,
  q,
  setQ,
  onAdd,
}) {
  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="fw-bold">Catálogo</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Selecciona productos para agregarlos al carrito
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <Form.Select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              style={{ width: 220 }}
              disabled={loadingCat}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Form.Select>

            <div className="position-relative" style={{ width: 280, maxWidth: "100%" }}>
              <Form.Control
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar producto..."
              />
              <FaSearch
                className="position-absolute"
                style={{ right: 12, top: 12, opacity: 0.5 }}
              />
            </div>
          </div>
        </div>

        <hr />

        {loadingProd ? (
          <div className="py-4 text-center text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <div className="text-muted">No hay productos con ese filtro.</div>
        ) : (
          <Row className="g-3">
            {productos.map((p) => (
              <Col key={p.id} xs={12} sm={6} md={6} lg={6} xl={4}>
                <Card className="h-100 rounded-4 border">
                  {p.imagen_url ? (
                    <div style={{ height: 140, overflow: "hidden", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                      <img
                        src={imgSrc(p.imagen_url)}
                        alt={p.nombre}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  ) : null}

                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div className="fw-bold">{p.nombre}</div>
                      <Badge bg={p.es_combo ? "warning" : "secondary"} text={p.es_combo ? "dark" : "light"}>
                        {p.es_combo ? "Combo" : "Item"}
                      </Badge>
                    </div>

                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {p.categoria || "—"}
                    </div>

                    {p.descripcion ? (
                      <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                        {p.descripcion}
                      </div>
                    ) : null}

                    <div className="mt-auto d-flex align-items-center justify-content-between pt-3">
                      <div className="fw-bold">L {Number(p.precio || 0).toFixed(2)}</div>
                      <Button
                        variant="success"
                        size="sm"
                        className="d-inline-flex align-items-center gap-2"
                        onClick={() => onAdd(p)}
                      >
                        <FaPlus />
                        Agregar
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card.Body>
    </Card>
  );
}
