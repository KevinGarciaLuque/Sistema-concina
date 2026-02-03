import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import categoriasRoutes from "./routes/categorias.js";
import productosRoutes from "./routes/productos.js";
import modificadoresRoutes from "./routes/modificadores.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Si luego usas uploads locales:
app.use("/uploads", express.static("uploads"));
app.use("/api/categorias", categoriasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/modificadores", modificadoresRoutes);

const server = http.createServer(app);

// ✅ socket server
export const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  // El frontend le manda el rol y lo mete a un "room"
  socket.on("join", ({ rol }) => {
    if (!rol) return;

    if (rol === "cocina") socket.join("cocina");
    if (rol === "cajero" || rol === "admin" || rol === "supervisor") socket.join("caja");

    // opcional: confirmación
    socket.emit("joined", { rooms: Array.from(socket.rooms) });
  });

  socket.on("disconnect", () => {});
});

// Rutas
app.use("/api/auth", authRoutes);

// health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend en http://localhost:${PORT}`));
