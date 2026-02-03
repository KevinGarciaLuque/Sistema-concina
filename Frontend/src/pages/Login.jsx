import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";
import api from "../api"; // si aún no lo usas, igual déjalo (para recuperar contraseña)

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(true);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Recuperación
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const disabledLogin = useMemo(
    () => !usuario.trim() || !password.trim() || loading,
    [usuario, password, loading],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const user = await login(usuario.trim(), password);

      // ✅ socket join por rol
      try {
        if (!socket.connected) socket.connect();
        socket.emit("join", { rol: user.rol });
      } catch {}

      // ✅ Recordarme: si NO, lo dejamos solo en sesión
      // (Tu AuthContext probablemente guarda en localStorage; aquí lo respetamos si existe)
      if (!recordarme) {
        // Si tu AuthContext guarda token/user en localStorage, lo movemos a sessionStorage
        // para que se borre al cerrar el navegador.
        const token = localStorage.getItem("token");
        const userLS = localStorage.getItem("user");
        if (token) {
          sessionStorage.setItem("token", token);
          localStorage.removeItem("token");
        }
        if (userLS) {
          sessionStorage.setItem("user", userLS);
          localStorage.removeItem("user");
        }
      }

      // ✅ redirección por rol
      if (user.rol === "cocina") navigate("/cocina");
      else if (user.rol === "cajero") navigate("/pos");
      else navigate("/admin"); // admin / supervisor
    } catch (err) {
      setMsg(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          "Credenciales inválidas",
      );
    } finally {
      setLoading(false);
    }
  };

  const abrirReset = () => {
    setResetEmail("");
    setResetMsg("");
    setShowReset(true);
  };

  const enviarReset = async (e) => {
    e.preventDefault();
    setResetMsg("");
    setResetLoading(true);

    // ✅ Estándar profesional: no confirmamos si existe o no el correo (seguridad),
    // siempre mostramos el mismo mensaje.
    const mensajeOK =
      "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.";

    try {
      // 🔌 Cuando tengas tu endpoint real, aquí se llama.
      // Ejemplo recomendado:
      // await api.post("/auth/recuperar", { email: resetEmail.trim() });

      // Por ahora lo dejamos como "simulación" para que tengas UI completa:
      await new Promise((r) => setTimeout(r, 700));

      setResetMsg(mensajeOK);
    } catch (err) {
      // Aun si falla, mostramos el mensaje estándar para no filtrar info
      setResetMsg(mensajeOK);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3">
      <div
        className="card border-0 shadow-sm"
        style={{ width: 420, borderRadius: 18 }}
      >
        <div className="card-body p-4 p-md-5">
          {/* Header */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <h3 className="mb-0 fw-bold">Sistema Cocina</h3>
              <span className="badge text-bg-dark rounded-pill px-3 py-2">
                Acceso
              </span>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: 14 }}>
              Inicia sesión para continuar
            </div>
          </div>

          {/* Error */}
          {msg && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {msg}
            </div>
          )}

          {/* Form */}
          <Form onSubmit={handleSubmit} className="d-grid gap-3">
            <Form.Group>
              <Form.Label className="fw-semibold">Usuario</Form.Label>
              <Form.Control
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej: admin"
                autoFocus
                autoComplete="username"
                style={{ borderRadius: 12, padding: "12px 14px" }}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="fw-semibold">Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ borderRadius: 12, padding: "12px 14px" }}
              />
            </Form.Group>

            <div className="d-flex align-items-center justify-content-between">
              <Form.Check
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
                label={
                  <span className="text-muted" style={{ fontSize: 14 }}>
                    Recordarme
                  </span>
                }
              />

              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                onClick={abrirReset}
                style={{ fontSize: 14 }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              variant="dark"
              type="submit"
              className="w-100 fw-bold"
              disabled={disabledLogin}
              style={{ borderRadius: 12, padding: "12px 14px" }}
            >
              {loading ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <Spinner size="sm" /> Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="text-center text-muted" style={{ fontSize: 12 }}>
              © {new Date().getFullYear()} Sistema Cocina
            </div>
          </Form>
        </div>
      </div>

      {/* Modal Recuperación */}
      <Modal show={showReset} onHide={() => setShowReset(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Recuperar contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted mb-3" style={{ fontSize: 14 }}>
            Ingresa tu correo. Si está registrado, te enviaremos un enlace para
            restablecer tu contraseña.
          </div>

          {resetMsg && (
            <div className="alert alert-success py-2" role="alert">
              {resetMsg}
            </div>
          )}

          <Form onSubmit={enviarReset} className="d-grid gap-2">
            <Form.Group>
              <Form.Label className="fw-semibold">Correo</Form.Label>
              <Form.Control
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="correo@dominio.com"
                autoComplete="email"
                style={{ borderRadius: 12, padding: "12px 14px" }}
                required
              />
            </Form.Group>

            <Button
              variant="dark"
              type="submit"
              className="w-100 fw-bold"
              disabled={!resetEmail.trim() || resetLoading}
              style={{ borderRadius: 12, padding: "12px 14px" }}
            >
              {resetLoading ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <Spinner size="sm" /> Enviando...
                </span>
              ) : (
                "Enviar enlace"
              )}
            </Button>

            <Button
              variant="outline-secondary"
              type="button"
              className="w-100"
              onClick={() => setShowReset(false)}
              style={{ borderRadius: 12, padding: "12px 14px" }}
            >
              Volver
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
