import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const user = await login(usuario, password);

      // ✅ socket join por rol
      socket.connect();
      socket.emit("join", { rol: user.rol });

      // ✅ redirección por rol
      if (user.rol === "cocina") navigate("/cocina");
      else if (user.rol === "cajero") navigate("/pos");
      else navigate("/admin"); // admin / supervisor
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Error al iniciar sesión");
    }
  };

  return (
    <div style={{ minHeight: "100vh" }} className="d-flex align-items-center justify-content-center">
      <div className="card shadow" style={{ width: 380, borderRadius: 16 }}>
        <div className="card-body p-4">
          <h4 className="mb-1">Sistema Cocina</h4>
          <div className="text-muted mb-3">Inicia sesión</div>

          {msg && (
            <div className="alert alert-danger py-2" role="alert">
              {msg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej: admin"
                autoFocus
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button className="btn btn-dark w-100" type="submit">
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
