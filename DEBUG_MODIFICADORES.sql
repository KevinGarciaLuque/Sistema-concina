-- DEBUG: Verificar qué productos tienen modificadores asignados

-- 1. Ver TODOS los productos
SELECT id, nombre, activo FROM productos ORDER BY id LIMIT 20;

-- 2. Ver qué productos TIENEN modificadores  
SELECT DISTINCT p.id, p.nombre, COUNT(pm.producto_id) as mods_asignados
FROM productos p
LEFT JOIN producto_modificadores pm ON p.id = pm.producto_id
GROUP BY p.id, p.nombre
ORDER BY mods_asignados DESC;

-- 3. Ver el detalle de asignaciones
SELECT 
  p.id as producto_id,
  p.nombre as producto,
  m.id as mod_id,
  m.nombre as modificador,
  COUNT(DISTINCT mo.id) as opciones_count
FROM producto_modificadores pm
INNER JOIN productos p ON p.id = pm.producto_id
INNER JOIN modificadores m ON m.id = pm.modificador_id
LEFT JOIN modificador_opciones mo ON m.id = mo.modificador_id AND mo.activo = 1
GROUP BY p.id, p.nombre, m.id, m.nombre
ORDER BY p.id;

-- 4. Ver qué productos estás mostrando en POS (en_menu = 1)
SELECT id, nombre, en_menu, activo FROM productos WHERE en_menu = 1 ORDER BY id;

-- 5. Detectar productos en POS que NO TIENEN modificadores
SELECT DISTINCT p.id, p.nombre
FROM productos p
WHERE p.activo = 1 AND p.en_menu = 1
AND p.id NOT IN (SELECT DISTINCT producto_id FROM producto_modificadores);
