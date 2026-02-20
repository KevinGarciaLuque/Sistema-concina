// Frontend/src/pages/POS/Pos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  Form,
  Offcanvas,
  Row,
  Spinner,
  Modal,
  Nav,
} from "react-bootstrap";
import { FaShoppingCart, FaSyncAlt, FaUserTag, FaIdCard, FaPaperPlane, FaClock } from "react-icons/fa";
import api from "../../api";
import { socket } from "../../socket";

import CatalogoProductos from "./components/CatalogoProductos";
import CarritoPOS from "./components/CarritoPOS";
import CheckoutPanel from "./components/CheckoutPanel";
import ModalModificadores from "./components/ModalModificadores";
import OrdenesPendientesCobro from "./components/OrdenesPendientesCobro";

// ✅ NUEVO (módulo 1)
import MetodosPagos from "./components/MetodosPagos";
import { generarTicket80mmPDF } from "../../utils/ticket80mm";

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }
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
  const [showCheckout, setShowCheckout] = useState(false);

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
        const extra = (it.opciones || []).reduce(
          (a, o) => a + Number(o.precio_extra || 0),
          0,
        );
        const line =
          (Number(it.precio_unitario || 0) + extra) * Number(it.cantidad || 1);
        return acc + line;
      }, 0),
    );
  }, [carrito]);

  const total = useMemo(
    () => round2(subtotal - Number(descuento || 0) + Number(impuesto || 0)),
    [subtotal, descuento, impuesto],
  );

  // ✅ NUEVO: snapshot de venta (para cobrar aunque ya limpies el carrito)
  const [ventaDraft, setVentaDraft] = useState(null);

  // ✅ NUEVO: caja activa + cobro
  const [cajaSesion, setCajaSesion] = useState(null);
  const [showCobro, setShowCobro] = useState(false);
  const [pagoState, setPagoState] = useState(null);
  const [busyCobrar, setBusyCobrar] = useState(false);

  // ✅ NUEVO: clientes con RTN para modal de cobro
  const [clientesConRtn, setClientesConRtn] = useState([]);
  const [loadingClientesRtn, setLoadingClientesRtn] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [usarClienteRtn, setUsarClienteRtn] = useState(false);

  // ✅ NUEVO: órdenes pendientes de cobro
  const [vistaActual, setVistaActual] = useState("nueva-venta"); // "nueva-venta" | "pendientes-cobro"
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);

  // ===== load categorías/productos =====
  const loadCategorias = async () => {
    setLoadingCat(true);
    try {
      const { data } = await api.get("/categorias", { params: { activo: 1 } });
      setCategorias(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setCategorias([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar categorías.",
      });
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

      const { data } = await api.get("/productos", { params });
      setProductos(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setProductos([]);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudieron cargar productos.",
      });
    } finally {
      setLoadingProd(false);
    }
  };

  const refreshAll = async () => {
    setMsg({ type: "", text: "" });
    await Promise.all([loadCategorias(), loadProductos()]);
  };

  useEffect(() => {
    refreshAll();
  }, []); // eslint-disable-line

  useEffect(() => {
    loadProductos();
  }, [categoriaId]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => loadProductos(), 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  // ===== realtime opcional =====
  useEffect(() => {
    if (!socket?.on) return;
    const onCatalog = () => loadProductos();
    const onOrdenes = () => loadOrdenesPendientes();
    socket.on("catalogo:update", onCatalog);
    socket.on("ordenes:update", onOrdenes);
    socket.on("cocina:update", onOrdenes);
    return () => {
      try {
        socket.off("catalogo:update", onCatalog);
        socket.off("ordenes:update", onOrdenes);
        socket.off("cocina:update", onOrdenes);
      } catch {}
    };
  }, []); // eslint-disable-line

  // ✅ NUEVO: cargar caja activa
  const loadCajaActiva = async () => {
    try {
      const { data } = await api.get("/caja/sesion-activa");
      const ses = data?.data ?? data;
      setCajaSesion(ses?.id ? ses : null);
    } catch {
      setCajaSesion(null);
    }
  };

  useEffect(() => {
    loadCajaActiva();
    loadOrdenesPendientes();
  }, []);

  // ✅ NUEVO: cargar órdenes pendientes de cobro
  const loadOrdenesPendientes = async () => {
    setLoadingPendientes(true);
    try {
      // Cargar órdenes que no han sido facturadas aún
      const { data } = await api.get("/ordenes", {
        params: {
          pendiente_cobro: 1,
          limit: 100,
        },
      });
      const rows = data?.rows || data?.data || data || [];
      setOrdenesPendientes(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("Error cargando órdenes pendientes:", e);
      setOrdenesPendientes([]);
    } finally {
      setLoadingPendientes(false);
    }
  };

  // ===== carrito actions =====
  const inc = (id) =>
    setCarrito((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, cantidad: Number(it.cantidad) + 1 } : it,
      ),
    );

  const dec = (id) =>
    setCarrito((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, cantidad: Math.max(1, Number(it.cantidad) - 1) }
          : it,
      ),
    );

  const remove = (id) =>
    setCarrito((prev) => prev.filter((it) => it.id !== id));

  const setQty = (id, qty) =>
    setCarrito((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, cantidad: Math.max(1, Number(qty || 1)) } : it,
      ),
    );

  const setNotasItem = (id, notas) =>
    setCarrito((prev) =>
      prev.map((it) => (it.id === id ? { ...it, notas } : it)),
    );

  // ===== abrir modal modificadores =====
  const abrirModificadoresParaProducto = async (
    producto,
    modo = "add",
    itemExistente = null,
  ) => {
    setMsg({ type: "", text: "" });
    setModsLoading(true);
    setModsProducto(null);
    setShowMods(true);
    setEditItemId(modo === "edit" ? itemExistente?.id : null);

    try {
      const { data } = await api.get(
        `/modificadores/por-producto/${producto.id}`,
        { params: { _t: Date.now() } },
      );
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
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message || "No se pudieron cargar modificadores.",
      });
    } finally {
      setModsLoading(false);
    }
  };

  const addProducto = async (producto) => {
    await abrirModificadoresParaProducto(producto, "add", null);
  };

  const editItem = async (item) => {
    const producto = {
      id: item.producto_id,
      nombre: item.producto_nombre,
      precio: item.precio_unitario,
    };
    await abrirModificadoresParaProducto(producto, "edit", item);
  };

  const confirmarMods = ({ producto, opcionesElegidas }) => {
    setCarrito((prev) => {
      if (editItemId) {
        // Modo edición: actualizar opciones del item existente
        return prev.map((it) =>
          it.id === editItemId ? { ...it, opciones: opcionesElegidas } : it,
        );
      }

      // Modo agregar: buscar si ya existe el mismo producto con las mismas opciones
      const productoId = Number(producto.id);
      const precioUnit = Number(producto.precio ?? producto.precio_unitario ?? 0);

      // Función para comparar opciones
      const sonOpcionesIguales = (ops1, ops2) => {
        if (ops1.length !== ops2.length) return false;
        const ids1 = ops1.map(o => Number(o.opcion_id)).sort();
        const ids2 = ops2.map(o => Number(o.opcion_id)).sort();
        return ids1.every((id, idx) => id === ids2[idx]);
      };

      // Buscar item existente con mismo producto y opciones
      const itemExistente = prev.find(
        (it) =>
          Number(it.producto_id) === productoId &&
          Number(it.precio_unitario) === precioUnit &&
          sonOpcionesIguales(it.opciones || [], opcionesElegidas)
      );

      if (itemExistente) {
        // Si existe, incrementar cantidad
        return prev.map((it) =>
          it.id === itemExistente.id
            ? { ...it, cantidad: Number(it.cantidad) + 1 }
            : it
        );
      }

      // Si no existe, agregar nuevo item
      return [
        ...prev,
        {
          id: uid(),
          producto_id: productoId,
          producto_nombre: String(producto.nombre),
          precio_unitario: precioUnit,
          cantidad: 1,
          notas: "",
          opciones: opcionesElegidas,
        },
      ];
    });

    setShowMods(false);
    setModsProducto(null);
    setEditItemId(null);
  };

  const handleFinalizarOrden = () => {
    if (carrito.length === 0) {
      setMsg({ type: "warning", text: "Agrega productos al carrito primero." });
      return;
    }
    setShowCheckout(true);
  };

  const handleCobrarAhora = () => {
    setShowCheckout(false);
    setShowCobro(true);
  };

  const handleCobrarDespues = () => {
    setShowCheckout(false);
    setOrdenCreada(null);
    setMsg({ type: "info", text: "Puedes cobrar esta orden desde el módulo de Facturas." });
  };

  const handleCloseCheckout = () => {
    setShowCheckout(false);
    if (ordenCreada) {
      setOrdenCreada(null);
    }
  };

  // ===== crear orden =====
  const crearOrden = async () => {
    setMsg({ type: "", text: "" });

    if (!carrito.length)
      return setMsg({ type: "warning", text: "Agrega productos al carrito." });

    if (tipo === "MESA" && !String(mesa || "").trim()) {
      return setMsg({
        type: "warning",
        text: "Si el tipo es MESA, debes indicar la mesa.",
      });
    }

    if (total < 0)
      return setMsg({
        type: "danger",
        text: "Total inválido. Revisa descuento/impuesto.",
      });

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
        opciones: (it.opciones || []).map((o) => ({
          opcion_id: Number(o.opcion_id),
        })),
      })),
    };

    setBusyCrear(true);
    try {
      const { data } = await api.post("/ordenes", payload);

      const ordenObj = { id: data?.id, codigo: data?.codigo };
      setOrdenCreada(ordenObj);

      // ✅ snapshot para cobrar aunque limpiemos el carrito
      setVentaDraft({
        orden: ordenObj,
        cliente_nombre: String(clienteNombre || "").trim() || null,
        subtotal,
        descuento: Number(descuento || 0),
        impuesto: Number(impuesto || 0),
        total,
      });

      // reset POS (se queda la orden creada y draft listo para cobrar)
      setCarrito([]);
      setClienteNombre("");
      setMesa("");
      setNotasOrden("");
      setDescuento(0);
      setImpuesto(0);
      setTipo("LLEVAR");

      setMsg({
        type: "success",
        text: `✅ Orden creada y enviada a cocina: ${data?.codigo}`,
      });

      setShowCartMobile(false);
      // NO cerrar el modal - dejar que usuario elija con botones

      // NO abrimos cobro automáticamente - usuario decide con botones
      await loadCajaActiva();
      setPagoState(null);
      setUsarClienteRtn(false);
      setClienteSeleccionado(null);
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo crear la orden.",
      });
    } finally {
      setBusyCrear(false);
    }
  };

  // ✅ COBRAR + IMPRIMIR (módulo 1)
  const cobrarEImprimir = async () => {
    setMsg({ type: "", text: "" });

    if (!ventaDraft?.orden?.id) {
      return setMsg({
        type: "warning",
        text: "No hay una orden lista para cobrar.",
      });
    }
    if (!cajaSesion?.id) {
      return setMsg({
        type: "danger",
        text: "No hay caja abierta. Abre caja para poder cobrar.",
      });
    }
    if (!pagoState?.isValid) {
      return setMsg({
        type: "warning",
        text: pagoState?.error || "Pago inválido.",
      });
    }

    setBusyCobrar(true);
    try {
      const payload = {
        orden_id: ventaDraft.orden.id,
        caja_sesion_id: cajaSesion.id,
        // ⚠️ Con CAI: ya NO enviamos numero_factura, se genera automáticamente en backend

        cliente_nombre: usarClienteRtn && clienteSeleccionado?.nombre 
          ? clienteSeleccionado.nombre 
          : ventaDraft.cliente_nombre,
        cliente_rtn: usarClienteRtn && clienteSeleccionado?.rtn ? clienteSeleccionado.rtn : null,
        cliente_telefono: usarClienteRtn && clienteSeleccionado?.telefono ? clienteSeleccionado.telefono : null,
        cliente_direccion: usarClienteRtn && clienteSeleccionado?.direccion ? clienteSeleccionado.direccion : null,

        subtotal: ventaDraft.subtotal,
        descuento: ventaDraft.descuento,
        impuesto: ventaDraft.impuesto,
        total: ventaDraft.total,

        pagos: pagoState.pagos,
      };

      const { data } = await api.post("/pos/cobrar", payload);
      const facturaId = data?.data?.factura_id;
      const numeroFactura = data?.data?.numero_factura;

      console.log("💰 Factura creada:", { facturaId, numeroFactura });

      // Traer data completa del ticket (factura + pagos + items + opciones)
      const r = await api.get(`/facturas/${facturaId}/recibo`);
      console.log("📋 Respuesta del recibo:", r);
      const recibo = r?.data?.data;
      console.log("📄 Datos del recibo:", recibo);

      // Generar ticket 80mm
      generarTicket80mmPDF(recibo);

      setShowCobro(false);
      setVentaDraft(null);
      setOrdenCreada(null);

      // ✅ NUEVO: Recargar órdenes pendientes después de cobrar
      await loadOrdenesPendientes();

      setMsg({
        type: "success",
        text: `✅ Venta cobrada e impresa. Factura: ${numeroFactura || facturaId}`,
      });
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cobrar/imprimir.",
      });
    } finally {
      setBusyCobrar(false);
    }
  };

  const totalCobro = Number(ventaDraft?.total ?? 0);

  // ✅ Cargar clientes con RTN cuando se abre el modal de cobro
  useEffect(() => {
    if (showCobro && clientesConRtn.length === 0) {
      cargarClientesConRtn();
    }
    // eslint-disable-next-line
  }, [showCobro]);

  const cargarClientesConRtn = async () => {
    setLoadingClientesRtn(true);
    try {
      const { data } = await api.get("/clientes", { params: { activo: 1, limit: 200 } });
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      // Filtrar solo clientes con RTN
      setClientesConRtn(rows.filter((c) => c.rtn));
    } catch (error) {
      console.error("Error cargando clientes:", error);
      setClientesConRtn([]);
    } finally {
      setLoadingClientesRtn(false);
    }
  };

  const handleSeleccionarClienteRtn = (e) => {
    const id = e.target.value;
    if (!id) {
      setClienteSeleccionado(null);
      return;
    }
    const cliente = clientesConRtn.find((c) => String(c.id) === String(id));
    setClienteSeleccionado(cliente || null);
  };

  // ✅ NUEVO: cobrar orden pendiente
  const handleCobrarOrdenPendiente = async (orden) => {
    try {
      // Usar directamente los datos de la orden que ya tenemos
      // La tabla ya incluye todos los campos necesarios
      setVentaDraft({
        orden: {
          id: orden.id,
          codigo: orden.codigo,
        },
        cliente_nombre: orden.cliente_nombre || null,
        subtotal: Number(orden.subtotal || 0),
        descuento: Number(orden.descuento || 0),
        impuesto: Number(orden.impuesto || 0),
        total: Number(orden.total || 0),
      });

      // Resetear estados de pago
      setPagoState(null);
      setUsarClienteRtn(false);
      setClienteSeleccionado(null);

      // Abrir modal de cobro
      setShowCobro(true);
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cargar la orden.",
      });
    }
  };

  return (
    <Container fluid className="py-3">
      <Row className="align-items-center g-2 mb-2">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                background: "rgba(25,135,84,.12)",
              }}
            >
              <FaShoppingCart />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                POS (Cajero){" "}
                <Badge bg="success" className="ms-2">
                  LIVE
                </Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Catálogo · Carrito · Modificadores · Enviar a cocina · Cobrar e
                imprimir
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto" className="d-none d-lg-flex">
          <Button
            variant="outline-primary"
            onClick={() => {
              if (vistaActual === "nueva-venta") {
                refreshAll();
              } else {
                loadOrdenesPendientes();
              }
            }}
            className="d-inline-flex align-items-center gap-2"
            disabled={loadingCat || loadingProd || loadingPendientes}
          >
            <FaSyncAlt className={loadingPendientes ? "fa-spin" : ""} />
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
            <Badge bg="light" text="dark">
              {carrito.length}
            </Badge>
          </Button>
        </Col>
      </Row>

      {msg.text ? (
        <Alert variant={msg.type} className="mb-3">
          {msg.text}
        </Alert>
      ) : null}

      {/* ✅ NUEVO: Tabs para cambiar entre nueva venta y órdenes pendientes */}
      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link
            active={vistaActual === "nueva-venta"}
            onClick={() => setVistaActual("nueva-venta")}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaShoppingCart size={14} />
            Nueva Venta
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            active={vistaActual === "pendientes-cobro"}
            onClick={() => {
              setVistaActual("pendientes-cobro");
              loadOrdenesPendientes();
            }}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaClock size={14} />
            Órdenes Pendientes
            {ordenesPendientes.length > 0 && (
              <Badge bg="warning" text="dark">
                {ordenesPendientes.length}
              </Badge>
            )}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Vista de Nueva Venta */}
      {vistaActual === "nueva-venta" && (
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

              {/* Botón para finalizar orden */}
              <Button
                className="w-100 mt-3 shadow-lg"
                variant="success"
                size="lg"
                onClick={handleFinalizarOrden}
                disabled={carrito.length === 0}
              >
                <FaPaperPlane className="me-2" />
                Finalizar Orden
              </Button>
            </div>
          </Col>
        </Row>
      )}

      {/* Vista de Órdenes Pendientes de Cobro */}
      {vistaActual === "pendientes-cobro" && (
        <OrdenesPendientesCobro
          ordenes={ordenesPendientes}
          loading={loadingPendientes}
          onCobrar={handleCobrarOrdenPendiente}
        />
      )}

      <Offcanvas
        show={showCartMobile}
        onHide={() => setShowCartMobile(false)}
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">
            Carrito{" "}
            <Badge bg="dark" className="ms-2">
              {carrito.length}
            </Badge>
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

          <Button
            className="w-100 mt-3"
            variant="success"
            size="lg"
            onClick={() => {
              setShowCartMobile(false);
              handleFinalizarOrden();
            }}
            disabled={carrito.length === 0}
          >
            <FaPaperPlane className="me-2" />
            Finalizar Orden
          </Button>
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

      {/* ✅ Modal de cobro */}
      <Modal
        show={showCobro}
        onHide={() => setShowCobro(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Cobrar e imprimir</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="text-muted">
              Orden: <b>{ventaDraft?.orden?.codigo || "—"}</b>
            </div>
            <div className="fw-bold">
              Total: L {Number(totalCobro || 0).toFixed(2)}
            </div>
          </div>

          <div className="text-muted mb-3" style={{ fontSize: 12 }}>
            Caja:{" "}
            {cajaSesion?.id ? (
              <b>ABIERTA (ID {cajaSesion.id})</b>
            ) : (
              <b className="text-danger">CERRADA / SIN SESIÓN</b>
            )}
          </div>

          {/* ✅ NUEVO: Selector de cliente con RTN */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div 
                className="rounded-3 d-inline-flex align-items-center justify-content-center"
                style={{ width: 36, height: 36, background: "rgba(13,110,253,.12)" }}
              >
                <FaUserTag size={18} color="#0d6efd" />
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold" style={{ fontSize: 15 }}>Cliente con RTN (Fiscal)</div>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  Opcional - Solo si requiere factura con RTN
                </div>
              </div>
              <Form.Check
                type="switch"
                id="switch-usar-rtn-cobro"
                checked={usarClienteRtn}
                onChange={(e) => {
                  setUsarClienteRtn(e.target.checked);
                  if (!e.target.checked) setClienteSeleccionado(null);
                }}
                style={{ transform: "scale(1.2)" }}
              />
            </div>

            {usarClienteRtn && (
              <div className="p-3 border rounded-4 bg-light">
                {loadingClientesRtn ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" animation="border" className="me-2" />
                    <span className="text-muted">Cargando clientes...</span>
                  </div>
                ) : (
                  <>
                    <Form.Group className="mb-0">
                      <Form.Label className="fw-semibold d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                        <FaIdCard /> Seleccionar Cliente Registrado
                      </Form.Label>
                      <Form.Select
                        value={clienteSeleccionado?.id || ""}
                        onChange={handleSeleccionarClienteRtn}
                        style={{ fontSize: 14 }}
                      >
                        <option value="">Seleccionar cliente con RTN...</option>
                        {clientesConRtn.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} - {c.rtn}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {clienteSeleccionado && (
                      <div className="mt-3 p-3 rounded-3 border" style={{ background: "#fff" }}>
                        <div className="fw-semibold mb-2" style={{ fontSize: 12, color: "#6c757d" }}>
                          DATOS DEL CLIENTE
                        </div>
                        <div className="d-flex flex-column gap-1" style={{ fontSize: 13 }}>
                          <div>
                            <span className="text-muted">Nombre:</span>{" "}
                            <span className="fw-semibold">{clienteSeleccionado.nombre}</span>
                          </div>
                          <div>
                            <span className="text-muted">RTN:</span>{" "}
                            <span className="fw-semibold font-monospace">{clienteSeleccionado.rtn}</span>
                          </div>
                          {clienteSeleccionado.telefono && (
                            <div>
                              <span className="text-muted">Teléfono:</span>{" "}
                              <span className="fw-semibold">{clienteSeleccionado.telefono}</span>
                            </div>
                          )}
                          {clienteSeleccionado.direccion && (
                            <div>
                              <span className="text-muted">Dirección:</span>{" "}
                              <span className="fw-semibold">{clienteSeleccionado.direccion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {clientesConRtn.length === 0 && (
                      <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
                        No hay clientes con RTN registrados.
                        <br />
                        <span className="text-primary">Ve a Admin &gt; Clientes para agregar</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="mb-0">
            <div className="fw-bold mb-2" style={{ fontSize: 15 }}>Método de pago</div>
            <MetodosPagos
              total={totalCobro}
              value={pagoState}
              onChange={setPagoState}
            />
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowCobro(false)}
            disabled={busyCobrar}
          >
            Cerrar
          </Button>
          <Button
            variant="success"
            onClick={cobrarEImprimir}
            disabled={busyCobrar || !pagoState?.isValid || !cajaSesion?.id}
          >
            {busyCobrar ? "Cobrando..." : "Cobrar e imprimir"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Overlays */}
      {busyCrear ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.25)", zIndex: 2000 }}
        >
          <div
            className="bg-white rounded-4 shadow p-4 text-center"
            style={{ width: 320 }}
          >
            <Spinner animation="border" className="mb-2" />
            <div className="fw-bold">Creando orden...</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Guardando detalle y enviando a cocina.
            </div>
          </div>
        </div>
      ) : null}

      {busyCobrar ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.25)", zIndex: 2200 }}
        >
          <div
            className="bg-white rounded-4 shadow p-4 text-center"
            style={{ width: 340 }}
          >
            <Spinner animation="border" className="mb-2" />
            <div className="fw-bold">Cobrando e imprimiendo...</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Creando factura, registrando pagos y generando ticket 80mm.
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal para finalizar orden */}
      <Modal show={showCheckout} onHide={handleCloseCheckout} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Finalizar Orden</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
            onCobrarAhora={handleCobrarAhora}
            onCobrarDespues={handleCobrarDespues}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
}
