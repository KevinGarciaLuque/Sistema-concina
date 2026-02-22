-- Migración: Agregar campo requiere_cocina a tabla productos
-- Permite marcar productos que NO necesitan pasar por cocina (bebidas, snacks, etc.)

USE cocina_db;

-- 1. Agregar columna requiere_cocina (solo si no existe)
SET @dbname = DATABASE();
SET @tablename = 'productos';
SET @columnname = 'requiere_cocina';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT ''Column already exists'' AS msg;',
  'ALTER TABLE productos ADD COLUMN requiere_cocina TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''Si es 0, el producto pasa directamente a LISTA sin pasar por cocina'' AFTER es_combo;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Desactivar safe update mode temporalmente
SET SQL_SAFE_UPDATES = 0;

-- 3. Actualizar productos típicos que NO requieren cocina
-- Ejemplo: bebidas embotelladas, cervezas, refrescos
-- (Ajustar según los nombres reales de productos en tu base de datos)

UPDATE productos 
SET requiere_cocina = 0
WHERE LOWER(nombre) LIKE '%cerveza%'
   OR LOWER(nombre) LIKE '%refresco%'
   OR LOWER(nombre) LIKE '%agua%'
   OR LOWER(nombre) LIKE '%jugo%'
   OR LOWER(nombre) LIKE '%gaseosa%'
   OR LOWER(nombre) LIKE '%soda%'
   OR LOWER(categoria_id) IN (
      SELECT id FROM categorias WHERE LOWER(nombre) LIKE '%bebida%'
   );

-- 4. Reactivar safe update mode
SET SQL_SAFE_UPDATES = 1;

-- 5. Verificar cambios
SELECT 
  id,
  nombre,
  categoria_id,
  requiere_cocina,
  CASE 
    WHEN requiere_cocina = 0 THEN '⚡ Rápido (sin cocina)'
    ELSE '🍳 Requiere cocina'
  END AS tipo_servicio
FROM productos
ORDER BY requiere_cocina ASC, nombre ASC;

-- ✅ Migración completada
-- Los productos con requiere_cocina = 0 pasarán directamente a estado LISTA
-- cuando se creen órdenes que SOLO contengan estos productos.
