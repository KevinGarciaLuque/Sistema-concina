import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Col, Container, Offcanvas, Row, Spinner } from "react-bootstrap";
import { FaShoppingCart, FaSyncAlt } from "react-icons/fa";
import api from "../../api";
import { socket } from "../../socket";

import CatalogoProductos from "./components/CatalogoProductos";
import CarritoPOS from "./components/CarritoPOS";
import CheckoutPanel from "./components/CheckoutPanel";
import ModalModificadores from "./components/ModalModificadores";

function uid() {
  try { return crypto.randomUUID(); }
  catch { return `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`; }
}

function round2(n) {
  const v = Number(n || 0);
  return Math.round(v * 100) / 100;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Pos() {
  const user = useMemo(() => getStoredUser(), []);
  const rol = String(user?.rol || "").toLowerCase();

  // ===== data =====
  const [loadingCat, setLoadingCat] = useState(true);
  const [loadingProd, setLoadingProd] = useState(true);

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);

  const [categoriaId, setCategoriaId] = useState("");
  const [q, setQ] = useState("");

  // ===== carrito =====
  const [carrito, setCarrito] = useState([]);

  // ===== order meta =====
  const [tipo, setTipo] = useState("LLEVAR"); // MESA | LLEVAR | DELIVERY
  const [mesa, setMesa] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [notasOrden, setNotasOrden] = useState("");
  const [descuento, setDescuento] = useState(0);
  const [impuesto, setImpuesto] = useState(0);

  // ===== UI =====
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busyCrear, setBusyCrear] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

  // ===== modal modificadores =====
  const [showMods, setShowMods] = useState(false);
  const [modsLoading, setModsLoading] = useState(false);
  const [modsProducto, setModsProducto] = useState(null); // { producto, modificadores:[] }
  const [editItemId, setEditItemId] = useState(null);

  // ===== resultado orden =====
  const [ordenCreada, setOrdenCreada] = useState(null);

  // ====== totales ======
  const subtotal = useMemo(() => {
    return round2(
      carrito.reduce((acc, it) => {
        const extra = (it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0);
        const line = (Number(it.precio_unitario || 0) + extra) * Number(it.cantidad || 1);
        return acc + line;
      }, 0)
    );
  }, [carrito]);

  const total = useMemo(
    () => round2(subtotal - Number(descuento || 0) + Number(impuesto || 0)),
    [subtotal, descuento, impuesto]
  );

  // ===== load categorías/productos =====
  const loadCategorias = async () => {
    setLoadingCat(true);
    try {
      const { data } = await api.get("/api/categorias", { params: { activo: 1 } });
      setCategorias(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setCategorias([]);
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudieron cargar categorías." });
    } finally {
      setLoadingCat(false);
    }
  };

  const loadProductos = async () => {
    setLoadingProd(true);
    try {
      const params = { activo: 1, en_menu: 1 };
      if (q) params.q = q;
      if (categoriaId) params.categoria_id = categoriaId;

      const { data } = await api.get("/api/productos", { params });
      setProductos(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setProductos([]);
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudieron cargar productos." });
    } finally {
      setLoadingProd(false);
    }
  };

  const refreshAll = async () => {
    setMsg({ type: "", text: "" });
    await Promise.all([loadCategorias(), loadProductos()]);
  };

  useEffect(() => { refreshAll(); }, []); // eslint-disable-line

  useEffect(() => { loadProductos(); }, [categoriaId]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => loadProductos(), 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  // ===== realtime opcional =====
  useEffect(() => {
    if (!socket?.on) return;
    const onCatalog = () => loadProductos();
    socket.on("catalogo:update", onCatalog);
    return () => { try { socket.off("catalogo:update", onCatalog); } catch {} };
  }, []); // eslint-disable-line

  // ===== carrito actions =====
  const inc = (id) =>
    setCarrito((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: Number(it.cantidad) + 1 } : it)));

  const dec = (id) =>
    setCarrito((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: Math.max(1, Number(it.cantidad) - 1) } : it)));

  const remove = (id) => setCarrito((prev) => prev.filter((it) => it.id !== id));

  const setQty = (id, qty) =>
    setCarrito((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: Math.max(1, Number(qty || 1)) } : it)));

  const setNotasItem = (id, notas) =>
    setCarrito((prev) => prev.map((it) => (it.id === id ? { ...it, notas } : it)));

  // ===== abrir modal modificadores =====
  const abrirModificadoresParaProducto = async (producto, modo = "add", itemExistente = null) => {
    setMsg({ type: "", text: "" });
    setModsLoading(true);
    setModsProducto(null);
    setShowMods(true);
    setEditItemId(modo === "edit" ? itemExistente?.id : null);

    try {
      const { data } = await api.get(`/api/modificadores/por-producto/${producto.id}`);
      const mods = Array.isArray(data?.data) ? data.data : [];

      let preset = {};
      if (modo === "edit" && itemExistente?.opciones?.length) {
        for (const op of itemExistente.opciones) {
          const mid = Number(op.modificador_id);
          if (!preset[mid]) preset[mid] = [];
          preset[mid].push(Number(op.opcion_id));
        }
      }

      setModsProducto({ producto, modificadores: mods, preset });
    } catch (e) {
      setShowMods(false);
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudieron cargar modificadores." });
    } finally {
      setModsLoading(false);
    }
  };

  const addProducto = async (producto) => {
    await abrirModificadoresParaProducto(producto, "add", null);
  };

  const editItem = async (item) => {
    const producto = { id: item.producto_id, nombre: item.producto_nombre, precio: item.precio_unitario };
    await abrirModificadoresParaProducto(producto, "edit", item);
  };

  const confirmarMods = ({ producto, opcionesElegidas }) => {
    setCarrito((prev) => {
      if (editItemId) {
        return prev.map((it) => (it.id === editItemId ? { ...it, opciones: opcionesElegidas } : it));
      }
      return [
        ...prev,
        {
          id: uid(),
          producto_id: Number(producto.id),
          producto_nombre: String(producto.nombre),
          precio_unitario: Number(producto.precio ?? producto.precio_unitario ?? 0),
          cantidad: 1,
          notas: "",
          opciones: opcionesElegidas,
        },
      ];
    });

    setShowMods(false);
    setModsProducto(null);
    setEditItemId(null);
    setShowCartMobile(true);
  };

  // ===== crear orden =====
  const crearOrden = async () => {
    setMsg({ type: "", text: "" });

    if (!carrito.length) return setMsg({ type: "warning", text: "Agrega productos al carrito." });
    if (tipo === "MESA" && !String(mesa || "").trim()) {
      return setMsg({ type: "warning", text: "Si el tipo es MESA, debes indicar la mesa." });
    }
    if (total < 0) return setMsg({ type: "danger", text: "Total inválido. Revisa descuento/impuesto." });

    const payload = {
      cliente_nombre: String(clienteNombre || "").trim() || null,
      tipo,
      mesa: tipo === "MESA" ? String(mesa || "").trim() : null,
      notas: String(notasOrden || "").trim() || null,
      descuento: Number(descuento || 0),
      impuesto: Number(impuesto || 0),
      items: carrito.map((it) => ({
        producto_id: Number(it.producto_id),
        cantidad: Number(it.cantidad || 1),
        notas: String(it.notas || "").trim() || null,
        opciones: (it.opciones || []).map((o) => ({ opcion_id: Number(o.opcion_id) })),
      })),
    };

    setBusyCrear(true);
    try {
      const { data } = await api.post("/api/ordenes", payload);

      setOrdenCreada({ id: data?.id, codigo: data?.codigo });

      // reset POS
      setCarrito([]);
      setClienteNombre("");
      setMesa("");
      setNotasOrden("");
      setDescuento(0);
      setImpuesto(0);
      setTipo("LLEVAR");

      setMsg({ type: "success", text: `✅ Orden creada y enviada a cocina: ${data?.codigo}` });
      setShowCartMobile(false);
    } catch (e) {
      setMsg({ type: "danger", text: e?.response?.data?.message || "No se pudo crear la orden." });
    } finally {
      setBusyCrear(false);
    }
  };

  return (
    <Container fluid className="py-3">
      <Row className="align-items-center g-2 mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40, background: "rgba(25,135,84,.12)" }}>
              <FaShoppingCart />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                POS (Cajero) <Badge bg="success" className="ms-2">LIVE</Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Catálogo · Carrito · Modificadores · Enviar a cocina
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-none d-lg-flex">
          <Button
            variant="outline-primary"
            onClick={refreshAll}
            className="d-inline-flex align-items-center gap-2"
            disabled={loadingCat || loadingProd}
          >
            <FaSyncAlt />
            Actualizar
          </Button>
        </Col>

        <Col xs="auto" className="d-lg-none">
          <Button
            variant="dark"
            onClick={() => setShowCartMobile(true)}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaShoppingCart />
            Carrito
            <Badge bg="light" text="dark">{carrito.length}</Badge>
          </Button>
        </Col>
      </Row>

      {msg.text ? <Alert variant={msg.type} className="mb-3">{msg.text}</Alert> : null}

      <Row className="g-3">
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

        <Col lg={4} className="d-none d-lg-block">
          <div className="position-sticky" style={{ top: 88 }}>
            <CarritoPOS
              carrito={carrito}
              inc={inc}
              dec={dec}
              remove={remove}
              setQty={setQty}
              setNotasItem={setNotasItem}
              onEditItem={editItem}
            />

            <div className="mt-3">
              <CheckoutPanel
                tipo={tipo}
                setTipo={setTipo}
                mesa={mesa}
                setMesa={setMesa}
                clienteNombre={clienteNombre}
                setClienteNombre={setClienteNombre}
                notasOrden={notasOrden}
                setNotasOrden={setNotasOrden}
                descuento={descuento}
                setDescuento={setDescuento}
                impuesto={impuesto}
                setImpuesto={setImpuesto}
                subtotal={subtotal}
                total={total}
                carritoCount={carrito.length}
                busyCrear={busyCrear}
                onCrearOrden={crearOrden}
                ordenCreada={ordenCreada}
              />
            </div>
          </div>
        </Col>
      </Row>

      <Offcanvas show={showCartMobile} onHide={() => setShowCartMobile(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">
            Carrito <Badge bg="dark" className="ms-2">{carrito.length}</Badge>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <CarritoPOS
            carrito={carrito}
            inc={inc}
            dec={dec}
            remove={remove}
            setQty={setQty}
            setNotasItem={setNotasItem}
            onEditItem={editItem}
          />

          <div className="mt-3">
            <CheckoutPanel
              tipo={tipo}
              setTipo={setTipo}
              mesa={mesa}
              setMesa={setMesa}
              clienteNombre={clienteNombre}
              setClienteNombre={setClienteNombre}
              notasOrden={notasOrden}
              setNotasOrden={setNotasOrden}
              descuento={descuento}
              setDescuento={setDescuento}
              impuesto={impuesto}
              setImpuesto={setImpuesto}
              subtotal={subtotal}
              total={total}
              carritoCount={carrito.length}
              busyCrear={busyCrear}
              onCrearOrden={crearOrden}
              ordenCreada={ordenCreada}
            />
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <ModalModificadores
        show={showMods}
        loading={modsLoading}
        data={modsProducto}
        onHide={() => {
          setShowMods(false);
          setModsProducto(null);
          setEditItemId(null);
        }}
        onConfirm={confirmarMods}
      />

      {busyCrear ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.25)", zIndex: 2000 }}
        >
          <div className="bg-white rounded-4 shadow p-4 text-center" style={{ width: 320 }}>
            <Spinner animation="border" className="mb-2" />
            <div className="fw-bold">Creando orden...</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Guardando detalle y enviando a cocina.
            </div>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
