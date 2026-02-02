// routes/ordenes.js
import { Router } from "express";
import db from "../db.js";
import { io } from "../server.js";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const router = Router();

// Crear orden usando SP y luego insertar detalle
router.post("/", auth, allowRoles("cajero","admin"), async (req, res) => {
  const { cliente_nombre, tipo, mesa, notas, items } = req.body;
  // items: [{ producto_id, cantidad, notas, opciones: [{modificador_id, opcion_id, precio_extra, opcion_nombre}] }]

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Crear orden con SP (retorna la orden)
    const [spRes] = await conn.query(
      `CALL sp_crear_orden(?,?,?,?,?)`,
      [cliente_nombre || null, tipo, mesa || null, notas || null, req.user.id]
    );

    // mysql devuelve arrays: spRes[0] suele traer el SELECT final
    const orden = spRes?.[0]?.[0];
    const orden_id = orden.id;

    // 2) Insertar detalle
    for (const it of items) {
      const [[prod]] = await conn.query(`SELECT nombre, precio FROM productos WHERE id=?`, [it.producto_id]);

      const nombreSnap = prod.nombre;
      const precioUnit = Number(prod.precio);
      const cantidad = Number(it.cantidad || 1);

      // total = (precio + extras) * cantidad
      const extrasTotal = (it.opciones || []).reduce((a, o) => a + Number(o.precio_extra || 0), 0);
      const totalLinea = (precioUnit + extrasTotal) * cantidad;

      const [detRes] = await conn.query(
        `INSERT INTO orden_detalle (orden_id, producto_id, producto_nombre, precio_unitario, cantidad, notas, total_linea)
         VALUES (?,?,?,?,?,?,?)`,
        [orden_id, it.producto_id, nombreSnap, precioUnit, cantidad, it.notas || null, totalLinea]
      );

      const orden_detalle_id = detRes.insertId;

      // 3) Insertar opciones seleccionadas
      for (const op of (it.opciones || [])) {
        await conn.query(
          `INSERT INTO orden_detalle_opciones (orden_detalle_id, modificador_id, opcion_id, opcion_nombre, precio_extra)
           VALUES (?,?,?,?,?)`,
          [orden_detalle_id, op.modificador_id, op.opcion_id, op.opcion_nombre, Number(op.precio_extra || 0)]
        );
      }
    }

    await conn.commit();

    // 🔔 Emitir a cocina
    io.to("cocina").emit("order:new", { orden_id });

    res.json({ ok: true, orden_id, orden });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ msg: "Error creando orden", error: String(e) });
  } finally {
    conn.release();
  }
});

export default router;
