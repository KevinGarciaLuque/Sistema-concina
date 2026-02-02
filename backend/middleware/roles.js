// middleware/roles.js
export function allowRoles(...roles) {
    return (req, res, next) => {
      if (!req.user?.rol) return res.status(403).json({ msg: "Sin rol" });
      if (!roles.includes(req.user.rol)) return res.status(403).json({ msg: "No autorizado" });
      next();
    };
  }
  