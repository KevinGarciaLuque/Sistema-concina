# Items Rápidos - Módulo Mesero

## Problema
El mesero necesita poder agregar items que NO requieren preparación en cocina (ejemplo: bebidas frías, cervezas, refrescos embotellados) directamente a una mesa sin que la orden tenga que pasar por el módulo de cocina.

## Solución Propuesta

### 1. Nueva propiedad en productos: `requiere_cocina`
Agregar un campo booleano en la tabla `productos`:
- `requiere_cocina` (TINYINT DEFAULT 1): Indica si el producto debe pasar por cocina

**Migración SQL:**
```sql
ALTER TABLE productos 
ADD COLUMN requiere_cocina TINYINT(1) DEFAULT 1 COMMENT 'Si es 0, el item pasa directamente a LISTA sin cocina';
```

### 2. Modificar flujo de creación de órdenes

**Backend (`routes/ordenes.js`):**
Cuando se crea una orden, verificar si TODOS los items tienen `requiere_cocina = 0`:
- Si SÍ → Estado inicial: `LISTA` (saltar cocina)
- Si NO → Estado inicial: `NUEVA` (flujo normal a cocina)

**Frontend (Mesero):**
Al mostrar el catálogo de productos, indicar visualmente cuáles son items rápidos con un badge especial:
```jsx
{producto.requiere_cocina === 0 && (
  <Badge bg="info" className="ms-1">⚡ Rápido</Badge>
)}
```

### 3. Configuración en Admin

En `ProductosAdmin.jsx`, agregar un switch para configurar `requiere_cocina`:
```jsx
<Form.Check
  type="switch"
  label="Requiere Cocina"
  checked={form.requiere_cocina === 1}
  onChange={(e) => setForm(prev => ({ 
    ...prev, 
    requiere_cocina: e.target.checked ? 1 : 0 
  }))}
/>
```

## Flujos de Ejemplo

### Escenario 1: Mesa 5 pide solo bebidas (2 cervezas)
1. Mesero agrega 2 cervezas (`requiere_cocina = 0`)
2. Al crear la orden → Estado: `LISTA` automáticamente
3. Mesero puede entregarlas y cobrar inmediatamente
4. NO aparece en el módulo de cocina

### Escenario 2: Mesa 7 pide comida + bebidas (hamburguesa + 1 cerveza)
1. Mesero agrega hamburguesa (`requiere_cocina = 1`) y cerveza (`requiere_cocina = 0`)
2. Al crear la orden → Estado: `NUEVA` (porque hay al menos 1 item que requiere cocina)
3. La orden completa va a cocina
4. Cocina prepara todo y marca como LISTA

### Escenario 3: Agregar bebida a orden existente
**Opción A (Recomendada):** 
- Permitir al mesero crear una segunda orden para la misma mesa con solo las bebidas
- Esta segunda orden irá directamente a LISTA

**Opción B (Compleja):**
- Permitir agregar items a órdenes existentes
- Re-evaluar si la orden debe volver a cocina o no

## Beneficios
- ⚡ Mayor velocidad de servicio para items simples
- 🍺 Bebidas se pueden entregar inmediatamente
- 📊 Reduce carga en el módulo de cocina
- 💰 El mesero puede cobrar órdenes simples más rápido

## Productos Típicos sin Cocina
- Refrescos embotellados
- Cervezas
- Aguas embotelladas
- Jugos envasados
- Snacks pre-empaquetados

## Implementación por Fases

### Fase 1 (Inmediata): ✅ Completado
- Limpiar módulo Órdenes (Monitor) - solo visualización

### Fase 2 (Recomendada):
1. Agregar columna `requiere_cocina` a tabla productos
2. Actualizar formulario de productos en Admin
3. Modificar lógica de creación de órdenes en backend
4. Agregar indicador visual en Mesero

### Fase 3 (Opcional):
- Permitir agregar items a órdenes existentes
- Gestión de órdenes "híbridas" (items con/sin cocina en misma orden)
