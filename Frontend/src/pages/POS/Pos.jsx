// Frontend/src/pages/POS/Pos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  Form,
  InputGroup,
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
  const [notasOrden, setNotasOrden] = useState("");
  
  // ✅ Cliente, descuento e impuesto se manejan al cobrar
  const [clienteNombreCobro, setClienteNombreCobro] = useState("");
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

  // ✅ Total sin descuentos/impuestos (se calculan al cobrar)
  const total = subtotal;

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
    // ✅ Verificar si el producto tiene modificadores primero
    if (!producto) return;

    try {
      const { data } = await api.get(
        `/modificadores/por-producto/${producto.id}`,
        { params: { _t: Date.now() } },
      );
      const mods = Array.isArray(data?.data) ? data.data : [];

      // Si NO tiene modificadores, agregarlo directamente al carrito
      if (!mods || mods.length === 0) {
        const nuevoItem = {
          id: uid(),
          producto_id: Number(producto.id),
          producto_nombre: String(producto.nombre),
          precio_unitario: Number(producto.precio || 0),
          cantidad: 1,
          notas: "",
          opciones: [],
        };

        setCarrito((prev) => [...prev, nuevoItem]);
        setMsg({ 
          type: "success", 
          text: `✅ ${producto.nombre} agregado al carrito` 
        });
        setTimeout(() => setMsg({ type: "", text: "" }), 2000);
        return;
      }
    } catch (e) {
      console.error("Error verificando modificadores:", e);
    }

    // Si tiene modificadores, abrir el modal
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
    // Resetear campos de cobro cuando abre el modal
    setClienteNombreCobro("");
    setUsarClienteRtn(false);
    setClienteSeleccionado(null);
    setDescuento(0);
    setImpuesto(0);
    setPagoState(null);
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
      cliente_nombre: null, // ✅ Se asignará al cobrar
      tipo,
      mesa: tipo === "MESA" ? String(mesa || "").trim() : null,
      notas: String(notasOrden || "").trim() || null,
      descuento: 0, // ✅ Se aplicará al cobrar
      impuesto: 0, // ✅ Se aplicará al cobrar
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

      // ✅ snapshot para cobrar (sin descuentos/impuestos aún)
      setVentaDraft({
        orden: ordenObj,
        cliente_nombre: null, // Se asignará al cobrar
        subtotal,
        descuento: 0,
        impuesto: 0,
        total: subtotal, // Total base sin ajustes
      });

      // reset POS (se queda la orden creada y draft listo para cobrar)
      setCarrito([]);
      setMesa("");
      setNotasOrden("");
      setTipo("LLEVAR");
      
      // Resetear campos de cobro
      setClienteNombreCobro("");
      setDescuento(0);
      setImpuesto(0);

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

    // ✅ Calcular total final con descuentos e impuestos
    // Si la orden ya tiene total (orden pendiente), usar ese como base
    const subtotalBase = ventaDraft.subtotal || ventaDraft.total || 0;
    const descuentoFinal = Number(descuento || 0);
    const impuestoFinal = Number(impuesto || 0);
    const totalFinal = round2(subtotalBase - descuentoFinal + impuestoFinal);

    // ✅ Determinar nombre del cliente
    let nombreClienteFinal = null;
    if (usarClienteRtn && clienteSeleccionado?.nombre) {
      nombreClienteFinal = clienteSeleccionado.nombre;
    } else if (clienteNombreCobro.trim()) {
      nombreClienteFinal = clienteNombreCobro.trim();
    }

    setBusyCobrar(true);
    try {
      const payload = {
        orden_id: ventaDraft.orden.id,
        caja_sesion_id: cajaSesion.id,

        cliente_nombre: nombreClienteFinal,
        cliente_rtn: usarClienteRtn && clienteSeleccionado?.rtn ? clienteSeleccionado.rtn : null,
        cliente_telefono: usarClienteRtn && clienteSeleccionado?.telefono ? clienteSeleccionado.telefono : null,
        cliente_direccion: usarClienteRtn && clienteSeleccionado?.direccion ? clienteSeleccionado.direccion : null,

        subtotal: subtotalBase,
        descuento: descuentoFinal,
        impuesto: impuestoFinal,
        total: totalFinal,

        pagos: pagoState.pagos,
      };

      console.log("💰 Enviando payload de cobro:", payload);

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
      
      // Limpiar campos de cobro
      setClienteNombreCobro("");
      setDescuento(0);
      setImpuesto(0);
      setUsarClienteRtn(false);
      setClienteSeleccionado(null);

      // ✅ NUEVO: Recargar órdenes pendientes después de cobrar
      await loadOrdenesPendientes();

      setMsg({
        type: "success",
        text: `✅ Venta cobrada e impresa. Factura: ${numeroFactura || facturaId}`,
      });
    } catch (e) {
      console.error("❌ Error al cobrar:", e);
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo cobrar/imprimir.",
      });
    } finally {
      setBusyCobrar(false);
    }
  };

  // ✅ Calcular total con descuentos e impuestos en tiempo real
  const totalCobro = useMemo(() => {
    if (!ventaDraft) return 0;
    const base = ventaDraft.subtotal || ventaDraft.total || 0;
    return round2(
      Number(base) - 
      Number(descuento || 0) + 
      Number(impuesto || 0)
    );
  }, [ventaDraft, descuento, impuesto]);

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
      // Validar que hay caja abierta
      if (!cajaSesion?.id) {
        setMsg({
          type: "danger",
          text: "⚠️ No hay caja abierta. Abre una caja primero para poder cobrar.",
        });
        return;
      }

      // Usar directamente los datos de la orden que ya tenemos
      setVentaDraft({
        orden: {
          id: orden.id,
          codigo: orden.codigo,
        },
        cliente_nombre: orden.cliente_nombre || null,
        subtotal: Number(orden.total || 0), // ✅ Usar el total de la orden
        descuento: 0, // Resetear para que usuario decida
        impuesto: 0, // Resetear para que usuario decida
        total: Number(orden.total || 0), // Total de la orden
      });

      // Resetear estados de pago y cobro
      setClienteNombreCobro(orden.cliente_nombre || "");
      setDescuento(0);
      setImpuesto(0);
      setPagoState(null);
      setUsarClienteRtn(false);
      setClienteSeleccionado(null);

      // Abrir modal de cobro
      setShowCobro(true);
      setMsg({ type: "", text: "" }); // Limpiar mensajes
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
                onClearCart={() => setCarrito([])}
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
                Tomar Orden
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
            onClearCart={() => setCarrito([])}
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
            Tomar Orden
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
        size="md"
        backdrop="static"
      >
        <Modal.Header closeButton className="py-2">
          <Modal.Title style={{ fontSize: 16 }}>
            💰 Cobrar e imprimir
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3">
          <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
            <div style={{ fontSize: 12 }}>
              Orden: <b>{ventaDraft?.orden?.codigo || "—"}</b>
            </div>
            <div className="fw-bold" style={{ fontSize: 14 }}>
              L {Number(totalCobro || 0).toFixed(2)}
            </div>
          </div>

          {/* ✅ Información del cliente */}
          <div className="mb-2">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div className="fw-bold" style={{ fontSize: 12 }}>
                👤 Cliente
              </div>
              <Form.Check
                type="switch"
                id="switch-usar-rtn-cobro"
                label={<span style={{ fontSize: 11 }}>Fiscal</span>}
                checked={usarClienteRtn}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUsarClienteRtn(checked);
                  if (checked) {
                    setClienteNombreCobro("");
                  } else {
                    setClienteSeleccionado(null);
                  }
                }}
                style={{ fontSize: 11 }}
              />
            </div>
            
            {!usarClienteRtn && (
              <Form.Group className="mb-0">
                <Form.Control
                  size="sm"
                  value={clienteNombreCobro}
                  onChange={(e) => setClienteNombreCobro(e.target.value)}
                  placeholder="Nombre (opcional)"
                  disabled={usarClienteRtn}
                  style={{ fontSize: 12 }}
                />
              </Form.Group>
            )}

            {usarClienteRtn && (
              <div className="p-2 border rounded-2 bg-light">
                {loadingClientesRtn ? (
                  <div className="text-center py-2">
                    <Spinner size="sm" animation="border" />
                  </div>
                ) : clienteSeleccionado ? (
                  <div className="p-2 rounded-2 border" style={{ background: "#fff", fontSize: 11 }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="fw-bold mb-1">{clienteSeleccionado.nombre}</div>
                        <div className="text-muted">RTN: {clienteSeleccionado.rtn}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => setClienteSeleccionado(null)}
                        style={{ fontSize: 10, padding: "2px 8px" }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Form.Group className="mb-0">
                      <Form.Select
                        size="sm"
                        value={clienteSeleccionado?.id || ""}
                        onChange={handleSeleccionarClienteRtn}
                        style={{ fontSize: 12 }}
                      >
                        <option value="">Seleccionar cliente con RTN...</option>
                        {clientesConRtn.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} - {c.rtn}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {clientesConRtn.length === 0 && (
                      <div className="text-center text-muted py-1 mt-2" style={{ fontSize: 11 }}>
                        Sin clientes RTN registrados
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ✅ Sección de totales y ajustes */}
          <div className="mb-2 p-2 border rounded-3 bg-light">
            <div className="fw-bold mb-2" style={{ fontSize: 12 }}>
              Totales
            </div>

            <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
              <span className="text-muted">Subtotal:</span>
              <span className="fw-semibold">L {Number(ventaDraft?.subtotal || ventaDraft?.total || 0).toFixed(2)}</span>
            </div>

            <div className="d-flex gap-2 mb-1">
              <Form.Group style={{ flex: 1 }}>
                <Form.Label style={{ fontSize: 11, marginBottom: 2 }}>Desc.</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text style={{ fontSize: 11, padding: "2px 6px" }}>L</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group style={{ flex: 1 }}>
                <Form.Label style={{ fontSize: 11, marginBottom: 2 }}>Imp.</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text style={{ fontSize: 11, padding: "2px 6px" }}>L</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={impuesto}
                    onChange={(e) => setImpuesto(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </InputGroup>
              </Form.Group>
            </div>

            <div className="d-flex justify-content-between pt-1 border-top">
              <span className="fw-bold" style={{ fontSize: 12 }}>TOTAL:</span>
              <span className="fw-bold" style={{ fontSize: 16, color: "#198754" }}>
                L {Number(totalCobro || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Método de pago */}
          <div className="mb-0">
            <div className="fw-bold mb-1" style={{ fontSize: 12 }}>💳 Pago</div>
            <MetodosPagos
              total={totalCobro}
              value={pagoState}
              onChange={setPagoState}
            />
          </div>

          {/* Mensajes de validación */}
          {!cajaSesion?.id && (
            <Alert variant="danger" className="mb-0 mt-2" style={{ fontSize: 12 }}>
              ⚠️ No hay caja abierta. Abre una caja primero.
            </Alert>
          )}
          {pagoState && !pagoState.isValid && pagoState.error && (
            <Alert variant="warning" className="mb-0 mt-2" style={{ fontSize: 12 }}>
              {pagoState.error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer className="py-2">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setShowCobro(false)}
            disabled={busyCobrar}
          >
            Cerrar
          </Button>
          <Button
            size="sm"
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
      <Modal show={showCheckout} onHide={handleCloseCheckout} size="md" centered backdrop="static">
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
            {ordenCreada?.codigo ? "¿Cómo desea continuar?" : "📋 Tomar Orden"}
            {!ordenCreada && carrito.length > 0 && (
              <Badge bg="dark">{carrito.length} items</Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {/* Detalle de productos en la orden */}
          {!ordenCreada && carrito.length > 0 && (
            <div className="mb-2 p-2 border rounded-2 bg-light">
              <div className="fw-bold mb-2" style={{ fontSize: 12 }}>
                🛒 Detalle ({carrito.length})
              </div>
              
              <div className="d-flex flex-column gap-1">
                {carrito.map((item, idx) => {
                  // Calcular precio con modificadores
                  const precioBase = Number(item.precio_unitario || 0);
                  const extraMods = (item.opciones || []).reduce(
                    (sum, op) => sum + Number(op.precio_extra || 0),
                    0
                  );
                  const precioConMods = precioBase + extraMods;
                  const subtotalLinea = precioConMods * Number(item.cantidad || 1);
                  
                  return (
                    <div key={idx} className="p-2 border rounded-2 bg-white" style={{ fontSize: 12 }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {item.cantidad}x {item.producto_nombre}
                          </div>
                          {/* Modificadores en la misma línea */}
                          {item.opciones && item.opciones.length > 0 && (
                            <div className="text-muted" style={{ fontSize: 10 }}>
                              + {item.opciones.map((op, i) => (
                                <span key={i}>
                                  {op.nombre}
                                  {op.precio_extra > 0 && ` (+L${Number(op.precio_extra).toFixed(2)})`}
                                  {i < item.opciones.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Notas más compactas */}
                          {item.notas && (
                            <div className="text-muted fst-italic" style={{ fontSize: 10 }}>
                              📝 {item.notas}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-end ms-2">
                          <div className="fw-bold" style={{ fontSize: 12 }}>
                            L {subtotalLinea.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <hr className="my-2" />
              
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold" style={{ fontSize: 12 }}>Subtotal:</span>
                <span className="fw-bold" style={{ fontSize: 14, color: "#198754" }}>
                  L {Number(subtotal || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <CheckoutPanel
            tipo={tipo}
            setTipo={setTipo}
            mesa={mesa}
            setMesa={setMesa}
            notasOrden={notasOrden}
            setNotasOrden={setNotasOrden}
            subtotal={subtotal}
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
