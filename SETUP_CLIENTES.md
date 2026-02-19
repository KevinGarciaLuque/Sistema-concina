# Configuración Clientes - Frontend + Backend

## Pasos previos

### 1. Crear la tabla en MySQL

Ejecuta en tu gestor MySQL (DBeaver, MySQL Workbench, etc.):

```sql
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  rtn VARCHAR(20) UNIQUE,
  telefono VARCHAR(20),
  direccion TEXT,
  email VARCHAR(100),
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_rtn (rtn),
  INDEX idx_activo (activo)
);
```

### 2. Crear el permiso en la BD

```sql
INSERT IGNORE INTO permisos (clave, descripcion)
VALUES ('CLIENTES.ADMIN', 'Administrar clientes (crear, editar, eliminar)');

-- Asignar a admin (rol_id=1, ajusta si es diferente)
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 1, id FROM permisos WHERE clave = 'CLIENTES.ADMIN';
```

**Nota:** Si tu tabla de roles tiene IDs diferentes, cambia `rol_id = 1` al ID del rol admin.

### 2. Backend (`backend/routes/clientes.js`)

✅ **Está correcto. Tiene:**

- Middleware de autenticación y autorización
- CRUD completo (GET, POST, PUT, PATCH, DELETE)
- Validación de RTN (13-14 dígitos)
- Manejo de errores (duplicación de RTN, FK constraints)
- Pool compatible con tu estructura

### 3. Frontend (`Frontend/src/pages/admin/ClientesAdmin.jsx`)

✅ **Está correcto. Tiene:**

- Búsqueda por nombre, RTN, dirección
- Filter "Solo activos"
- Modal crear/editar
- Modal confirmar delete
- Toggle activar/desactivar
- Validación de RTN al guardar

### 4. Servidor registrado

✅ En `/backend/server.js` ya está:

```javascript
import clientesRoutes from "./routes/clientes.js";
...
app.use("/api/clientes", clientesRoutes);
```

## Cómo usar

### Backend

```bash
cd backend
npm install
# Asegúrate de tener .env con:
# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
# Asegúrate de tener .env.local o .env con:
# VITE_API_URL=http://localhost:4000
npm run dev
```

## API Endpoints

- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Editar cliente
- `PATCH /api/clientes/:id/estado` - Cambiar estado activo/inactivo
- `DELETE /api/clientes/:id` - Eliminar cliente

## Checklist de Validación

- [ ] Tabla `clientes` creada en MySQL
- [ ] Permiso `CLIENTES.ADMIN` agregado a `permisos`
- [ ] Asignación de permiso al rol admin en `roles_permisos`
- [ ] Backend ejecutando: `npm run dev` en /backend
- [ ] Frontend ejecutando: `npm run dev` en /Frontend
- [ ] Variable de entorno `VITE_API_URL` configurada en Front (si no es localhost:4000)
- [ ] Token JWT almacenado en localStorage o sessionStorage

## Cómo probar

1. Inicia sesión con usuario admin
2. Ve a Administración > Clientes en el menú
3. Click "Nuevo" para crear un cliente
4. Llena nombre (obligatorio), RTN (opcional), teléfono, dirección, email
5. Guarda y verifica que aparezca en la tabla

## Notas

1. **RTN**: Es opcional al crear un cliente, pero si se proporciona debe tener 13-14 dígitos
2. **Permisos**: Se valida en ambos (backend + frontend) con `CLIENTES.ADMIN`
3. **Validación**: Mismo validador RTN en backend y frontend para consistencia
4. **Activar/Desactivar**: Usa el botón toggle sin eliminar datos
5. **Buscar**: Busca por nombre, RTN o dirección automáticamente
