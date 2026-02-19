-- Agregar campo tasa_impuesto a orden_detalle para calcular ISV por tasa

ALTER TABLE orden_detalle 
ADD COLUMN tasa_impuesto DECIMAL(5,2) DEFAULT 15.00 
COMMENT 'Tasa de impuesto ISV del producto: 15.00 o 18.00';

-- Actualizar órdenes existentes a 15% por defecto
UPDATE orden_detalle SET tasa_impuesto = 15.00 WHERE tasa_impuesto IS NULL;
