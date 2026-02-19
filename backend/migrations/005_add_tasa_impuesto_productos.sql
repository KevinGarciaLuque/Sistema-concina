-- Agregar campo tasa_impuesto a productos para soportar ISV 15% y 18%
-- 15: productos normales
-- 18: bebidas alcohólicas

ALTER TABLE productos 
ADD COLUMN tasa_impuesto DECIMAL(5,2) DEFAULT 15.00 
COMMENT 'Tasa de impuesto ISV: 15.00 o 18.00';

-- Actualizar productos existentes a 15% por defecto
UPDATE productos SET tasa_impuesto = 15.00 WHERE tasa_impuesto IS NULL;

-- Ejemplo: Si ya tienes productos de bebidas alcohólicas, actualízalos:
-- UPDATE productos SET tasa_impuesto = 18.00 WHERE nombre LIKE '%cerveza%' OR nombre LIKE '%vino%' OR nombre LIKE '%ron%';
