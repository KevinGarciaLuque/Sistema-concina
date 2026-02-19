# Ejecutar migraciones para soporte de ISV 18% (bebidas alcohólicas)

## Migraciones a ejecutar:

### 1. Agregar campo tasa_impuesto a productos
```sql
-- Archivo: backend/migrations/005_add_tasa_impuesto_productos.sql

ALTER TABLE productos 
ADD COLUMN tasa_impuesto DECIMAL(5,2) DEFAULT 15.00 
COMMENT 'Tasa de impuesto ISV: 15.00 o 18.00';

UPDATE productos SET tasa_impuesto = 15.00 WHERE tasa_impuesto IS NULL;
```

### 2. Agregar campo tasa_impuesto a orden_detalle
```sql
-- Archivo: backend/migrations/006_add_tasa_impuesto_orden_detalle.sql

ALTER TABLE orden_detalle 
ADD COLUMN tasa_impuesto DECIMAL(5,2) DEFAULT 15.00 
COMMENT 'Tasa de impuesto ISV del producto: 15.00 o 18.00';

UPDATE orden_detalle SET tasa_impuesto = 15.00 WHERE tasa_impuesto IS NULL;
```

### 3. Marcar productos con ISV 18% (bebidas alcohólicas)
```sql
-- Ejecuta según tus productos. Ejemplo:

UPDATE productos SET tasa_impuesto = 18.00 
WHERE nombre LIKE '%cerveza%' 
   OR nombre LIKE '%vino%' 
   OR nombre LIKE '%ron%'
   OR nombre LIKE '%whisky%'
   OR nombre LIKE '%vodka%'
   OR nombre LIKE '%tequila%';

-- O si tienes una categoría específica:
UPDATE productos SET tasa_impuesto = 18.00 
WHERE categoria_id = (SELECT id FROM categorias WHERE nombre = 'Bebidas Alcohólicas');
```

## Instrucciones:

1. **Conectarse a MySQL:**
   ```bash
   mysql -u root -p nombre_base_datos
   ```

2. **Ejecutar las migraciones:**
   ```bash
   SOURCE backend/migrations/005_add_tasa_impuesto_productos.sql;
   SOURCE backend/migrations/006_add_tasa_impuesto_orden_detalle.sql;
   ```

3. **Actualizar productos alcohólicos:**
   Ejecuta el UPDATE según tus productos específicos.

4. **Reiniciar el backend:**
   ```bash
   cd backend
   node server.js
   ```

## Verificación:

```sql
-- Ver productos y sus tasas
SELECT id, nombre, precio, tasa_impuesto FROM productos;

-- Ver si hay productos con 18%
SELECT COUNT(*) as total_18 FROM productos WHERE tasa_impuesto = 18.00;
```

## Notas:
- Los productos nuevos tendrán 15% por defecto
- Puedes cambiar la tasa desde el admin de productos (necesitarás agregar el campo en el formulario)
- Las facturas antiguas mostrarán 15% en todo (por compatibilidad)
