# Diagrama: Cómo Funcionan los Modificadores

## Relación de Tablas

```
┌─────────────┐
│ productos   │
├─────────────┤
│ id (PK)     │   ┌──────────────────────┐
│ nombre      │   │ producto_modificadores
│ precio      │   │ ├──────────────────┤
│ ...         │◄─────│ id (PK)            │
└─────────────┘   │ producto_id (FK) ─┐
                  │ modificador_id (FK)├─────┐
                  │ ...                │     │
                  └──────────────────┘     │
                                           │
                  ┌─────────────────┐      │
                  │ modificadores   │      │
                  ├─────────────────┤      │
                  │ id (PK)         │◄─────┘
                  │ nombre          │
                  │ requerido       │ ─────────────┐
                  │ multiple        │              │
                  │ activo          │              │
                  │ ...             │              │
                  └─────────────────┘              │
                                                  │
                  ┌──────────────────────┐        │
                  │ modificador_opciones │        │
                  ├──────────────────────┤        │
                  │ id (PK)              │        │
                  │ modificador_id (FK)  │◄───────┘
                  │ nombre               │
                  │ precio_extra         │
                  │ activo               │
                  │ orden                │
                  │ ...                  │
                  └──────────────────────┘
```

## Flujo de Datos en POS

```
┌────────────────────┐
│  Usuario en POS    │
│  Click "Agregar"   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────────┐
│ Pos.jsx                            │
│ - abrirModificadoresParaProducto() │
└─────────┬────────────────────────────┘
          │
          ├─► GET /api/modificadores/por-producto/{id}
          │
          ▼
┌────────────────────────────────┐
│ Backend (modificadores.js)     │
│ router.get("/por-producto/:id")│
│                                │
│ 1. Consulta producto_modificadores
│    WHERE producto_id = ?       │
│ 2. Obtiene IDs de modificadores│
│ 3. Consulta modificador_opciones
│    WHERE modificador_id IN (...) AND activo=1
│ 4. Devuelve JSON              │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Response JSON                    │
│ {                                │
│   "ok": true,                    │
│   "data": [                      │
│     {                            │
│       "id": 1,                   │
│       "nombre": "Bebida",        │
│       "requerido": 1,            │
│       "multiple": 0,             │
│       "opciones": [              │
│         {                        │
│           "id": 1,               │
│           "nombre": "Agua",      │
│           "precio_extra": 0      │
│         },                       │
│         {                        │
│           "id": 2,               │
│           "nombre": "Refresco",  │
│           "precio_extra": 15     │
│         }                        │
│       ]                          │
│     }                            │
│   ]                              │
│ }                                │
└─────────┬────────────────────────┘
          │
          ▼
┌────────────────────────────────────┐
│ ModalModificadores.jsx             │
│ - Renderiza modificadores          │
│ - Usuario elige opciones           │
│ - Click "Confirmar"               │
└─────────┬────────────────────────────┘
          │
          ▼
┌────────────────────────────────────┐
│ Carrito                            │
│ items: [                           │
│   {                                │
│     producto_id: 1,                │
│     opciones: [                    │
│       { opcion_id: 2,              │
│         precio_extra: 15 }         │
│     ]                              │
│   }                                │
│ ]                                  │
└────────────────────────────────────┘
```

## Ejemplo Real: Burger + Bebida

### Tablas

**productos**

```
id | nombre      | precio
───┼─────────────┼──────
1  | Hamburguesa | 100
2  | Sandwich    | 80
```

**modificadores**

```
id | nombre       | requerido | multiple
───┼──────────────┼───────────┼──────────
1  | Bebida       | 1         | 0       (obligatorio, una sola)
2  | Acompañamiento | 1       | 0
3  | Salsa        | 0         | 1       (opcional, múltiple)
```

**modificador_opciones**

```
id | modificador_id | nombre           | precio_extra
───┼────────────────┼──────────────────┼──────────────
1  | 1              | Agua             | 0
2  | 1              | Refresco         | 15
3  | 1              | Jugo             | 20
4  | 2              | Papas fritas     | 0
5  | 2              | Ensalada         | 25
6  | 3              | Mayonesa         | 0
7  | 3              | BBQ              | 5
8  | 3              | Picante          | 5
```

**producto_modificadores**

```
id | producto_id | modificador_id
───┼─────────────┼────────────────
1  | 1           | 1            ← Hamburguesa tiene Bebida
2  | 1           | 2            ← Hamburguesa tiene Acompañamiento
3  | 1           | 3            ← Hamburguesa tiene Salsa
4  | 2           | 1            ← Sandwich tiene Bebida
5  | 2           | 3            ← Sandwich tiene Salsa
```

### En POS

1. Click "Agregar" en Hamburguesa
2. Se llama: `GET /api/modificadores/por-producto/1`
3. Backend devuelve:

   ```json
   {
     "data": [
       {
         "id": 1,
         "nombre": "Bebida",
         "requerido": 1, // Obligatorio
         "multiple": 0, // Una sola
         "opciones": [
           { "id": 1, "nombre": "Agua", "precio_extra": 0 },
           { "id": 2, "nombre": "Refresco", "precio_extra": 15 },
           { "id": 3, "nombre": "Jugo", "precio_extra": 20 }
         ]
       },
       {
         "id": 2,
         "nombre": "Acompañamiento",
         "requerido": 1,
         "multiple": 0,
         "opciones": [
           { "id": 4, "nombre": "Papas fritas", "precio_extra": 0 },
           { "id": 5, "nombre": "Ensalada", "precio_extra": 25 }
         ]
       },
       {
         "id": 3,
         "nombre": "Salsa",
         "requerido": 0, // Opcional
         "multiple": 1, // Múltiples
         "opciones": [
           { "id": 6, "nombre": "Mayonesa", "precio_extra": 0 },
           { "id": 7, "nombre": "BBQ", "precio_extra": 5 },
           { "id": 8, "nombre": "Picante", "precio_extra": 5 }
         ]
       }
     ]
   }
   ```

4. Usuario selecciona:
   - Bebida → Refresco (+15)
   - Acompañamiento → Papas (+0)
   - Salsa → BBQ (+5) y Picante (+5)
   - **Total extras: 25**
   - **Precio final: 100 + 25 = 125**

## Checklist Antes de Probar

- [ ] Tabla `producto_modificadores` creada
- [ ] Tabla `modificador_opciones` creada
- [ ] Tabla `modificadores` creada
- [ ] Al menos un modificador con activo=1
- [ ] Al menos una opción por modificador con activo=1
- [ ] Al menos un producto vinculado en `producto_modificadores`
- [ ] Backend corriendo: `npm run dev`
- [ ] Frontend corriendo: `npm run dev`

Si alguno falla, ve al archivo **FIX_MODIFICADORES_PASO_A_PASO.md** para instrucciones detalladas.
