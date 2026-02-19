import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// Routes (ESM)
import authRoutes from "./routes/auth.js";
import permisosRoutes from "./routes/permisos.js";
import rolesPermisosRoutes from "./routes/roles_permisos.js";
import meRoutes from "./routes/me.js";

import categoriasRoutes from "./routes/categorias.js";
import productosRoutes from "./routes/productos.js";
import modificadoresRoutes from "./routes/modificadores.js";
import cajaRoutes from "./routes/caja.js";
import ordenesRoutes from "./routes/ordenes.js";
import cocinaRoutes from "./routes/cocina.js";
import facturasRoutes from "./routes/facturas.js";
import reportesRoutes from "./routes/reportes.js";
import rolesRoutes from "./routes/roles.js";
import usuariosRoutes from "./routes/usuarios.js";
import posRoutes from "./routes/pos.js";
import caiRoutes from "./routes/cai.js";
import clientesRoutes from "./routes/clientes.js";
import backupRoutes from "./routes/backup.js";





dotenv.config();

const app = express();
const server = http.createServer(app);

// ====== Helpers (ESM __dirname) ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CORS (recomendado) ======
// En .env puedes poner: FRONTEND_URL=http://localhost:5173
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite Postman / apps sin origin
      if (!origin) return cb(null, true);

      // En dev, puedes permitir todo si quieres:
      if (process.env.CORS_ALLOW_ALL === "1") return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS bloqueado: " + origin));
    },
    credentials: true,
  })
);

// ====== Middlewares ======
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ====== Static uploads ======
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ====== Socket.IO ======
export const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ALLOW_ALL === "1" ? "*" : allowedOrigins,
    credentials: true,
  },
});

// Para que las rutas puedan emitir eventos: req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  // El frontend manda rol y opcional userId
  socket.on("join", ({ rol, userId } = {}) => {
    if (!rol) return;

    // Rooms por rol (ajusta si quieres)
    if (rol === "cocina") socket.join("cocina");
    if (rol === "cajero" || rol === "admin" || rol === "supervisor") socket.join("caja");
    if (rol === "admin" || rol === "supervisor") socket.join("admin");

    // Room por usuario (útil para notificaciones directas)
    if (userId) socket.join(`user:${userId}`);

    socket.emit("joined", { rooms: Array.from(socket.rooms) });
  });

  socket.on("disconnect", () => {});
});

// ====== Routes ======
app.use("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);
app.use("/api/me", meRoutes); 





app.use("/api/categorias", categoriasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/modificadores", modificadoresRoutes);

app.use("/api/clientes", clientesRoutes);

app.use("/api/pos", posRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/cocina", cocinaRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/cai", caiRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/backup", backupRoutes);

// ====== 404 ======
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Ruta no encontrada." });
});

// ====== Error handler ======
app.use((err, req, res, next) => {
  // Si viene de CORS
  if (String(err?.message || "").startsWith("CORS bloqueado")) {
    return res.status(403).json({ ok: false, message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    err.message || "Error interno del servidor";

  // Log server-side (sin exponer stack en prod)
  if (process.env.NODE_ENV !== "test") {
    console.error("❌ ERROR:", err);
  }

  res.status(status).json({
    ok: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

// ====== Start ======
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Backend en http://localhost:${PORT}`);
});

// ====== Graceful shutdown ======
function shutdown(signal) {
  console.log(`\n🛑 ${signal} recibido, cerrando servidor...`);
  server.close(() => {
    try {
      io.close();
    } catch {}
    console.log("✅ Servidor cerrado.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
