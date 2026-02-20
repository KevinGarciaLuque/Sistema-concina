import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FaPaperPlane,
  FaTrash,
  FaPlus,
  FaMinus,
  FaUtensils,
  FaPen,
} from "react-icons/fa";
import api from "../../../api";

// Importar componentes existentes del POS
import CatalogoProductos from "../../POS/components/CatalogoProductos";
import ModalModificadores from "../../POS/components/ModalModificadores";

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function round2(n) {
  const v = Number(n || 0);
  return Math.round(v * 100) / 100;
}

function money(n) {
  const v = Number(n || 0);
  return `L ${v.toFixed(2)}`;
}

export default function CrearOrdenModal({ show, onHide, mesa, onOrdenCreada }) {
  // Catálogo
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [q, setQ] = useState("");

  // Carrito
  const [carrito, setCarrito] = useState([]);

  // Orden meta
  const [clienteNombre, setClienteNombre] = useState("");
  const [notasOrden, setNotasOrden] = useState("");

  // Modificadores
  const [showMods, setShowMods] = useState(false);
  const [modsLoading, setModsLoading] = useState(false);
  const [modsProducto, setModsProducto] = useState(null);
  const [editItemId, setEditItemId] = useState(null);

  // UI
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busyCrear, setBusyCrear] = useState(false);

  // Cargar categorías
  const loadCategorias = async () => {
    setLoadingCat(true);
    try {
      console.log("🏷️ Cargando categorías...");
      const { data } = await api.get("/categorias");
      // Backend devuelve { ok: true, data: [...] }
      const categoriasData = data?.data || data?.rows || data || [];
      console.log("✅ Categorías recibidas:", categoriasData.length, categoriasData);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (e) {
      console.error("❌ Error cargando categorías:", e);
      setCategorias([]);
    } finally {
      setLoadingCat(false);
    }
  };

  // Cargar productos
  const loadProductos = async () => {
    setLoadingProd(true);
    try {
      const params = {};
      if (categoriaId) params.categoria_id = categoriaId;
      if (q.trim()) params.q = q.trim();

      console.log("🔍 Cargando productos con params:", params);
      const { data } = await api.get("/productos", { params });
      // Backend devuelve { ok: true, data: [...] }
      const productosData = data?.data || data?.rows || data || [];
      console.log("✅ Productos recibidos:", productosData.length, productosData);
      setProductos(Array.isArray(productosData) ? productosData : []);
    } catch (e) {
      console.error("❌ Error cargando productos:", e);
      setProductos([]);
    } finally {
      setLoadingProd(false);
    }
  };

  useEffect(() => {
    if (show) {
      // Resetear estados al abrir el modal
      setCategorias([]);
      setProductos([]);
      setCarrito([]);
      setClienteNombre("");
      setNotasOrden("");
      setMsg({ type: "", text: "" });
      setQ("");
      setCategoriaId("");
      
      // Cargar datos inmediatamente
      (async () => {
        await loadCategorias();
        await loadProductos();
      })();
    }
  }, [show]);

  useEffect(() => {
    if (show && !loadingCat && !loadingProd) {
      loadProductos();
    }
  }, [categoriaId, q]);

  // Totales
  const subtotal = useMemo(() => {
    return round2(
      carrito.reduce((acc, it) => {
        const extra = (it.opciones || []).reduce(
          (a, o) => a + Number(o.precio_extra || 0),
          0
        );
        const line =
          (Number(it.precio_unitario || 0) + extra) * Number(it.cantidad || 1);
        return acc + line;
      }, 0)
    );
  }, [carrito]);

  // Acciones del carrito
  const inc = (id) =>
    setCarrito((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, cantidad: Number(it.cantidad) + 1 } : it
      )
    );

  const dec = (id) =>
    setCarrito((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, cantidad: Math.max(1, Number(it.cantidad) - 1) }
          : it
      )
    );

  const remove = (id) => setCarrito((prev) => prev.filter((it) => it.id !== id));

  const setNotasItem = (id, notas) =>
    setCarrito((prev) =>
      prev.map((it) => (it.id === id ? { ...it, notas } : it))
    );

  // Agregar producto con modificadores
  const addProducto = async (producto) => {
    setModsProducto(null);
    setEditItemId(null);
    setModsLoading(true);
    setShowMods(true);

    try {
      const { data } = await api.get(`/modificadores/por-producto/${producto.id}`);
      // Backend devuelve { ok: true, data: [...] }
      const mods = data?.data || data?.modificadores || data || [];

      setModsProducto({
        producto,
        modificadores: mods,
        preset: {},
      });
    } catch (e) {
      console.error(e);
      setModsProducto({ producto, modificadores: [], preset: {} });
    } finally {
      setModsLoading(false);
    }
  };

  const confirmarMods = ({ producto, opcionesElegidas }) => {
    const precioBase = Number(producto.precio || 0);

    const nuevoItem = {
      id: uid(),
      producto_id: Number(producto.id),
      producto_nombre: String(producto.nombre),
      precio_unitario: precioBase,
      cantidad: 1,
      notas: "",
      opciones: opcionesElegidas || [],
    };

    // Buscar si ya existe el mismo producto con las mismas opciones
    const opcionesIds = opcionesElegidas.map((o) => o.opcion_id).sort();
    const existente = carrito.find((it) => {
      if (it.producto_id !== nuevoItem.producto_id) return false;
      if (it.precio_unitario !== nuevoItem.precio_unitario) return false;
      const idsExistentes = (it.opciones || [])
        .map((o) => o.opcion_id)
        .sort();
      return (
        JSON.stringify(idsExistentes) === JSON.stringify(opcionesIds)
      );
    });

    if (existente) {
      // Incrementar cantidad
      setCarrito((prev) =>
        prev.map((it) =>
          it.id === existente.id
            ? { ...it, cantidad: it.cantidad + 1 }
            : it
        )
      );
    } else {
      // Agregar nuevo
      setCarrito((prev) => [...prev, nuevoItem]);
    }

    setShowMods(false);
    setModsProducto(null);
  };

  // Crear orden
  const crearOrden = async () => {
    setMsg({ type: "", text: "" });

    if (!carrito.length) {
      return setMsg({ type: "warning", text: "Agrega productos al carrito." });
    }

    if (!mesa?.numero) {
      return setMsg({ type: "danger", text: "No se especificó la mesa." });
    }

    const payload = {
      cliente_nombre: String(clienteNombre || "").trim() || null,
      tipo: "MESA",
      mesa: String(mesa.numero),
      notas: String(notasOrden || "").trim() || null,
      descuento: 0,
      impuesto: 0,
      items: carrito.map((it) => ({
        producto_id: Number(it.producto_id),
        cantidad: Number(it.cantidad || 1),
        notas: String(it.notas || "").trim() || null,
        opciones: (it.opciones || []).map((o) => ({
          opcion_id: Number(o.opcion_id),
        })),
      })),
    };

    setBusyCrear(true);
    try {
      const { data } = await api.post("/ordenes", payload);

      // Limpiar y cerrar
      setCarrito([]);
      setClienteNombre("");
      setNotasOrden("");
      setQ("");
      setCategoriaId("");

      onOrdenCreada(data);
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo crear la orden.",
      });
    } finally {
      setBusyCrear(false);
    }
  };

  const handleClose = () => {
    setCarrito([]);
    setClienteNombre("");
    setNotasOrden("");
    setMsg({ type: "", text: "" });
    setQ("");
    setCategoriaId("");
    onHide();
  };

  return (
    <>
      <Modal show={show} onHide={handleClose} size="xl" fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <FaUtensils className="me-2" />
            Nueva Orden - Mesa {mesa?.numero}
            <Badge bg="info" text="dark" className="ms-2">
              {carrito.length} items
            </Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {msg.text ? (
            <Alert
              variant={msg.type}
              dismissible
              onClose={() => setMsg({ type: "", text: "" })}
            >
              {msg.text}
            </Alert>
          ) : null}

          <Row className="g-3">
            {/* Catálogo */}
            <Col lg={8}>
              <CatalogoProductos
                loadingCat={loadingCat}
                loadingProd={loadingProd}
                categorias={categorias}
                productos={productos}
                categoriaId={categoriaId}
                setCategoriaId={setCategoriaId}
                q={q}
                setQ={setQ}
                onAdd={addProducto}
              />
            </Col>

            {/* Carrito + Resumen */}
            <Col lg={4}>
              <Card className="shadow-sm border-0 rounded-4 sticky-top" style={{ top: 20 }}>
                <Card.Body>
                  <div className="fw-bold mb-2">Carrito</div>

                  {carrito.length === 0 ? (
                    <div className="text-muted py-3 text-center">
                      Carrito vacío
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: "40vh",
                        overflowY: "auto",
                        overflowX: "hidden",
                      }}
                    >
                      {carrito.map((it) => {
                        const extra = (it.opciones || []).reduce(
                          (a, o) => a + Number(o.precio_extra || 0),
                          0
                        );
                        const lineTotal =
                          (Number(it.precio_unitario) + extra) *
                          Number(it.cantidad);

                        return (
                          <Card key={it.id} className="mb-2 border shadow-sm">
                            <Card.Body className="p-2">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="fw-semibold" style={{ fontSize: 13 }}>
                                  {it.producto_nombre}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => remove(it.id)}
                                  style={{ padding: "2px 6px" }}
                                >
                                  <FaTrash size={10} />
                                </Button>
                              </div>

                              {(it.opciones || []).length > 0 && (
                                <div className="mb-1">
                                  {it.opciones.map((o, idx) => (
                                    <Badge
                                      key={idx}
                                      bg="light"
                                      text="dark"
                                      className="me-1"
                                      style={{ fontSize: 10 }}
                                    >
                                      {o.opcion_nombre}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => dec(it.id)}
                                    style={{ padding: "2px 8px" }}
                                  >
                                    <FaMinus size={10} />
                                  </Button>
                                  <span className="fw-bold mx-1" style={{ fontSize: 13 }}>
                                    {it.cantidad}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => inc(it.id)}
                                    style={{ padding: "2px 8px" }}
                                  >
                                    <FaPlus size={10} />
                                  </Button>
                                </div>

                                <div className="fw-bold" style={{ fontSize: 14 }}>
                                  {money(lineTotal)}
                                </div>
                              </div>

                              <Form.Control
                                size="sm"
                                className="mt-2"
                                placeholder="Notas"
                                value={it.notas || ""}
                                onChange={(e) => setNotasItem(it.id, e.target.value)}
                                style={{ fontSize: 11 }}
                              />
                            </Card.Body>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  <hr />

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small">
                      Cliente (opcional)
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                    />
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small">
                      Notas de la orden
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      size="sm"
                      value={notasOrden}
                      onChange={(e) => setNotasOrden(e.target.value)}
                      placeholder="Ej: sin cebolla, extra salsa..."
                    />
                  </Form.Group>

                  <Card className="rounded-3 border bg-light mb-2">
                    <Card.Body className="py-2">
                      <div className="d-flex justify-content-between">
                        <span className="fw-semibold">Total</span>
                        <span className="fw-bold" style={{ fontSize: 18 }}>
                          {money(subtotal)}
                        </span>
                      </div>
                    </Card.Body>
                  </Card>

                  <Button
                    variant="success"
                    className="w-100 d-inline-flex align-items-center justify-content-center gap-2"
                    onClick={crearOrden}
                    disabled={busyCrear || carrito.length === 0}
                  >
                    {busyCrear ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <FaPaperPlane />
                    )}
                    Enviar a cocina
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* Modal de modificadores */}
      <ModalModificadores
        show={showMods}
        loading={modsLoading}
        data={modsProducto}
        onHide={() => {
          setShowMods(false);
          setModsProducto(null);
        }}
        onConfirm={confirmarMods}
      />
    </>
  );
}
