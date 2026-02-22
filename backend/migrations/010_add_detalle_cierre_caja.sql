-- Migración: Agregar campo detalle_cierre a caja_sesiones
-- Permite almacenar el desglose completo del cierre de caja
-- Fecha: 2026-02-22

ALTER TABLE caja_sesiones
ADD COLUMN detalle_cierre JSON DEFAULT NULL COMMENT 'Desglose de cierre: denominaciones, métodos de pago, observaciones'
AFTER monto_cierre;
