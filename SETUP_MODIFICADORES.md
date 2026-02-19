# Configuración Modificadores - Frontend + Backend

## El Problema

Cuando agregas un producto al carrito en POS, aparece el mensaje:

> "Este producto no tiene modificadores. Presiona "Confirmar" para agregarlo al carrito."

Esto sucede porque falta **crear las tablas de soporte** y **vincular modificadores a productos**.

## Estructura de Tablas Necesarias

### 1. `modificadores`

```sql
CREATE TABLE IF NOT EXISTS modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  requerido TINYINT DEFAULT 0,      -- 1=obligatorio, 0=opcional
  multiple TINYINT DEFAULT 0,         -- 1=puedes elegir varios, 0=una sola opción
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_activo (activo)
);
```

### 2. `modificador_opciones`

```sql
CREATE TABLE IF NOT EXISTS modificador_opciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modificador_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  precio_extra DECIMAL(10, 2) DEFAULT 0.00,  -- costo adicional
  activo TINYINT DEFAULT 1,
  orden INT DEFAULT 0,                        -- para ordenar en UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (modificador_id) REFERENCES modificadores(id) ON DELETE CASCADE,
  INDEX idx_modificador (modificador_id),
  INDEX idx_activo (activo)
);
```

### 3. `producto_modificadores` ⭐ **LA MÁS IMPORTANTE**

```sql
CREATE TABLE IF NOT EXISTS producto_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  modificador_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_prod_mod (producto_id, modificador_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (modificador_id) REFERENCES modificadores(id) ON DELETE CASCADE,
  INDEX idx_producto (producto_id),
  INDEX idx_modificador (modificador_id)
);
```

## Pasos a Seguir

### 1. Crear las tablas

Ejecuta en tu gestor MySQL:

```sql
-- Archivo: backend/migrations/003_create_modificadores_tables.sql
```

### 2. Crear modificadores

Opción A: Vía frontend en `/admin` > "Administración" > pestaña "Modificadores"

- Click "Nuevo"
- Nombre: "Bebida" (obligatorio, única opción)
- Click "Guardar"

Opción B: SQL directo

```sql
INSERT INTO modificadores (nombre, requerido, multiple, activo) VALUES
('Bebida', 1, 0, 1),
('Acompañamiento', 1, 0, 1),
('Extras', 0, 1, 1),
('Queso', 0, 1, 1),
('Salsa', 0, 1, 1);
```

### 3. Agregar opciones a cada modificador

Ejemplo para "Bebida":

```sql
INSERT INTO modificador_opciones (modificador_id, nombre, precio_extra, activo, orden)
VALUES
  (1, 'Agua natural', 0, 1, 1),
  (1, 'Refresco', 15.00, 1, 2),
  (1, 'Jugo', 20.00, 1, 3);
```

O en frontend:

- Ve a `/admin` > "Administración" > pestaña "Modificadores"
- Click en "Editar" en any modificador
- Dentro del modal, busca la sección de opciones
- Click "Agregar opción", llena nombre y precio extra

### 4. **CRÍTICO: Asignar modificadores a productos**

Sin este paso, el POS dirá "Este producto no tiene modificadores".

```sql
-- Primero obtén los IDs de tus productos
SELECT id, nombre FROM productos LIMIT 5;

-- Luego asigna modificadores (ejemplo: producto_id = 1 tiene modificador_id = 1)
INSERT INTO producto_modificadores (producto_id, modificador_id)
VALUES
  (1, 1),  -- Producto 1 tiene el modificador "Bebida"
  (1, 2),  -- Producto 1 también tiene "Acompañamiento"
  (1, 3),  -- Producto 1 también tiene "Extras"
  (2, 1),  -- Producto 2 solo tiene "Bebida"
  (2, 4);  -- Producto 2 también tiene "Queso"
```

## Flujo en POS

1. **Abrimos POS** (`/pos`)
2. **Click en "Agregar"** de un producto
3. Se abre modal `ModalModificadores.jsx`
4. Se llama a `/api/modificadores/por-producto/{producto.id}`
5. Backend devuelve modificadores + sus opciones activas
6. Si el array está vacío → "Este producto no tiene modificadores"
7. Si hay datos → Se muestran los modificadores para elegir

## Debugging

Si aún no muestra modificadores:

**1. Verifica que tienes datos:**

```sql
SELECT * FROM modificadores WHERE activo = 1;
SELECT * FROM modificador_opciones WHERE activo = 1;
SELECT * FROM producto_modificadores WHERE producto_id = 1;
```

**2. Prueba la API directamente:**

```bash
# Desde Postman / Thunder Client
GET http://localhost:4000/api/modificadores/por-producto/1
Authorization: Bearer <TU_TOKEN>
```

**3. Revisa la consola del navegador**

- F12 > Network
- Click "Agregar" en un producto
- Busca `/modificadores/por-producto/X`
- Verifica status 200 y respuesta JSON

## Estructura Completa de la API

### GET `/api/modificadores`

Lista todos los modificadores activos

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "nombre": "Bebida",
      "requerido": 1,
      "multiple": 0,
      "opciones_count": 3
    }
  ]
}
```

### GET `/api/modificadores/por-producto/:productoId`

Devuelve modificadores + opciones asignados a un producto

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "nombre": "Bebida",
      "requerido": 1,
      "multiple": 0,
      "opciones": [
        { "id": 1, "nombre": "Agua", "precio_extra": 0 },
        { "id": 2, "nombre": "Refresco", "precio_extra": 15 }
      ]
    }
  ]
}
```

### POST `/api/modificadores/:id/opciones`

Crear opciones para un modificador

```json
{
  "nombre": "Agua natural",
  "precio_extra": 0,
  "activo": 1
}
```

## Checklist Final

- [x] Tablas creadas
- [ ] Modificadores creados (mínimo 2-3)
- [ ] Opciones agregadas a cada modificador
- [ ] Productos vinculados a modificadores en `producto_modificadores`
- [ ] Productos importados en `/admin` > "Administración" > "Asignación"?
- [ ] Backend ejecutando: `npm run dev` en /backend
- [ ] Frontend ejecutando: `npm run dev` en /Frontend
- [ ] Agregar producto al carrito en POS y verificar que aparezcan los modificadores
