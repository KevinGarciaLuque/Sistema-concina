// backend/routes/pos.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const round2 = (v) => Math.round(num(v) * 100) / 100;

const padLeft = (v, len) => String(v ?? "").padStart(len, "0");
const onlyDigits = (v) => String(v ?? "").replace(/\D/g, "");

// Helpers para socket.io
function getIO(req) {
  try {
    return req.app.get("io") || null;
  } catch {
    return null;
  }
}

function emitOrden(req, payload) {
  const io = getIO(req);
  if (!io) return;
  io.to("cocina").emit("ordenes:update", { ts: Date.now(), ...payload });
  io.to("caja").emit("ordenes:update", { ts: Date.now(), ...payload });
  io.emit("ordenes:update", { ts: Date.now(), ...payload });
}

/**
 * Formato fiscal:
 *   establecimiento(3)-punto_emision(3)-tipo_documento(2)-correlativo(8)
 * Ej: 000-000-00-00000001
 */
function buildNumeroFactura(caiRow, correlativo) {
  const est = padLeft(onlyDigits(caiRow.establecimiento).slice(0, 3), 3);
  const pto = padLeft(onlyDigits(caiRow.punto_emision).slice(0, 3), 3);
  const tipo = padLeft(onlyDigits(caiRow.tipo_documento).slice(0, 2), 2);
  const cor = padLeft(onlyDigits(correlativo).slice(0, 8), 8);
  return `${est}-${pto}-${tipo}-${cor}`;
}

// POST /api/pos/cobrar
router.post("/cobrar", async (req, res) => {
  const {
    orden_id,
    caja_sesion_id,

    // ⚠️ Con CAI: ya NO exigimos numero_factura desde frontend
    // numero_factura,

    // Para cobro real debe ser 0.
    // Las COPIAS se hacen reimprimiendo la misma factura, no creando otra.
    es_copia = 0,

    cliente_nombre = null,
    cliente_rtn = null,
    cliente_telefono = null,
    cliente_direccion = null,

    subtotal,
    descuento = 0,
    impuesto = 0,
    total,

    pagos = [],
  } = req.body || {};

  if (!orden_id)
    return res.status(400).json({ ok: false, message: "Falta orden_id" });
  if (!caja_sesion_id)
    return res.status(400).json({ ok: false, message: "Falta caja_sesion_id" });

  // ⚠️ Para evitar consumir CAI creando “copias” como facturas nuevas
  if (Number(es_copia) === 1) {
    return res.status(400).json({
      ok: false,
      message:
        "Para imprimir COPIA no se crea otra factura. Debes reimprimir la misma factura existente.",
    });
  }

  if (!Array.isArray(pagos) || pagos.length === 0) {
    return res
      .status(400)
      .json({ ok: false, message: "Debes enviar al menos un pago" });
  }

  const subtotal2 = round2(subtotal);
  const descuento2 = round2(descuento);
  const impuesto2 = round2(impuesto);
  const total2 = round2(total);

  const sumaPagos = round2(pagos.reduce((acc, p) => acc + num(p.monto), 0));
  if (sumaPagos !== total2) {
    return res.status(400).json({
      ok: false,
      message: `La suma de pagos (${sumaPagos.toFixed(
        2,
      )}) debe ser igual al total (${total2.toFixed(2)}).`,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) validar caja abierta
    const [[ses]] = await conn.query(
      "SELECT id, estado FROM caja_sesiones WHERE id=? LIMIT 1",
      [caja_sesion_id],
    );
    if (!ses) {
      await conn.rollback();
      return res
        .status(400)
        .json({ ok: false, message: "caja_sesion_id no existe" });
    }
    const estCaja = String(ses.estado || "").toUpperCase();
    if (estCaja && estCaja !== "ABIERTA") {
      await conn.rollback();
      return res
        .status(400)
        .json({ ok: false, message: "La caja no está ABIERTA" });
    }

    // 2) validar orden
    const [[orden]] = await conn.query(
      "SELECT id, estado FROM ordenes WHERE id=? FOR UPDATE",
      [orden_id],
    );
    if (!orden) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Orden no existe" });
    }
    const estadoOrden = String(orden.estado || "").toUpperCase();
    if (estadoOrden === "ANULADA") {
      await conn.rollback();
      return res
        .status(400)
        .json({ ok: false, message: "No se puede cobrar una orden ANULADA" });
    }

    // 3) evitar doble factura por orden
    const [[ya]] = await conn.query(
      "SELECT id, numero_factura FROM facturas WHERE orden_id=? LIMIT 1",
      [orden_id],
    );
    if (ya) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        message: `Esta orden ya tiene factura: ${ya.numero_factura}`,
      });
    }

    // 4) CAI activo (bloqueado para no duplicar correlativo)
    const [[cai]] = await conn.query(
      `SELECT
         id, cai_codigo, establecimiento, punto_emision, tipo_documento,
         rango_desde, rango_hasta, correlativo_actual, fecha_limite, activo
       FROM cai
       WHERE activo=1
       LIMIT 1
       FOR UPDATE`,
    );

    if (!cai) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: "No hay CAI activo. Configura y activa un CAI para facturar.",
      });
    }

    // validar fecha límite (si hoy > fecha_limite => bloquea)
    // Comparamos las fechas en formato DATE en MySQL
    const [[fechaCheck]] = await conn.query(
      "SELECT CURDATE() > DATE(?) AS vencido, DATE(?) AS limite_formateado",
      [cai.fecha_limite, cai.fecha_limite]
    );
    
    if (Number(fechaCheck?.vencido) === 1) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: `CAI vencido. Fecha límite: ${fechaCheck?.limite_formateado || cai.fecha_limite}`,
      });
    }

    const rangoDesde = Number(cai.rango_desde || 0);
    const rangoHasta = Number(cai.rango_hasta || 0);
    const actual = Number(cai.correlativo_actual || 0);

    // correlativo siguiente
    const next = actual + 1;

    if (next < rangoDesde) {
      // si el actual está en 0, lo normal es arrancar en rango_desde-1 para que next=rango_desde
      // pero por si se guardó mal:
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message:
          `Correlativo fuera de rango. Ajusta correlativo_actual para iniciar correctamente. ` +
          `rango_desde=${rangoDesde}, correlativo_actual=${actual}`,
      });
    }

    if (next > rangoHasta) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: "CAI sin stock. Ya se alcanzó el rango final.",
      });
    }

    const numero_factura = buildNumeroFactura(cai, next);

    // 5) actualizar correlativo del CAI (atómico)
    await conn.query("UPDATE cai SET correlativo_actual=? WHERE id=?", [
      next,
      cai.id,
    ]);

    // 6) insertar factura (con snapshot CAI)
    const [insFac] = await conn.query(
      `INSERT INTO facturas
        (orden_id, caja_sesion_id, cai_id, cai_codigo, cai_fecha_limite, cai_rango_desde, cai_rango_hasta,
         numero_factura, es_copia,
         cliente_nombre, cliente_rtn, cliente_telefono, cliente_direccion,
         subtotal, descuento, impuesto, total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orden_id,
        caja_sesion_id,
        cai.id,
        cai.cai_codigo,
        cai.fecha_limite,
        cai.rango_desde,
        cai.rango_hasta,
        numero_factura,
        0, // es_copia: en cobro siempre 0
        cliente_nombre,
        cliente_rtn,
        cliente_telefono,
        cliente_direccion,
        subtotal2,
        descuento2,
        impuesto2,
        total2,
      ],
    );

    const facturaId = insFac.insertId;

    // 7) insertar pagos
    for (const p of pagos) {
      const metodo = String(p.metodo || "EFECTIVO").toUpperCase();
      if (!["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"].includes(metodo)) {
        await conn.rollback();
        return res
          .status(400)
          .json({ ok: false, message: `Método inválido: ${metodo}` });
      }

      await conn.query(
        `INSERT INTO pagos
          (factura_id, metodo, monto, referencia, efectivo_recibido, cambio)
         VALUES (?,?,?,?,?,?)`,
        [
          facturaId,
          metodo,
          round2(p.monto),
          p.referencia ?? null,
          p.efectivo_recibido ?? null,
          p.cambio ?? null,
        ],
      );
    }

    await conn.commit();

    // Emitir evento de actualización para que se actualicen las vistas en tiempo real
    emitOrden(req, { orden_id, factura_id: facturaId, evento: "cobrada" });

    return res.json({
      ok: true,
      data: { factura_id: facturaId, orden_id, numero_factura },
    });
  } catch (e) {
    await conn.rollback();
    if (String(e?.code) === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ ok: false, message: "Número de factura duplicado." });
    }
    console.error(e);
    return res
      .status(500)
      .json({ ok: false, message: "Error al cobrar (factura/pagos)" });
  } finally {
    conn.release();
  }
});

export default router;
