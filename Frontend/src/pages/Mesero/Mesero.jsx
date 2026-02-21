import { useEffect, useState, useMemo, useRef } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  FaUtensils,
  FaSyncAlt,
  FaPlus,
  FaCheckCircle,
  FaPrint,
} from "react-icons/fa";
import api from "../../api";
import { socket } from "../../socket";
import MesaCard from "./components/MesaCard";
import CrearOrdenModal from "./components/CrearOrdenModal";

// Configuración de mesas (puede venir del backend después)
const MESAS_CONFIG = Array.from({ length: 12 }, (_, i) => ({
  numero: i + 1,
  capacidad: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
}));

export default function Mesero() {
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [showCrearOrden, setShowCrearOrden] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  // Estado para notificación móvil personalizada
  const [notificacionMovil, setNotificacionMovil] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Referencias para tracking de estado anterior y audio
  const ordenesAnterioresRef = useRef([]);
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  const audioIntervalRef = useRef(null); // Para controlar el intervalo del sonido
  const audioContextRef = useRef(null); // Para controlar el contexto de audio
  const oscillatorsRef = useRef([]); // Para guardar referencia a todos los osciladores activos
  const gainNodesRef = useRef([]); // Para guardar referencia a todos los gainNodes activos
  const shouldPlayRef = useRef(false); // Bandera para controlar si debe reproducir

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Solicitar permisos de notificación al montar (solo para desktop)
  useEffect(() => {
    if (!isMobile && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [isMobile]);

  // Función para reproducir sonido de notificación
  const reproducirSonido = () => {
    try {
      // Detener cualquier sonido anterior
      detenerSonido();
      
      // Activar bandera de reproducción
      shouldPlayRef.current = true;
      oscillatorsRef.current = [];
      gainNodesRef.current = [];

      // Crear contexto de audio
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const audioContext = audioContextRef.current;
      
      const playBeep = () => {
        // Solo reproducir si la bandera está activa y el contexto está activo
        if (!shouldPlayRef.current || audioContext.state === 'closed') {
          return;
        }
        
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800; // Frecuencia en Hz
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          // Guardar referencia al oscilador y gainNode
          oscillatorsRef.current.push(oscillator);
          gainNodesRef.current.push(gainNode);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          
          // Limpiar referencias cuando termine
          oscillator.onended = () => {
            const oscIndex = oscillatorsRef.current.indexOf(oscillator);
            if (oscIndex > -1) {
              oscillatorsRef.current.splice(oscIndex, 1);
            }
            const gainIndex = gainNodesRef.current.indexOf(gainNode);
            if (gainIndex > -1) {
              gainNodesRef.current.splice(gainIndex, 1);
            }
          };
        } catch (e) {
          console.error("Error en playBeep:", e);
        }
      };

      // Reproducir el primer beep inmediatamente
      playBeep();

      // Reproducir el sonido cada 1 segundo durante 10 segundos
      let count = 1;
      audioIntervalRef.current = setInterval(() => {
        if (!shouldPlayRef.current) {
          clearInterval(audioIntervalRef.current);
          audioIntervalRef.current = null;
          return;
        }
        
        playBeep();
        count++;
        
        if (count >= 10) {
          clearInterval(audioIntervalRef.current);
          audioIntervalRef.current = null;
          shouldPlayRef.current = false;
          // Cerrar el contexto de audio después de terminar
          setTimeout(() => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close();
              audioContextRef.current = null;
            }
          }, 500);
        }
      }, 1000);

      // Limpiar después de 10 segundos
      audioTimeoutRef.current = setTimeout(() => {
        shouldPlayRef.current = false;
        if (audioIntervalRef.current) {
          clearInterval(audioIntervalRef.current);
          audioIntervalRef.current = null;
        }
        // Cerrar el contexto de audio
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      }, 10500);
    } catch (error) {
      console.error("Error al reproducir sonido:", error);
      shouldPlayRef.current = false;
    }
  };

  // Función para detener el sonido manualmente
  const detenerSonido = () => {
    // Desactivar bandera inmediatamente para evitar nuevos beeps
    shouldPlayRef.current = false;
    
    // PRIMERO: Silenciar todos los gainNodes INMEDIATAMENTE antes de hacer cualquier otra cosa
    if (gainNodesRef.current && gainNodesRef.current.length > 0) {
      gainNodesRef.current.forEach(gainNode => {
        try {
          // Silenciar inmediatamente el volumen a 0
          const currentTime = gainNode.context.currentTime;
          gainNode.gain.cancelScheduledValues(currentTime);
          gainNode.gain.setValueAtTime(0, currentTime);
          // Desconectar el gainNode inmediatamente
          gainNode.disconnect();
        } catch (e) {
          // Ignorar errores
        }
      });
      gainNodesRef.current = [];
    }
    
    // SEGUNDO: Detener todos los osciladores activos
    if (oscillatorsRef.current && oscillatorsRef.current.length > 0) {
      oscillatorsRef.current.forEach(oscillator => {
        try {
          // Intentar detener inmediatamente
          oscillator.stop(0);
          oscillator.disconnect();
        } catch (e) {
          try {
            // Si falla, intentar sin parámetro
            oscillator.stop();
            oscillator.disconnect();
          } catch (e2) {
            // Ignorar errores si el oscilador ya terminó
          }
        }
      });
      oscillatorsRef.current = [];
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Limpiar intervalos y timeouts
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    
    // Cerrar el contexto de audio para detener todo
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          // Suspender primero para detener todo procesamiento
          audioContextRef.current.suspend().then(() => {
            if (audioContextRef.current) {
              audioContextRef.current.close();
            }
          }).catch(() => {
            // Si falla suspend, cerrar directamente
            if (audioContextRef.current) {
              audioContextRef.current.close();
            }
          });
        }
        audioContextRef.current = null;
      } catch (e) {
        console.error("Error cerrando AudioContext:", e);
        audioContextRef.current = null;
      }
    }
  };

  // Mostrar notificación (personalizada en móvil, nativa en desktop)
  const mostrarNotificacion = (orden) => {
    // En móvil: usar notificación personalizada con slide-down
    if (isMobile) {
      setNotificacionMovil({
        titulo: "🍽️ Orden Lista",
        mensaje: `Mesa ${orden.mesa || "—"}: La orden ${orden.codigo} está lista para entregar`,
        ordenId: orden.id,
        timestamp: Date.now()
      });
      
      // Ocultar después de 10 segundos (duración del sonido) y detener el sonido
      setTimeout(() => {
        setNotificacionMovil(null);
        detenerSonido();
      }, 10000);
      
      return;
    }
    
    // En desktop: usar notificaciones del navegador
    if ("Notification" in window && Notification.permission === "granted") {
      let notificationInterval = null;
      let notificationRef = null;
      
      const crearNotificacion = () => {
        // Cerrar notificación anterior si existe
        if (notificationRef) {
          notificationRef.close();
        }
        
        notificationRef = new Notification("🍽️ Orden Lista", {
          body: `Mesa ${orden.mesa || "—"}: La orden ${orden.codigo} está lista para entregar`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `orden-${orden.id}`,
          requireInteraction: true,
        });

        notificationRef.onclick = () => {
          detenerSonido(); // Detener el sonido INMEDIATAMENTE
          window.focus();
          if (notificationInterval) {
            clearInterval(notificationInterval);
          }
          notificationRef.close();
        };
      };
      
      // Crear la primera notificación
      crearNotificacion();
      
      // Recrear la notificación cada 3 segundos para mantenerla visible durante 10 segundos
      let count = 0;
      notificationInterval = setInterval(() => {
        count++;
        if (count >= 3) { // 3 recreaciones = ~9-10 segundos total
          clearInterval(notificationInterval);
        } else {
          crearNotificacion();
        }
      }, 3000);
    }
  };

  // Detectar cuando órdenes cambian a LISTA
  useEffect(() => {
    if (ordenesAnterioresRef.current.length === 0) {
      ordenesAnterioresRef.current = ordenes;
      return;
    }

    // Buscar órdenes que cambiaron a LISTA
    ordenes.forEach((ordenActual) => {
      const ordenAnterior = ordenesAnterioresRef.current.find(o => o.id === ordenActual.id);
      
      // Si la orden existe y cambió a LISTA
      if (ordenAnterior && 
          ordenAnterior.estado !== "LISTA" && 
          ordenActual.estado === "LISTA" &&
          ordenActual.tipo === "MESA") {
        
        // Reproducir sonido
        reproducirSonido();
        
        // Mostrar notificación
        mostrarNotificacion(ordenActual);
        
        // Mostrar mensaje en la UI
        setMsg({
          type: "success",
          text: `🔔 Orden ${ordenActual.codigo} de Mesa ${ordenActual.mesa} está LISTA`,
        });

        // Limpiar mensaje después de 10 segundos (duración del sonido)
        setTimeout(() => setMsg({ type: "", text: "" }), 10000);
      }
    });

    // Actualizar el ref con las órdenes actuales
    ordenesAnterioresRef.current = ordenes;
  }, [ordenes]);

  // Cleanup: limpiar audio cuando el componente se desmonte
  useEffect(() => {
    return () => {
      detenerSonido();
    };
  }, []);

  // Cargar órdenes activas (solo las que NO han sido cobradas/facturadas)
  const loadOrdenes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ordenes", {
        params: { 
          // ✅ Incluir TODAS las órdenes (incluso ENTREGADA) que NO estén facturadas
          // La mesa se libera SOLO cuando se cobra, no cuando se entrega
          sin_facturar: 1  // ✅ Excluir órdenes ya cobradas/facturadas
        },
      });
      // Asegurar que siempre sea un array
      const ordenesData = data?.data || data?.rows || data || [];
      // Filtrar solo las órdenes que NO estén ANULADAS (las anuladas no deben aparecer)
      const ordenesFiltradas = Array.isArray(ordenesData) 
        ? ordenesData.filter(o => o.estado !== "ANULADA")
        : [];
      setOrdenes(ordenesFiltradas);
    } catch (e) {
      console.error("❌ Error cargando órdenes:", e);
      setOrdenes([]); // Asegurar array vacío en error
      setMsg({
        type: "danger",
        text: "Error al cargar órdenes activas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdenes();
    
    // Obtener datos del usuario desde localStorage (donde los guarda AuthContext)
    const userDataStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    
    if (!userData?.rol) return;
    
    // Función para unirse al room
    const joinRoom = () => {
      socket.emit("join", { rol: userData.rol, userId: userData.id });
    };
    
    // Verificar conexión del socket
    if (!socket) return;
    
    if (!socket.connected) {
      socket.connect();
      socket.once("connect", joinRoom);
    } else {
      joinRoom();
    }
  }, []);

  // Realtime updates
  useEffect(() => {
    if (!socket?.on) return;

    const onUpdate = () => {
      loadOrdenes();
    };
    
    socket.on("ordenes:update", onUpdate);
    socket.on("cocina:update", onUpdate);
    socket.on("caja:update", onUpdate); // ✅ Actualizar cuando se cobra/factura

    return () => {
      try {
        socket.off("ordenes:update", onUpdate);
        socket.off("cocina:update", onUpdate);
        socket.off("caja:update", onUpdate);
      } catch {}
    };
  }, []);

  // Agrupar mesas con sus órdenes
  const mesasConEstado = useMemo(() => {
    // Asegurar que ordenes sea un array
    const ordenesArray = Array.isArray(ordenes) ? ordenes : [];
    
    return MESAS_CONFIG.map((mesa) => {
      const ordenesEnMesa = ordenesArray.filter(
        (o) => o.tipo === "MESA" && String(o.mesa) === String(mesa.numero)
      );
      return {
        ...mesa,
        ordenes: ordenesEnMesa,
        ocupada: ordenesEnMesa.length > 0,
      };
    });
  }, [ordenes]);

  const handleAbrirCrearOrden = (mesa) => {
    setMesaSeleccionada(mesa);
    setShowCrearOrden(true);
  };

  const handleOrdenCreada = async () => {
    setShowCrearOrden(false);
    setMesaSeleccionada(null);
    
    // Pequeño delay para asegurar que la transacción se complete
    setTimeout(() => {
      loadOrdenes();
    }, 300);
    
    setMsg({
      type: "success",
      text: "✅ Orden creada y enviada a cocina exitosamente.",
    });
  };

  const mesasOcupadas = mesasConEstado.filter((m) => m.ocupada).length;
  const mesasLibres = mesasConEstado.filter((m) => !m.ocupada).length;

  return (
    <>
      {/* Notificación móvil personalizada (slide-down desde arriba) */}
      {notificacionMovil && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideDown 0.4s ease-out',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            detenerSonido(); // Detener el sonido INMEDIATAMENTE
            setNotificacionMovil(null);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                fontSize: 32,
                lineHeight: 1
              }}
            >
              🍽️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {notificacionMovil.titulo}
              </div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>
                {notificacionMovil.mensaje}
              </div>
            </div>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              ×
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animación */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

    <Container fluid className="py-3">
      {/* Header */}
      <Row className="align-items-center g-2 mb-3">
        <Col>
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                background: "rgba(13,110,253,.15)",
              }}
            >
              <FaUtensils />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                Módulo Mesero
                <Badge bg="primary" className="ms-2">
                  MESAS
                </Badge>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Gestión de mesas y órdenes
              </div>
            </div>
          </div>
        </Col>

        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={loadOrdenes}
            className="d-inline-flex align-items-center gap-2"
            disabled={loading}
          >
            <FaSyncAlt className={loading ? "fa-spin" : ""} />
            Actualizar
          </Button>
        </Col>
      </Row>

      {/* Estadísticas */}
      <Card className="shadow-sm border-0 rounded-4 mb-3">
        <Card.Body className="py-3">
          <Row className="g-2">
            <Col md={3}>
              <div className="text-muted small">Total mesas</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>
                {MESAS_CONFIG.length}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Ocupadas</div>
              <div className="fw-bold text-danger" style={{ fontSize: 20 }}>
                {mesasOcupadas}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Libres</div>
              <div className="fw-bold text-success" style={{ fontSize: 20 }}>
                {mesasLibres}
              </div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">Órdenes activas</div>
              <div className="fw-bold text-primary" style={{ fontSize: 20 }}>
                {Array.isArray(ordenes) ? ordenes.length : 0}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {msg.text ? (
        <Alert
          variant={msg.type}
          dismissible
          onClose={() => setMsg({ type: "", text: "" })}
        >
          {msg.text}
        </Alert>
      ) : null}

      {/* Grid de mesas */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2 text-muted">Cargando mesas...</div>
        </div>
      ) : (
        <Row className="g-3">
          {mesasConEstado.map((mesa) => (
            <Col key={mesa.numero} xs={12} sm={6} md={4} lg={3}>
              <MesaCard
                mesa={mesa}
                onCrearOrden={handleAbrirCrearOrden}
                onVerDetalle={(orden) => {
                  // Funcionalidad futura si es necesario
                }}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Modal crear orden */}
      <CrearOrdenModal
        show={showCrearOrden}
        onHide={() => {
          setShowCrearOrden(false);
          setMesaSeleccionada(null);
        }}
        mesa={mesaSeleccionada}
        onOrdenCreada={handleOrdenCreada}
      />
    </Container>
    </>
  );
}
