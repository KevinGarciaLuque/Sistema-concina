// backend/middleware/auth.js
import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ ok: false, message: "Sin token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // Debe traer: id, rol_id (ideal)
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

// Aliases para que todos tus routers funcionen igual
export const requireAuth = auth;
export default auth;
