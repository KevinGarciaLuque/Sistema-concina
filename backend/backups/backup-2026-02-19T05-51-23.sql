/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: bitacora
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bitacora` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `accion` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` bigint DEFAULT NULL,
  `detalle` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bitacora_created_at` (`created_at`),
  KEY `fk_bitacora_usuario` (`usuario_id`),
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 154 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: cai
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `cai` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cai_codigo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `establecimiento` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `punto_emision` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rango_desde` int NOT NULL,
  `rango_hasta` int NOT NULL,
  `correlativo_actual` int NOT NULL DEFAULT '0',
  `fecha_limite` date NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cai_codigo` (`cai_codigo`),
  CONSTRAINT `cai_chk_1` CHECK ((`rango_desde` <= `rango_hasta`))
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: caja_sesiones
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `caja_sesiones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `fecha_apertura` date NOT NULL,
  `monto_apertura` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `estado` enum('ABIERTA', 'CERRADA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ABIERTA',
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_cierre` decimal(10, 2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caja_estado` (`estado`),
  KEY `fk_caja_usuario` (`usuario_id`),
  CONSTRAINT `fk_caja_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: categorias
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: clientes
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rtn` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_rtn` (`rtn`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: facturas
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `facturas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orden_id` bigint NOT NULL,
  `caja_sesion_id` bigint DEFAULT NULL,
  `cai_id` int DEFAULT NULL,
  `cai_codigo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cai_fecha_limite` date DEFAULT NULL,
  `cai_rango_desde` int DEFAULT NULL,
  `cai_rango_hasta` int DEFAULT NULL,
  `numero_factura` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `es_copia` tinyint(1) NOT NULL DEFAULT '0',
  `cliente_nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_rtn` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `impuesto` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `total` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_factura_numero` (`numero_factura`),
  KEY `idx_facturas_created_at` (`created_at`),
  KEY `fk_factura_orden` (`orden_id`),
  KEY `fk_factura_caja` (`caja_sesion_id`),
  KEY `fk_facturas_cai` (`cai_id`),
  CONSTRAINT `fk_factura_caja` FOREIGN KEY (`caja_sesion_id`) REFERENCES `caja_sesiones` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_factura_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_facturas_cai` FOREIGN KEY (`cai_id`) REFERENCES `cai` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 23 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: modificador_opciones
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `modificador_opciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `modificador_id` int NOT NULL,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio_extra` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_opciones_modificador` (`modificador_id`),
  CONSTRAINT `fk_opciones_modificador` FOREIGN KEY (`modificador_id`) REFERENCES `modificadores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: modificadores
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `modificadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requerido` tinyint(1) NOT NULL DEFAULT '0',
  `multiple` tinyint(1) NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_modificador_nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: orden_correlativo
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orden_correlativo` (
  `fecha` date NOT NULL,
  `ultimo_numero` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fecha`),
  UNIQUE KEY `uq_orden_correlativo_fecha` (`fecha`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: orden_detalle
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orden_detalle` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orden_id` bigint NOT NULL,
  `producto_id` int NOT NULL,
  `producto_nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio_unitario` decimal(10, 2) NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `notas` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_linea` decimal(10, 2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tasa_impuesto` decimal(5, 2) DEFAULT '15.00' COMMENT 'Tasa de impuesto ISV del producto: 15.00 o 18.00',
  PRIMARY KEY (`id`),
  KEY `idx_detalle_orden` (`orden_id`),
  KEY `fk_detalle_producto` (`producto_id`),
  CONSTRAINT `fk_detalle_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 40 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: orden_detalle_opciones
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orden_detalle_opciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orden_detalle_id` bigint NOT NULL,
  `modificador_id` int NOT NULL,
  `opcion_id` int NOT NULL,
  `opcion_nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio_extra` decimal(10, 2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_odo_detalle` (`orden_detalle_id`),
  KEY `fk_odo_modificador` (`modificador_id`),
  KEY `fk_odo_opcion` (`opcion_id`),
  CONSTRAINT `fk_odo_detalle` FOREIGN KEY (`orden_detalle_id`) REFERENCES `orden_detalle` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_odo_modificador` FOREIGN KEY (`modificador_id`) REFERENCES `modificadores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_odo_opcion` FOREIGN KEY (`opcion_id`) REFERENCES `modificador_opciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 26 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: orden_estados_historial
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orden_estados_historial` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orden_id` bigint NOT NULL,
  `estado` enum(
  'NUEVA',
  'EN_PREPARACION',
  'LISTA',
  'ENTREGADA',
  'ANULADA'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cambiado_por` int DEFAULT NULL,
  `comentario` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_historial_orden` (`orden_id`),
  KEY `fk_historial_usuario` (`cambiado_por`),
  CONSTRAINT `fk_historial_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`cambiado_por`) REFERENCES `usuarios` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 101 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: ordenes
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ordenes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `numero_dia` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('MESA', 'LLEVAR', 'DELIVERY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LLEVAR',
  `mesa` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum(
  'NUEVA',
  'EN_PREPARACION',
  'LISTA',
  'ENTREGADA',
  'ANULADA'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NUEVA',
  `notas` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `asignado_cocina_por` int DEFAULT NULL,
  `subtotal` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `impuesto` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `total` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orden_codigo` (`codigo`),
  UNIQUE KEY `uq_orden_fecha_numero` (`fecha`, `numero_dia`),
  KEY `idx_orden_estado` (`estado`),
  KEY `idx_orden_created_at` (`created_at`),
  KEY `fk_orden_creado_por` (`creado_por`),
  KEY `fk_orden_asignado_cocina` (`asignado_cocina_por`),
  CONSTRAINT `fk_orden_asignado_cocina` FOREIGN KEY (`asignado_cocina_por`) REFERENCES `usuarios` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orden_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 53 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: pagos
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pagos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `factura_id` bigint NOT NULL,
  `metodo` enum('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EFECTIVO',
  `monto` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `referencia` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `efectivo_recibido` decimal(10, 2) DEFAULT NULL,
  `cambio` decimal(10, 2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pagos_factura` (`factura_id`),
  CONSTRAINT `fk_pago_factura` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 27 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: permisos
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`),
  KEY `idx_permisos_modulo` (`modulo`)
) ENGINE = InnoDB AUTO_INCREMENT = 27 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: producto_modificadores
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `producto_modificadores` (
  `producto_id` int NOT NULL,
  `modificador_id` int NOT NULL,
  PRIMARY KEY (`producto_id`, `modificador_id`),
  KEY `fk_pm_modificador` (`modificador_id`),
  CONSTRAINT `fk_pm_modificador` FOREIGN KEY (`modificador_id`) REFERENCES `modificadores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pm_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: productos
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoria_id` int NOT NULL,
  `nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` decimal(10, 2) NOT NULL DEFAULT '0.00',
  `imagen_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imagen_public_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `es_combo` tinyint(1) NOT NULL DEFAULT '0',
  `en_menu` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `tasa_impuesto` decimal(5, 2) DEFAULT '15.00' COMMENT 'Tasa de impuesto ISV: 15.00 o 18.00',
  PRIMARY KEY (`id`),
  KEY `idx_productos_categoria` (`categoria_id`),
  CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: roles
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 9 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: roles_permisos
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles_permisos` (
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rol_id`, `permiso_id`),
  KEY `fk_roles_permisos_perm` (`permiso_id`),
  CONSTRAINT `fk_roles_permisos_perm` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_roles_permisos_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: usuarios
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  KEY `fk_usuarios_roles` (`rol_id`),
  CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: bitacora
# ------------------------------------------------------------

INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    'CREAR',
    'usuarios',
    2,
    'Usuario creado: kevin (Kevin Garcia)',
    '::1',
    '2026-02-16 21:51:44'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    2,
    1,
    'ACTUALIZAR',
    'usuarios',
    2,
    'Usuario actualizado: kevin (Kevin Garcia)',
    '::1',
    '2026-02-16 21:51:55'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    3,
    1,
    'ACTUALIZAR',
    'usuarios',
    2,
    'Usuario DESACTIVADO',
    '::1',
    '2026-02-16 21:52:03'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    4,
    1,
    'ACTUALIZAR',
    'usuarios',
    2,
    'Usuario ACTIVADO',
    '::1',
    '2026-02-16 21:52:04'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    5,
    1,
    'CREAR',
    'ordenes',
    2,
    'Orden ORD-20260217-0001 creada. Total: L 105.00',
    '::1',
    '2026-02-17 21:35:29'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    6,
    1,
    'ACTUALIZAR',
    'ordenes',
    2,
    'Estado ORD-20260217-0001: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-17 21:36:05'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    7,
    1,
    'ACTUALIZAR',
    'ordenes',
    2,
    'Estado ORD-20260217-0001: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-17 21:36:19'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    8,
    1,
    'ACTUALIZAR',
    'ordenes',
    2,
    'Estado ORD-20260217-0001: LISTA -> ENTREGADA',
    '::1',
    '2026-02-17 21:36:59'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    9,
    1,
    'CREAR',
    'caja_sesiones',
    1,
    'Caja ABIERTA. Apertura: L 500.00',
    '::1',
    '2026-02-17 21:37:33'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    10,
    1,
    'CREAR',
    'categorias',
    2,
    'Categoría creada: Pollo chuco',
    '::1',
    '2026-02-17 21:39:05'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    11,
    1,
    'CREAR',
    'productos',
    2,
    'Producto creado: Pechuga con tajadas (L 120.00)',
    '::1',
    '2026-02-17 21:40:39'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    12,
    1,
    'ACTUALIZAR',
    'productos',
    2,
    'Imagen actualizada',
    '::1',
    '2026-02-17 21:40:39'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    13,
    1,
    'CREAR',
    'modificadores',
    1,
    'Modificador creado: Queso extra',
    '::1',
    '2026-02-17 21:41:49'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    14,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    1,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-17 21:42:17'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    15,
    1,
    'CREAR',
    'ordenes',
    3,
    'Orden ORD-20260217-0002 creada. Total: L 120.00',
    '::1',
    '2026-02-17 21:45:09'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    16,
    1,
    'ACTUALIZAR',
    'ordenes',
    3,
    'Estado ORD-20260217-0002: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-17 21:45:24'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    17,
    1,
    'ACTUALIZAR',
    'ordenes',
    3,
    'Estado ORD-20260217-0002: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-17 21:45:32'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    18,
    1,
    'ACTUALIZAR',
    'ordenes',
    3,
    'Estado ORD-20260217-0002: LISTA -> ENTREGADA',
    '::1',
    '2026-02-17 21:45:54'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    19,
    1,
    'ACTUALIZAR',
    'ordenes',
    1,
    'Estado 20260202-001: LISTA -> EN_PREPARACION',
    '::1',
    '2026-02-17 21:47:20'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    20,
    1,
    'ACTUALIZAR',
    'ordenes',
    1,
    'Estado 20260202-001: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-17 21:47:22'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    21,
    1,
    'ACTUALIZAR',
    'caja_sesiones',
    1,
    'Caja CERRADA. Cierre: L 0.00',
    '::1',
    '2026-02-17 21:55:05'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    22,
    1,
    'CREAR',
    'ordenes',
    4,
    'Orden ORD-20260218-0003 creada. Total: L 120.00',
    '::1',
    '2026-02-18 11:07:41'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    23,
    1,
    'CREAR',
    'caja_sesiones',
    2,
    'Caja ABIERTA. Apertura: L 500.00',
    '::1',
    '2026-02-18 11:08:21'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    24,
    1,
    'ACTUALIZAR',
    'ordenes',
    4,
    'Estado ORD-20260218-0003: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 11:08:34'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    25,
    1,
    'ACTUALIZAR',
    'ordenes',
    4,
    'Estado ORD-20260218-0003: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 11:08:35'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    26,
    1,
    'ACTUALIZAR',
    'ordenes',
    4,
    'Estado ORD-20260218-0003: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 11:08:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    27,
    1,
    'CREAR',
    'ordenes',
    5,
    'Orden ORD-20260218-0004 creada. Total: L 120.00',
    '::1',
    '2026-02-18 11:09:10'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    28,
    1,
    'ACTUALIZAR',
    'productos',
    2,
    'Producto actualizado: Pechuga con tajadas',
    '::1',
    '2026-02-18 11:10:34'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    29,
    1,
    'ACTUALIZAR',
    'productos',
    2,
    'Producto actualizado: Pechuga con tajadas',
    '::1',
    '2026-02-18 11:10:35'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    30,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    1,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 11:10:57'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    31,
    1,
    'CREAR',
    'ordenes',
    6,
    'Orden ORD-20260218-0005 creada. Total: L 90.00',
    '::1',
    '2026-02-18 11:12:04'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    32,
    1,
    'ACTUALIZAR',
    'ordenes',
    5,
    'Estado ORD-20260218-0004: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 11:14:49'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    33,
    1,
    'ACTUALIZAR',
    'ordenes',
    5,
    'Estado ORD-20260218-0004: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 11:15:00'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    34,
    1,
    'CREAR',
    'ordenes',
    7,
    'Orden ORD-20260218-0006 creada. Total: L 120.00',
    '::1',
    '2026-02-18 11:15:56'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    35,
    1,
    'ACTUALIZAR',
    'ordenes',
    7,
    'Estado ORD-20260218-0006: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 11:46:43'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    36,
    1,
    'ACTUALIZAR',
    'ordenes',
    6,
    'Estado ORD-20260218-0005: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 11:46:45'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    37,
    1,
    'ACTUALIZAR',
    'ordenes',
    6,
    'Estado ORD-20260218-0005: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 11:46:48'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    38,
    1,
    'ACTUALIZAR',
    'ordenes',
    7,
    'Estado ORD-20260218-0006: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 11:46:49'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    39,
    1,
    'ACTUALIZAR',
    'ordenes',
    5,
    'Estado ORD-20260218-0004: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 11:47:02'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    40,
    1,
    'ACTUALIZAR',
    'ordenes',
    6,
    'Estado ORD-20260218-0005: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 11:47:03'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    41,
    1,
    'ACTUALIZAR',
    'ordenes',
    7,
    'Estado ORD-20260218-0006: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 11:47:04'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    42,
    1,
    'ACTUALIZAR',
    'caja_sesiones',
    2,
    'Caja CERRADA. Cierre: L 0.00',
    '::1',
    '2026-02-18 14:27:37'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    43,
    1,
    'CREAR',
    'modificadores',
    2,
    'Modificador creado: Bebida',
    '::1',
    '2026-02-18 14:47:08'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    44,
    1,
    'CREAR',
    'modificadores',
    3,
    'Modificador creado: Salsa',
    '::1',
    '2026-02-18 14:47:28'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    45,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 14:53:27'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    46,
    1,
    'ACTUALIZAR',
    'modificadores',
    2,
    'Modificador DESACTIVADO',
    '::1',
    '2026-02-18 14:54:21'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    47,
    1,
    'ACTUALIZAR',
    'modificadores',
    2,
    'Modificador ACTIVADO',
    '::1',
    '2026-02-18 14:54:23'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    48,
    1,
    'ACTUALIZAR',
    'productos',
    2,
    'Producto actualizado: Pechuga con tajadas',
    '::1',
    '2026-02-18 14:54:34'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    49,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 14:55:10'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    50,
    1,
    'ACTUALIZAR',
    'productos',
    2,
    'Producto actualizado: Pechuga con tajadas',
    '::1',
    '2026-02-18 15:01:30'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    51,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:01:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    52,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:04:23'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    53,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:05:23'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    54,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:05:26'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    55,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:06:09'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    56,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:10:08'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    57,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    1,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:10:40'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    58,
    1,
    'CREAR',
    'ordenes',
    8,
    'Orden ORD-20260218-0007 creada. Total: L 120.00',
    '::1',
    '2026-02-18 15:11:15'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    59,
    1,
    'CREAR',
    'caja_sesiones',
    3,
    'Caja ABIERTA. Apertura: L 200.00',
    '::1',
    '2026-02-18 15:11:30'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    60,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:11:47'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    61,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 15:15:29'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    62,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    1,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 16:03:41'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    63,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 16:04:20'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    64,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (0)',
    '::1',
    '2026-02-18 16:14:49'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    65,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    2,
    'Modificadores actualizados (2)',
    '::1',
    '2026-02-18 16:23:31'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    66,
    1,
    'ACTUALIZAR',
    'modificadores',
    2,
    'Modificador actualizado: Bebida',
    '::1',
    '2026-02-18 16:24:17'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    67,
    1,
    'ACTUALIZAR',
    'modificadores',
    3,
    'Modificador actualizado: Salsa',
    '::1',
    '2026-02-18 16:24:33'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    68,
    1,
    'ACTUALIZAR',
    'modificadores',
    2,
    'Modificador actualizado: Bebida',
    '::1',
    '2026-02-18 16:24:50'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    69,
    1,
    'CREAR',
    'modificadores',
    4,
    'Modificador creado: Ensalada de repollo',
    '::1',
    '2026-02-18 16:29:56'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    70,
    1,
    'ACTUALIZAR',
    'modificadores',
    4,
    'Modificador actualizado: Ensalada de repollo',
    '::1',
    '2026-02-18 17:10:21'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    71,
    1,
    'CREAR',
    'modificador_opciones',
    4,
    'Opción creada: repollo',
    '::1',
    '2026-02-18 17:10:41'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    72,
    1,
    'CREAR',
    'modificador_opciones',
    5,
    'Opción creada: cebolla',
    '::1',
    '2026-02-18 17:10:53'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    73,
    1,
    'ACTUALIZAR',
    'modificadores',
    4,
    'Modificador actualizado: Ensalada de repollo',
    '::1',
    '2026-02-18 17:10:56'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    74,
    1,
    'ACTUALIZAR',
    'producto_modificadores',
    1,
    'Modificadores actualizados (1)',
    '::1',
    '2026-02-18 17:11:39'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    75,
    1,
    'ACTUALIZAR',
    'modificador_opciones',
    5,
    'Opción actualizada: Especias y Limon',
    '::1',
    '2026-02-18 17:13:11'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    76,
    1,
    'ACTUALIZAR',
    'modificador_opciones',
    4,
    'Opción actualizada: Con salsa Ranchs',
    '::1',
    '2026-02-18 17:13:26'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    77,
    1,
    'ACTUALIZAR',
    'modificador_opciones',
    5,
    'Opción actualizada: Especias y Limon',
    '::1',
    '2026-02-18 17:13:38'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    78,
    1,
    'ACTUALIZAR',
    'modificador_opciones',
    4,
    'Opción actualizada: Con salsa Ranchs',
    '::1',
    '2026-02-18 17:13:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    79,
    1,
    'ACTUALIZAR',
    'modificador_opciones',
    4,
    'Opción actualizada: Con salsa Ranchs',
    '::1',
    '2026-02-18 17:13:47'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    80,
    1,
    'CREAR',
    'ordenes',
    9,
    'Orden ORD-20260218-0008 creada. Total: L 105.00',
    '::1',
    '2026-02-18 17:14:28'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    81,
    1,
    'CREAR',
    'ordenes',
    10,
    'Orden ORD-20260218-0009 creada. Total: L 105.00',
    '::1',
    '2026-02-18 17:19:35'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    82,
    1,
    'CREAR',
    'ordenes',
    11,
    'Orden ORD-20260218-0010 creada. Total: L 105.00',
    '::1',
    '2026-02-18 17:24:27'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    83,
    1,
    'CREAR',
    'ordenes',
    12,
    'Orden ORD-20260218-0011 creada. Total: L 100.00',
    '::1',
    '2026-02-18 17:27:13'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    84,
    1,
    'CREAR',
    'ordenes',
    13,
    'Orden ORD-20260218-0012 creada. Total: L 100.00',
    '::1',
    '2026-02-18 17:30:27'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    85,
    1,
    'CREAR',
    'ordenes',
    14,
    'Orden ORD-20260218-0013 creada. Total: L 105.00',
    '::1',
    '2026-02-18 17:34:01'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    86,
    1,
    'CREAR',
    'ordenes',
    15,
    'Orden ORD-20260218-0014 creada. Total: L 105.00',
    '::1',
    '2026-02-18 17:47:55'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    87,
    1,
    'ACTUALIZAR',
    'modificadores',
    1,
    'Modificador actualizado: Queso extra',
    '::1',
    '2026-02-18 17:49:24'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    88,
    1,
    'CREAR',
    'modificador_opciones',
    6,
    'Opción creada: Queso Chedar',
    '::1',
    '2026-02-18 17:49:33'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    89,
    1,
    'CREAR',
    'ordenes',
    16,
    'Orden ORD-20260218-0015 creada. Total: L 130.00',
    '::1',
    '2026-02-18 17:50:36'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    90,
    1,
    'ACTUALIZAR',
    'caja_sesiones',
    3,
    'Caja CERRADA. Cierre: L 450.00',
    '::1',
    '2026-02-18 17:51:48'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    91,
    1,
    'CREAR',
    'caja_sesiones',
    4,
    'Caja ABIERTA. Apertura: L 500.00',
    '::1',
    '2026-02-18 17:52:22'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    92,
    1,
    'CREAR',
    'ordenes',
    17,
    'Orden ORD-20260218-0016 creada. Total: L 90.00',
    '::1',
    '2026-02-18 17:52:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    93,
    1,
    'CREAR',
    'ordenes',
    18,
    'Orden ORD-20260218-0017 creada. Total: L 210.00',
    '::1',
    '2026-02-18 17:58:43'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    94,
    1,
    'CREAR',
    'ordenes',
    19,
    'Orden ORD-20260218-0001 creada. Total: L 105.00',
    '::1',
    '2026-02-18 18:01:33'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    95,
    1,
    'CREAR',
    'ordenes',
    20,
    'Orden ORD-20260218-0002 creada. Total: L 90.00',
    '::1',
    '2026-02-18 18:02:29'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    96,
    1,
    'ACTUALIZAR',
    'ordenes',
    19,
    'Estado ORD-20260218-0001: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:23:46'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    97,
    1,
    'ACTUALIZAR',
    'ordenes',
    18,
    'Estado ORD-20260218-0017: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:17'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    98,
    1,
    'ACTUALIZAR',
    'ordenes',
    8,
    'Estado ORD-20260218-0007: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:18'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    99,
    1,
    'ACTUALIZAR',
    'ordenes',
    10,
    'Estado ORD-20260218-0009: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:20'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    100,
    1,
    'ACTUALIZAR',
    'ordenes',
    11,
    'Estado ORD-20260218-0010: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:21'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    101,
    1,
    'ACTUALIZAR',
    'ordenes',
    9,
    'Estado ORD-20260218-0008: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:22'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    102,
    1,
    'ACTUALIZAR',
    'ordenes',
    12,
    'Estado ORD-20260218-0011: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:23'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    103,
    1,
    'ACTUALIZAR',
    'ordenes',
    13,
    'Estado ORD-20260218-0012: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:23'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    104,
    1,
    'ACTUALIZAR',
    'ordenes',
    14,
    'Estado ORD-20260218-0013: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:24'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    105,
    1,
    'ACTUALIZAR',
    'ordenes',
    15,
    'Estado ORD-20260218-0014: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:25'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    106,
    1,
    'ACTUALIZAR',
    'ordenes',
    16,
    'Estado ORD-20260218-0015: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:26'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    107,
    1,
    'ACTUALIZAR',
    'ordenes',
    17,
    'Estado ORD-20260218-0016: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:27'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    108,
    1,
    'ACTUALIZAR',
    'ordenes',
    20,
    'Estado ORD-20260218-0002: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 18:24:28'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    109,
    1,
    'ACTUALIZAR',
    'ordenes',
    8,
    'Estado ORD-20260218-0007: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:30'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    110,
    1,
    'ACTUALIZAR',
    'ordenes',
    9,
    'Estado ORD-20260218-0008: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:31'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    111,
    1,
    'ACTUALIZAR',
    'ordenes',
    10,
    'Estado ORD-20260218-0009: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:31'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    112,
    1,
    'ACTUALIZAR',
    'ordenes',
    11,
    'Estado ORD-20260218-0010: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:32'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    113,
    1,
    'ACTUALIZAR',
    'ordenes',
    12,
    'Estado ORD-20260218-0011: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:32'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    114,
    1,
    'ACTUALIZAR',
    'ordenes',
    13,
    'Estado ORD-20260218-0012: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:33'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    115,
    1,
    'ACTUALIZAR',
    'ordenes',
    14,
    'Estado ORD-20260218-0013: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:34'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    116,
    1,
    'ACTUALIZAR',
    'ordenes',
    15,
    'Estado ORD-20260218-0014: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:35'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    117,
    1,
    'ACTUALIZAR',
    'ordenes',
    16,
    'Estado ORD-20260218-0015: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:36'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    118,
    1,
    'ACTUALIZAR',
    'ordenes',
    17,
    'Estado ORD-20260218-0016: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:36'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    119,
    1,
    'ACTUALIZAR',
    'ordenes',
    18,
    'Estado ORD-20260218-0017: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:37'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    120,
    1,
    'ACTUALIZAR',
    'ordenes',
    19,
    'Estado ORD-20260218-0001: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:38'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    121,
    1,
    'ACTUALIZAR',
    'ordenes',
    20,
    'Estado ORD-20260218-0002: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 18:24:38'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    122,
    1,
    'ACTUALIZAR',
    'ordenes',
    20,
    'Estado ORD-20260218-0002: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 18:24:48'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    123,
    1,
    'ACTUALIZAR',
    'ordenes',
    19,
    'Estado ORD-20260218-0001: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 18:24:53'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    124,
    1,
    'ACTUALIZAR',
    'ordenes',
    18,
    'Estado ORD-20260218-0017: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 18:25:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    125,
    1,
    'ACTUALIZAR',
    'ordenes',
    17,
    'Estado ORD-20260218-0016: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 18:25:48'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    126,
    1,
    'ACTUALIZAR',
    'ordenes',
    14,
    'Estado ORD-20260218-0013: LISTA -> ENTREGADA',
    '::1',
    '2026-02-18 18:25:52'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    127,
    1,
    'CREAR',
    'ordenes',
    36,
    'Orden ORD-20260218-0020 creada. Total: L 130.00',
    '::1',
    '2026-02-18 21:08:07'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    128,
    1,
    'CREAR',
    'ordenes',
    37,
    'Orden ORD-20260218-0021 creada. Total: L 105.00',
    '::1',
    '2026-02-18 21:11:47'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    129,
    1,
    'CREAR',
    'ordenes',
    38,
    'Orden ORD-20260218-0022 creada. Total: L 90.00',
    '::1',
    '2026-02-18 21:12:28'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    130,
    1,
    'CREAR',
    'ordenes',
    39,
    'Orden ORD-20260218-0023 creada. Total: L 130.00',
    '::1',
    '2026-02-18 21:13:14'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    131,
    1,
    'CREAR',
    'ordenes',
    40,
    'Orden ORD-20260218-0024 creada. Total: L 235.00',
    '::1',
    '2026-02-18 21:38:46'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    132,
    1,
    'CREAR',
    'ordenes',
    41,
    'Orden ORD-20260218-0025 creada. Total: L 130.00',
    '::1',
    '2026-02-18 21:50:47'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    133,
    1,
    'CREAR',
    'ordenes',
    42,
    'Orden ORD-20260218-0026 creada. Total: L 130.00',
    '::1',
    '2026-02-18 22:07:06'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    134,
    1,
    'CREAR',
    'ordenes',
    43,
    'Orden ORD-20260218-0027 creada. Total: L 130.00',
    '::1',
    '2026-02-18 22:22:59'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    135,
    1,
    'CREAR',
    'ordenes',
    44,
    'Orden ORD-20260218-0028 creada. Total: L 130.00',
    '::1',
    '2026-02-18 22:31:18'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    136,
    1,
    'CREAR',
    'ordenes',
    45,
    'Orden ORD-20260218-0029 creada. Total: L 130.00',
    '::1',
    '2026-02-18 22:32:13'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    137,
    1,
    'CREAR',
    'ordenes',
    46,
    'Orden ORD-20260218-0030 creada. Total: L 90.00',
    '::1',
    '2026-02-18 22:40:01'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    138,
    1,
    'CREAR',
    'ordenes',
    47,
    'Orden ORD-20260218-0031 creada. Total: L 130.00',
    '::1',
    '2026-02-18 23:15:59'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    139,
    1,
    'CREAR',
    'ordenes',
    48,
    'Orden ORD-20260218-0032 creada. Total: L 220.00',
    '::1',
    '2026-02-18 23:18:40'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    140,
    1,
    'CREAR',
    'ordenes',
    49,
    'Orden ORD-20260218-0033 creada. Total: L 130.00',
    '::1',
    '2026-02-18 23:21:46'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    141,
    1,
    'ACTUALIZAR',
    'ordenes',
    48,
    'Estado ORD-20260218-0032: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:28:34'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    142,
    1,
    'ACTUALIZAR',
    'ordenes',
    49,
    'Estado ORD-20260218-0033: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:28:42'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    143,
    1,
    'ACTUALIZAR',
    'ordenes',
    47,
    'Estado ORD-20260218-0031: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:28:50'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    144,
    1,
    'ACTUALIZAR',
    'ordenes',
    46,
    'Estado ORD-20260218-0030: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:28:52'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    145,
    1,
    'ACTUALIZAR',
    'ordenes',
    45,
    'Estado ORD-20260218-0029: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 23:28:53'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    146,
    1,
    'ACTUALIZAR',
    'ordenes',
    45,
    'Estado ORD-20260218-0029: EN_PREPARACION -> ANULADA',
    '::1',
    '2026-02-18 23:28:54'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    147,
    1,
    'ACTUALIZAR',
    'ordenes',
    44,
    'Estado ORD-20260218-0028: NUEVA -> EN_PREPARACION',
    '::1',
    '2026-02-18 23:33:04'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    148,
    1,
    'ACTUALIZAR',
    'ordenes',
    42,
    'Estado ORD-20260218-0026: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:33:08'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    149,
    1,
    'CREAR',
    'ordenes',
    50,
    'Orden ORD-20260218-0034 creada. Total: L 90.00',
    '::1',
    '2026-02-18 23:33:18'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    150,
    1,
    'ACTUALIZAR',
    'ordenes',
    44,
    'Estado ORD-20260218-0028: EN_PREPARACION -> LISTA',
    '::1',
    '2026-02-18 23:34:29'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    151,
    1,
    'ACTUALIZAR',
    'ordenes',
    50,
    'Estado ORD-20260218-0034: NUEVA -> ANULADA',
    '::1',
    '2026-02-18 23:34:37'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    152,
    1,
    'CREAR',
    'ordenes',
    51,
    'Orden ORD-20260218-0035 creada. Total: L 90.00',
    '::1',
    '2026-02-18 23:34:57'
  );
INSERT INTO
  `bitacora` (
    `id`,
    `usuario_id`,
    `accion`,
    `entidad`,
    `entidad_id`,
    `detalle`,
    `ip`,
    `created_at`
  )
VALUES
  (
    153,
    1,
    'CREAR',
    'ordenes',
    52,
    'Orden ORD-20260218-0036 creada. Total: L 105.00',
    '::1',
    '2026-02-18 23:37:47'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: cai
# ------------------------------------------------------------

INSERT INTO
  `cai` (
    `id`,
    `cai_codigo`,
    `establecimiento`,
    `punto_emision`,
    `tipo_documento`,
    `rango_desde`,
    `rango_hasta`,
    `correlativo_actual`,
    `fecha_limite`,
    `activo`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '000',
    '002',
    '01',
    1,
    500,
    20,
    '2026-12-31',
    1,
    '2026-02-18 17:18:45',
    '2026-02-18 23:37:56'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: caja_sesiones
# ------------------------------------------------------------

INSERT INTO
  `caja_sesiones` (
    `id`,
    `usuario_id`,
    `fecha_apertura`,
    `monto_apertura`,
    `estado`,
    `fecha_cierre`,
    `monto_cierre`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    '2026-02-17',
    500.00,
    'CERRADA',
    '2026-02-17 21:55:05',
    0.00,
    '2026-02-17 21:37:33'
  );
INSERT INTO
  `caja_sesiones` (
    `id`,
    `usuario_id`,
    `fecha_apertura`,
    `monto_apertura`,
    `estado`,
    `fecha_cierre`,
    `monto_cierre`,
    `created_at`
  )
VALUES
  (
    2,
    1,
    '2026-02-18',
    500.00,
    'CERRADA',
    '2026-02-18 14:27:37',
    0.00,
    '2026-02-18 11:08:21'
  );
INSERT INTO
  `caja_sesiones` (
    `id`,
    `usuario_id`,
    `fecha_apertura`,
    `monto_apertura`,
    `estado`,
    `fecha_cierre`,
    `monto_cierre`,
    `created_at`
  )
VALUES
  (
    3,
    1,
    '2026-02-18',
    200.00,
    'CERRADA',
    '2026-02-18 17:51:48',
    450.00,
    '2026-02-18 15:11:30'
  );
INSERT INTO
  `caja_sesiones` (
    `id`,
    `usuario_id`,
    `fecha_apertura`,
    `monto_apertura`,
    `estado`,
    `fecha_cierre`,
    `monto_cierre`,
    `created_at`
  )
VALUES
  (
    4,
    1,
    '2026-02-18',
    500.00,
    'ABIERTA',
    NULL,
    NULL,
    '2026-02-18 17:52:22'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: categorias
# ------------------------------------------------------------

INSERT INTO
  `categorias` (`id`, `nombre`, `activo`, `orden`, `created_at`)
VALUES
  (1, 'Mega Taco', 1, 1, '2026-02-03 14:48:46');
INSERT INTO
  `categorias` (`id`, `nombre`, `activo`, `orden`, `created_at`)
VALUES
  (2, 'Pollo chuco', 1, 0, '2026-02-17 21:39:05');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: clientes
# ------------------------------------------------------------

INSERT INTO
  `clientes` (
    `id`,
    `nombre`,
    `rtn`,
    `telefono`,
    `direccion`,
    `email`,
    `activo`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'Pixel Digital',
    '08011990204676',
    '999999',
    'Tegucigalpa',
    'pixel@gmail.com',
    1,
    '2026-02-18 21:53:00',
    '2026-02-18 21:53:00'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: facturas
# ------------------------------------------------------------

INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    1,
    5,
    2,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'ORD-ORD-20260218-0004',
    0,
    'Juanito',
    NULL,
    NULL,
    NULL,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 11:09:17'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    2,
    7,
    2,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'ORD-ORD-20260218-0006',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 11:16:29'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    3,
    12,
    3,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000001',
    0,
    'juanito',
    NULL,
    NULL,
    NULL,
    100.00,
    0.00,
    0.00,
    100.00,
    '2026-02-18 17:27:30'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    4,
    13,
    3,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000002',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    100.00,
    0.00,
    0.00,
    100.00,
    '2026-02-18 17:30:35'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    5,
    14,
    3,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000003',
    0,
    'sadsad',
    NULL,
    NULL,
    NULL,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:34:09'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    6,
    16,
    3,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000004',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 17:50:54'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    7,
    17,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000005',
    0,
    'sdfdsf',
    NULL,
    NULL,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 17:52:56'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    8,
    18,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000006',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    210.00,
    0.00,
    0.00,
    210.00,
    '2026-02-18 17:58:56'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    9,
    19,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000007',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 18:01:38'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    10,
    20,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000008',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 18:02:35'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    11,
    36,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000009',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:08:16'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    12,
    39,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000010',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:13:29'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    13,
    40,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000011',
    0,
    'juan perez',
    NULL,
    NULL,
    NULL,
    235.00,
    0.00,
    0.00,
    235.00,
    '2026-02-18 21:39:16'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    14,
    41,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000012',
    0,
    'juan',
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:50:55'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    15,
    43,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000013',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:23:29'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    16,
    45,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000014',
    0,
    'Pixel Digital',
    NULL,
    NULL,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:32:20'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    17,
    47,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000015',
    0,
    'Pixel Digital',
    '08011990204676',
    NULL,
    'Tegucigalpa',
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 23:16:36'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    18,
    48,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000016',
    0,
    'Pixel Digital',
    '08011990204676',
    NULL,
    'Tegucigalpa',
    220.00,
    0.00,
    0.00,
    220.00,
    '2026-02-18 23:18:52'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    19,
    49,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000017',
    0,
    'Pixel Digital',
    '08011990204676',
    '999999',
    'Tegucigalpa',
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 23:21:55'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    20,
    50,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000018',
    0,
    'Pixel Digital',
    '08011990204676',
    '999999',
    'Tegucigalpa',
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 23:33:27'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    21,
    51,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000019',
    0,
    'Pixel Digital',
    '08011990204676',
    '999999',
    'Tegucigalpa',
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 23:35:06'
  );
INSERT INTO
  `facturas` (
    `id`,
    `orden_id`,
    `caja_sesion_id`,
    `cai_id`,
    `cai_codigo`,
    `cai_fecha_limite`,
    `cai_rango_desde`,
    `cai_rango_hasta`,
    `numero_factura`,
    `es_copia`,
    `cliente_nombre`,
    `cliente_rtn`,
    `cliente_telefono`,
    `cliente_direccion`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`
  )
VALUES
  (
    22,
    52,
    4,
    1,
    'A1B2-C3D4-E5F6-G7H8-I9J0-K1L2',
    '2026-12-31',
    1,
    500,
    '000-002-01-00000020',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 23:37:56'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: modificador_opciones
# ------------------------------------------------------------

INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (
    1,
    2,
    'Agua natural',
    0.00,
    1,
    1,
    '2026-02-18 14:49:46'
  );
INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (2, 2, 'Refresco', 15.00, 1, 2, '2026-02-18 14:49:46');
INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (3, 2, 'Jugo', 20.00, 1, 3, '2026-02-18 14:49:46');
INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (
    4,
    4,
    'Con salsa Ranchs',
    15.00,
    1,
    0,
    '2026-02-18 17:10:41'
  );
INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (
    5,
    4,
    'Especias y Limon',
    10.00,
    1,
    0,
    '2026-02-18 17:10:53'
  );
INSERT INTO
  `modificador_opciones` (
    `id`,
    `modificador_id`,
    `nombre`,
    `precio_extra`,
    `activo`,
    `orden`,
    `created_at`
  )
VALUES
  (
    6,
    1,
    'Queso Chedar',
    10.00,
    1,
    0,
    '2026-02-18 17:49:33'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: modificadores
# ------------------------------------------------------------

INSERT INTO
  `modificadores` (
    `id`,
    `nombre`,
    `requerido`,
    `multiple`,
    `activo`,
    `created_at`
  )
VALUES
  (1, 'Queso extra', 0, 0, 1, '2026-02-17 21:41:49');
INSERT INTO
  `modificadores` (
    `id`,
    `nombre`,
    `requerido`,
    `multiple`,
    `activo`,
    `created_at`
  )
VALUES
  (2, 'Bebida', 0, 0, 1, '2026-02-18 14:47:08');
INSERT INTO
  `modificadores` (
    `id`,
    `nombre`,
    `requerido`,
    `multiple`,
    `activo`,
    `created_at`
  )
VALUES
  (3, 'Salsa', 0, 0, 1, '2026-02-18 14:47:28');
INSERT INTO
  `modificadores` (
    `id`,
    `nombre`,
    `requerido`,
    `multiple`,
    `activo`,
    `created_at`
  )
VALUES
  (
    4,
    'Ensalada de repollo',
    0,
    0,
    1,
    '2026-02-18 16:29:56'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: orden_correlativo
# ------------------------------------------------------------

INSERT INTO
  `orden_correlativo` (`fecha`, `ultimo_numero`, `updated_at`)
VALUES
  ('2026-02-02', 1, '2026-02-02 11:57:08');
INSERT INTO
  `orden_correlativo` (`fecha`, `ultimo_numero`, `updated_at`)
VALUES
  ('2026-02-18', 36, '2026-02-18 23:37:47');
INSERT INTO
  `orden_correlativo` (`fecha`, `ultimo_numero`, `updated_at`)
VALUES
  ('2026-02-19', 2, '2026-02-18 18:02:29');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: orden_detalle
# ------------------------------------------------------------

INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    1,
    2,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-17 21:35:29',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    2,
    3,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    120.00,
    '2026-02-17 21:45:09',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    3,
    4,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    120.00,
    '2026-02-18 11:07:41',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    4,
    5,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    120.00,
    '2026-02-18 11:09:10',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    5,
    6,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 11:12:04',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    6,
    7,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    120.00,
    '2026-02-18 11:15:56',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    7,
    8,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    120.00,
    '2026-02-18 15:11:15',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    8,
    9,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:14:28',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    9,
    10,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:19:35',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    10,
    11,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:24:27',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    11,
    12,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    100.00,
    '2026-02-18 17:27:13',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    12,
    13,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    100.00,
    '2026-02-18 17:30:27',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    13,
    14,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:34:01',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    14,
    15,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:47:55',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    15,
    16,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 17:50:36',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    16,
    17,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 17:52:42',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    17,
    18,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:58:43',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    18,
    18,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 17:58:43',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    19,
    19,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 18:01:33',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    20,
    20,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 18:02:29',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    21,
    36,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 21:08:07',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    22,
    37,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 21:11:47',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    23,
    38,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 21:12:28',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    24,
    39,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 21:13:14',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    25,
    40,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 21:38:46',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    26,
    40,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 21:38:46',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    27,
    41,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 21:50:47',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    28,
    42,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 22:07:06',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    29,
    43,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 22:22:59',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    30,
    44,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 22:31:18',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    31,
    45,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 22:32:13',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    32,
    46,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 22:40:01',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    33,
    47,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 23:15:59',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    34,
    48,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 23:18:40',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    35,
    48,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 23:18:40',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    36,
    49,
    2,
    'Pechuga con tajadas',
    120.00,
    1,
    NULL,
    130.00,
    '2026-02-18 23:21:46',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    37,
    50,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 23:33:18',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    38,
    51,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    90.00,
    '2026-02-18 23:34:57',
    15.00
  );
INSERT INTO
  `orden_detalle` (
    `id`,
    `orden_id`,
    `producto_id`,
    `producto_nombre`,
    `precio_unitario`,
    `cantidad`,
    `notas`,
    `total_linea`,
    `created_at`,
    `tasa_impuesto`
  )
VALUES
  (
    39,
    52,
    1,
    'Megataco Res',
    90.00,
    1,
    NULL,
    105.00,
    '2026-02-18 23:37:47',
    15.00
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: orden_detalle_opciones
# ------------------------------------------------------------

INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (1, 8, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (2, 9, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (3, 10, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (4, 11, 4, 5, 'Especias y Limon', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (5, 12, 4, 5, 'Especias y Limon', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (6, 13, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (7, 14, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (8, 15, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (9, 17, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (10, 18, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (11, 19, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (12, 21, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (13, 22, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (14, 24, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (15, 25, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (16, 26, 4, 4, 'Con salsa Ranchs', 15.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (17, 27, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (18, 28, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (19, 29, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (20, 30, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (21, 31, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (22, 33, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (23, 34, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (24, 36, 1, 6, 'Queso Chedar', 10.00);
INSERT INTO
  `orden_detalle_opciones` (
    `id`,
    `orden_detalle_id`,
    `modificador_id`,
    `opcion_id`,
    `opcion_nombre`,
    `precio_extra`
  )
VALUES
  (25, 39, 4, 4, 'Con salsa Ranchs', 15.00);

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: orden_estados_historial
# ------------------------------------------------------------

INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-02 11:57:08'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    2,
    1,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-02 11:57:17'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (3, 1, 'LISTA', 1, NULL, '2026-02-02 11:57:32');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    4,
    2,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-17 21:35:29'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    5,
    2,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-17 21:36:05'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (6, 2, 'LISTA', 1, NULL, '2026-02-17 21:36:19');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (7, 2, 'ENTREGADA', 1, NULL, '2026-02-17 21:36:59');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    8,
    3,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-17 21:45:09'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    9,
    3,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-17 21:45:24'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (10, 3, 'LISTA', 1, NULL, '2026-02-17 21:45:32');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (11, 3, 'ENTREGADA', 1, NULL, '2026-02-17 21:45:54');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    12,
    1,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-17 21:47:20'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (13, 1, 'LISTA', 1, NULL, '2026-02-17 21:47:22');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    14,
    4,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 11:07:41'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    15,
    4,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 11:08:34'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (16, 4, 'LISTA', 1, NULL, '2026-02-18 11:08:35');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (17, 4, 'ENTREGADA', 1, NULL, '2026-02-18 11:08:42');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    18,
    5,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 11:09:10'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    19,
    6,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 11:12:04'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    20,
    5,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 11:14:49'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (21, 5, 'LISTA', 1, NULL, '2026-02-18 11:15:00');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    22,
    7,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 11:15:56'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    23,
    7,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 11:46:43'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    24,
    6,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 11:46:45'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (25, 6, 'LISTA', 1, NULL, '2026-02-18 11:46:48');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (26, 7, 'LISTA', 1, NULL, '2026-02-18 11:46:49');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (27, 5, 'ENTREGADA', 1, NULL, '2026-02-18 11:47:02');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (28, 6, 'ENTREGADA', 1, NULL, '2026-02-18 11:47:03');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (29, 7, 'ENTREGADA', 1, NULL, '2026-02-18 11:47:04');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    30,
    8,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 15:11:15'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    31,
    9,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:14:28'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    32,
    10,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:19:35'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    33,
    11,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:24:27'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    34,
    12,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:27:13'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    35,
    13,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:30:27'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    36,
    14,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:34:01'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    37,
    15,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:47:55'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    38,
    16,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:50:36'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    39,
    17,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:52:42'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    40,
    18,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 17:58:43'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    41,
    19,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 18:01:33'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    42,
    20,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 18:02:29'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    43,
    19,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:23:46'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    44,
    18,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:17'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    45,
    8,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:18'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    46,
    10,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:20'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    47,
    11,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:21'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    48,
    9,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:22'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    49,
    12,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:23'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    50,
    13,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:23'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    51,
    14,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:24'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    52,
    15,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:25'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    53,
    16,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:26'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    54,
    17,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:27'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    55,
    20,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 18:24:28'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (56, 8, 'LISTA', 1, NULL, '2026-02-18 18:24:30');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (57, 9, 'LISTA', 1, NULL, '2026-02-18 18:24:31');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (58, 10, 'LISTA', 1, NULL, '2026-02-18 18:24:31');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (59, 11, 'LISTA', 1, NULL, '2026-02-18 18:24:32');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (60, 12, 'LISTA', 1, NULL, '2026-02-18 18:24:32');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (61, 13, 'LISTA', 1, NULL, '2026-02-18 18:24:33');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (62, 14, 'LISTA', 1, NULL, '2026-02-18 18:24:34');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (63, 15, 'LISTA', 1, NULL, '2026-02-18 18:24:35');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (64, 16, 'LISTA', 1, NULL, '2026-02-18 18:24:36');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (65, 17, 'LISTA', 1, NULL, '2026-02-18 18:24:36');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (66, 18, 'LISTA', 1, NULL, '2026-02-18 18:24:37');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (67, 19, 'LISTA', 1, NULL, '2026-02-18 18:24:38');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (68, 20, 'LISTA', 1, NULL, '2026-02-18 18:24:38');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (69, 20, 'ENTREGADA', 1, NULL, '2026-02-18 18:24:48');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (70, 19, 'ENTREGADA', 1, NULL, '2026-02-18 18:24:53');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (71, 18, 'ENTREGADA', 1, NULL, '2026-02-18 18:25:42');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (72, 17, 'ENTREGADA', 1, NULL, '2026-02-18 18:25:48');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (73, 14, 'ENTREGADA', 1, NULL, '2026-02-18 18:25:52');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    74,
    36,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:08:07'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    75,
    37,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:11:47'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    76,
    38,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:12:28'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    77,
    39,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:13:14'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    78,
    40,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:38:46'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    79,
    41,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 21:50:47'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    80,
    42,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 22:07:06'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    81,
    43,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 22:22:59'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    82,
    44,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 22:31:18'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    83,
    45,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 22:32:13'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    84,
    46,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 22:40:01'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    85,
    47,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:15:59'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    86,
    48,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:18:40'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    87,
    49,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:21:46'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (88, 48, 'ANULADA', 1, NULL, '2026-02-18 23:28:34');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (89, 49, 'ANULADA', 1, NULL, '2026-02-18 23:28:42');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (90, 47, 'ANULADA', 1, NULL, '2026-02-18 23:28:50');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (91, 46, 'ANULADA', 1, NULL, '2026-02-18 23:28:52');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    92,
    45,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 23:28:53'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (93, 45, 'ANULADA', 1, NULL, '2026-02-18 23:28:54');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    94,
    44,
    'EN_PREPARACION',
    1,
    NULL,
    '2026-02-18 23:33:04'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (95, 42, 'ANULADA', 1, NULL, '2026-02-18 23:33:08');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    96,
    50,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:33:18'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (97, 44, 'LISTA', 1, NULL, '2026-02-18 23:34:29');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (98, 50, 'ANULADA', 1, NULL, '2026-02-18 23:34:37');
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    99,
    51,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:34:57'
  );
INSERT INTO
  `orden_estados_historial` (
    `id`,
    `orden_id`,
    `estado`,
    `cambiado_por`,
    `comentario`,
    `created_at`
  )
VALUES
  (
    100,
    52,
    'NUEVA',
    1,
    'Orden creada',
    '2026-02-18 23:37:47'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: ordenes
# ------------------------------------------------------------

INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    '2026-02-02',
    1,
    '20260202-001',
    'Kevin',
    'LLEVAR',
    NULL,
    'LISTA',
    '1 megataco',
    1,
    1,
    0.00,
    0.00,
    0.00,
    0.00,
    '2026-02-02 11:57:08',
    '2026-02-17 21:47:22'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    2,
    '2026-02-18',
    1,
    'ORD-20260217-0001',
    'Junito Perez',
    'LLEVAR',
    NULL,
    'ENTREGADA',
    'Sin Repollo',
    1,
    1,
    90.00,
    0.00,
    15.00,
    105.00,
    '2026-02-17 21:35:29',
    '2026-02-17 21:36:59'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    3,
    '2026-02-18',
    2,
    'ORD-20260217-0002',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-17 21:45:09',
    '2026-02-17 21:45:54'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    4,
    '2026-02-18',
    3,
    'ORD-20260218-0003',
    'pedro',
    'LLEVAR',
    NULL,
    'ENTREGADA',
    'sin cebolla',
    1,
    1,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 11:07:41',
    '2026-02-18 11:08:42'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    5,
    '2026-02-18',
    4,
    'ORD-20260218-0004',
    'Juanito',
    'LLEVAR',
    NULL,
    'ENTREGADA',
    'salsa Ranchs',
    1,
    1,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 11:09:10',
    '2026-02-18 11:47:02'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    6,
    '2026-02-18',
    5,
    'ORD-20260218-0005',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 11:12:04',
    '2026-02-18 11:47:03'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    '2026-02-18',
    6,
    'ORD-20260218-0006',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 11:15:56',
    '2026-02-18 11:47:04'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    '2026-02-18',
    7,
    'ORD-20260218-0007',
    'prueba',
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    120.00,
    0.00,
    0.00,
    120.00,
    '2026-02-18 15:11:15',
    '2026-02-18 18:24:30'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    9,
    '2026-02-18',
    8,
    'ORD-20260218-0008',
    NULL,
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:14:28',
    '2026-02-18 18:24:31'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    10,
    '2026-02-18',
    9,
    'ORD-20260218-0009',
    'Juanito',
    'LLEVAR',
    NULL,
    'LISTA',
    'Sin Queso',
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:19:35',
    '2026-02-18 18:24:31'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    11,
    '2026-02-18',
    10,
    'ORD-20260218-0010',
    NULL,
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:24:27',
    '2026-02-18 18:24:32'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    12,
    '2026-02-18',
    11,
    'ORD-20260218-0011',
    'juanito',
    'LLEVAR',
    NULL,
    'LISTA',
    'adsad',
    1,
    1,
    100.00,
    0.00,
    0.00,
    100.00,
    '2026-02-18 17:27:13',
    '2026-02-18 18:24:32'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    13,
    '2026-02-18',
    12,
    'ORD-20260218-0012',
    NULL,
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    100.00,
    0.00,
    0.00,
    100.00,
    '2026-02-18 17:30:27',
    '2026-02-18 18:24:33'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    14,
    '2026-02-18',
    13,
    'ORD-20260218-0013',
    'sadsad',
    'DELIVERY',
    NULL,
    'ENTREGADA',
    'asdsad',
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:34:01',
    '2026-02-18 18:25:52'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    15,
    '2026-02-18',
    14,
    'ORD-20260218-0014',
    'juanito',
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 17:47:55',
    '2026-02-18 18:24:35'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    16,
    '2026-02-18',
    15,
    'ORD-20260218-0015',
    NULL,
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 17:50:36',
    '2026-02-18 18:24:36'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    17,
    '2026-02-18',
    16,
    'ORD-20260218-0016',
    'sdfdsf',
    'LLEVAR',
    NULL,
    'ENTREGADA',
    'dsfdsf',
    1,
    1,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 17:52:42',
    '2026-02-18 18:25:48'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    18,
    '2026-02-18',
    17,
    'ORD-20260218-0017',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    210.00,
    0.00,
    0.00,
    210.00,
    '2026-02-18 17:58:43',
    '2026-02-18 18:25:42'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    19,
    '2026-02-19',
    1,
    'ORD-20260218-0001',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 18:01:33',
    '2026-02-18 18:24:53'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    20,
    '2026-02-19',
    2,
    'ORD-20260218-0002',
    NULL,
    'LLEVAR',
    NULL,
    'ENTREGADA',
    NULL,
    1,
    1,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 18:02:29',
    '2026-02-18 18:24:48'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    36,
    '2026-02-18',
    20,
    'ORD-20260218-0020',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:08:07',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    37,
    '2026-02-18',
    21,
    'ORD-20260218-0021',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 21:11:47',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    38,
    '2026-02-18',
    22,
    'ORD-20260218-0022',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 21:12:28',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    39,
    '2026-02-18',
    23,
    'ORD-20260218-0023',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:13:14',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    40,
    '2026-02-18',
    24,
    'ORD-20260218-0024',
    'juan perez',
    'DELIVERY',
    NULL,
    'NUEVA',
    'asdasdasd',
    1,
    NULL,
    235.00,
    0.00,
    0.00,
    235.00,
    '2026-02-18 21:38:46',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    41,
    '2026-02-18',
    25,
    'ORD-20260218-0025',
    'juan',
    'MESA',
    '1',
    'NUEVA',
    'salsas',
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 21:50:47',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    42,
    '2026-02-18',
    26,
    'ORD-20260218-0026',
    NULL,
    'LLEVAR',
    NULL,
    'ANULADA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:07:06',
    '2026-02-18 23:33:08'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    43,
    '2026-02-18',
    27,
    'ORD-20260218-0027',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:22:59',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    44,
    '2026-02-18',
    28,
    'ORD-20260218-0028',
    NULL,
    'LLEVAR',
    NULL,
    'LISTA',
    NULL,
    1,
    1,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:31:18',
    '2026-02-18 23:34:29'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    45,
    '2026-02-18',
    29,
    'ORD-20260218-0029',
    'Pixel Digital',
    'LLEVAR',
    NULL,
    'ANULADA',
    NULL,
    1,
    1,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 22:32:13',
    '2026-02-18 23:28:54'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    46,
    '2026-02-18',
    30,
    'ORD-20260218-0030',
    'Pixel Digital',
    'LLEVAR',
    NULL,
    'ANULADA',
    'sddf',
    1,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 22:40:01',
    '2026-02-18 23:28:52'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    47,
    '2026-02-18',
    31,
    'ORD-20260218-0031',
    NULL,
    'LLEVAR',
    NULL,
    'ANULADA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 23:15:59',
    '2026-02-18 23:28:50'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    48,
    '2026-02-18',
    32,
    'ORD-20260218-0032',
    NULL,
    'MESA',
    '5',
    'ANULADA',
    NULL,
    1,
    NULL,
    220.00,
    0.00,
    0.00,
    220.00,
    '2026-02-18 23:18:40',
    '2026-02-18 23:28:34'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    49,
    '2026-02-18',
    33,
    'ORD-20260218-0033',
    NULL,
    'MESA',
    '1',
    'ANULADA',
    NULL,
    1,
    NULL,
    130.00,
    0.00,
    0.00,
    130.00,
    '2026-02-18 23:21:46',
    '2026-02-18 23:28:42'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    50,
    '2026-02-18',
    34,
    'ORD-20260218-0034',
    NULL,
    'LLEVAR',
    NULL,
    'ANULADA',
    NULL,
    1,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 23:33:18',
    '2026-02-18 23:34:37'
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    51,
    '2026-02-18',
    35,
    'ORD-20260218-0035',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    90.00,
    0.00,
    0.00,
    90.00,
    '2026-02-18 23:34:57',
    NULL
  );
INSERT INTO
  `ordenes` (
    `id`,
    `fecha`,
    `numero_dia`,
    `codigo`,
    `cliente_nombre`,
    `tipo`,
    `mesa`,
    `estado`,
    `notas`,
    `creado_por`,
    `asignado_cocina_por`,
    `subtotal`,
    `descuento`,
    `impuesto`,
    `total`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    52,
    '2026-02-18',
    36,
    'ORD-20260218-0036',
    NULL,
    'LLEVAR',
    NULL,
    'NUEVA',
    NULL,
    1,
    NULL,
    105.00,
    0.00,
    0.00,
    105.00,
    '2026-02-18 23:37:47',
    NULL
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: pagos
# ------------------------------------------------------------

INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    'EFECTIVO',
    120.00,
    NULL,
    150.00,
    30.00,
    '2026-02-18 11:09:17'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    2,
    2,
    'TARJETA',
    120.00,
    'mastercar',
    NULL,
    NULL,
    '2026-02-18 11:16:29'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    3,
    3,
    'EFECTIVO',
    100.00,
    NULL,
    100.00,
    0.00,
    '2026-02-18 17:27:30'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    4,
    4,
    'EFECTIVO',
    100.00,
    NULL,
    100.00,
    0.00,
    '2026-02-18 17:30:35'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    5,
    5,
    'TARJETA',
    105.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 17:34:09'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    6,
    6,
    'EFECTIVO',
    50.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 17:50:54'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    7,
    6,
    'TARJETA',
    50.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 17:50:54'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    8,
    6,
    'TRANSFERENCIA',
    30.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 17:50:54'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    9,
    7,
    'TRANSFERENCIA',
    90.00,
    'fdsfsdfsd',
    NULL,
    NULL,
    '2026-02-18 17:52:56'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    10,
    8,
    'EFECTIVO',
    210.00,
    NULL,
    220.00,
    10.00,
    '2026-02-18 17:58:56'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    11,
    9,
    'EFECTIVO',
    105.00,
    NULL,
    110.00,
    5.00,
    '2026-02-18 18:01:38'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    12,
    10,
    'EFECTIVO',
    90.00,
    NULL,
    100.00,
    10.00,
    '2026-02-18 18:02:35'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    13,
    11,
    'EFECTIVO',
    130.00,
    NULL,
    150.00,
    20.00,
    '2026-02-18 21:08:16'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    14,
    12,
    'TRANSFERENCIA',
    130.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 21:13:29'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    15,
    13,
    'EFECTIVO',
    100.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 21:39:16'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    16,
    13,
    'TARJETA',
    135.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 21:39:16'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    17,
    14,
    'EFECTIVO',
    130.00,
    NULL,
    150.00,
    20.00,
    '2026-02-18 21:50:55'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    18,
    15,
    'EFECTIVO',
    100.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 22:23:29'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    19,
    15,
    'TARJETA',
    30.00,
    NULL,
    NULL,
    NULL,
    '2026-02-18 22:23:29'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    20,
    16,
    'EFECTIVO',
    130.00,
    NULL,
    150.00,
    20.00,
    '2026-02-18 22:32:20'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    21,
    17,
    'EFECTIVO',
    130.00,
    NULL,
    150.00,
    20.00,
    '2026-02-18 23:16:36'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    22,
    18,
    'EFECTIVO',
    220.00,
    NULL,
    250.00,
    30.00,
    '2026-02-18 23:18:52'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    23,
    19,
    'EFECTIVO',
    130.00,
    NULL,
    150.00,
    20.00,
    '2026-02-18 23:21:55'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    24,
    20,
    'EFECTIVO',
    90.00,
    NULL,
    100.00,
    10.00,
    '2026-02-18 23:33:27'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    25,
    21,
    'EFECTIVO',
    90.00,
    NULL,
    100.00,
    10.00,
    '2026-02-18 23:35:06'
  );
INSERT INTO
  `pagos` (
    `id`,
    `factura_id`,
    `metodo`,
    `monto`,
    `referencia`,
    `efectivo_recibido`,
    `cambio`,
    `created_at`
  )
VALUES
  (
    26,
    22,
    'EFECTIVO',
    105.00,
    NULL,
    110.00,
    5.00,
    '2026-02-18 23:37:56'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: permisos
# ------------------------------------------------------------

INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    1,
    'DASHBOARD.VER',
    'DASHBOARD',
    'Ver dashboard',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    2,
    'POS.USAR',
    'POS',
    'Acceder al POS',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    3,
    'ORDENES.VER',
    'ORDENES',
    'Ver órdenes',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    4,
    'ORDENES.CREAR',
    'ORDENES',
    'Crear órdenes',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    5,
    'ORDENES.EDITAR',
    'ORDENES',
    'Editar órdenes (solo NUEVA)',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    6,
    'ORDENES.ESTADO',
    'ORDENES',
    'Cambiar estado de órdenes',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    7,
    'COCINA.VER',
    'COCINA',
    'Ver KDS',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    8,
    'COCINA.ESTADO',
    'COCINA',
    'Cambiar estados en KDS',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    9,
    'CAJA.ABRIR',
    'CAJA',
    'Abrir caja',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    10,
    'CAJA.CERRAR',
    'CAJA',
    'Cerrar caja',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    11,
    'FACTURAS.CREAR',
    'FACTURAS',
    'Crear factura',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    12,
    'FACTURAS.VER',
    'FACTURAS',
    'Listar / reimprimir facturas',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    13,
    'REPORTES.VER',
    'REPORTES',
    'Acceder a reportes',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    14,
    'BITACORA.VER',
    'AUDITORIA',
    'Ver bitácora',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    15,
    'CATALOGO.ADMIN',
    'ADMIN',
    'Administrar catálogo',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    16,
    'USUARIOS.ADMIN',
    'SEGURIDAD',
    'Administrar usuarios',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    17,
    'ROLES.ADMIN',
    'SEGURIDAD',
    'Administrar roles',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    18,
    'PERMISOS.ADMIN',
    'SEGURIDAD',
    'Administrar permisos',
    '2026-02-05 16:04:01'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    19,
    'usuarios.ver',
    '',
    'Ver usuarios',
    '2026-02-16 21:42:20'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    20,
    'usuarios.crear',
    '',
    'Crear usuarios',
    '2026-02-16 21:42:20'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    21,
    'usuarios.editar',
    '',
    'Editar usuarios',
    '2026-02-16 21:42:20'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    22,
    'usuarios.activar',
    '',
    'Activar/Desactivar usuarios',
    '2026-02-16 21:42:20'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    23,
    'CAI.ADMIN',
    'ADMIN',
    'Administrar CAI (crear/editar/eliminar/activar)',
    '2026-02-18 12:56:21'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    24,
    'CLIENTES.ADMIN',
    'ADMIN',
    'Administrar clientes con RTN (CRUD + búsqueda)',
    '2026-02-18 12:56:21'
  );
INSERT INTO
  `permisos` (`id`, `clave`, `modulo`, `descripcion`, `created_at`)
VALUES
  (
    25,
    'BACKUP.ADMIN',
    'ADMIN',
    'Backup de base de datos (exportar/restaurar)',
    '2026-02-18 12:56:21'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: producto_modificadores
# ------------------------------------------------------------

INSERT INTO
  `producto_modificadores` (`producto_id`, `modificador_id`)
VALUES
  (2, 1);
INSERT INTO
  `producto_modificadores` (`producto_id`, `modificador_id`)
VALUES
  (2, 3);
INSERT INTO
  `producto_modificadores` (`producto_id`, `modificador_id`)
VALUES
  (1, 4);

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: productos
# ------------------------------------------------------------

INSERT INTO
  `productos` (
    `id`,
    `categoria_id`,
    `nombre`,
    `descripcion`,
    `precio`,
    `imagen_url`,
    `imagen_public_id`,
    `activo`,
    `es_combo`,
    `en_menu`,
    `created_at`,
    `updated_at`,
    `tasa_impuesto`
  )
VALUES
  (
    1,
    1,
    'Megataco Res',
    'Repollo, encurtido, salsa, aderezo de la casa',
    90.00,
    '/uploads/productos/prod_1770151891615.jpg',
    NULL,
    1,
    0,
    1,
    '2026-02-03 14:51:31',
    '2026-02-03 14:51:31',
    15.00
  );
INSERT INTO
  `productos` (
    `id`,
    `categoria_id`,
    `nombre`,
    `descripcion`,
    `precio`,
    `imagen_url`,
    `imagen_public_id`,
    `activo`,
    `es_combo`,
    `en_menu`,
    `created_at`,
    `updated_at`,
    `tasa_impuesto`
  )
VALUES
  (
    2,
    2,
    'Pechuga con tajadas',
    'Repollo, encurtido, salsa, aderezo de la casa',
    120.00,
    '/uploads/productos/prod_1771386039967_63004.jpeg',
    NULL,
    1,
    0,
    1,
    '2026-02-17 21:40:39',
    '2026-02-18 15:01:30',
    15.00
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: roles
# ------------------------------------------------------------

INSERT INTO
  `roles` (`id`, `nombre`, `created_at`)
VALUES
  (1, 'admin', '2026-02-02 09:20:59');
INSERT INTO
  `roles` (`id`, `nombre`, `created_at`)
VALUES
  (2, 'cajero', '2026-02-02 09:20:59');
INSERT INTO
  `roles` (`id`, `nombre`, `created_at`)
VALUES
  (3, 'cocina', '2026-02-02 09:20:59');
INSERT INTO
  `roles` (`id`, `nombre`, `created_at`)
VALUES
  (4, 'supervisor', '2026-02-02 09:20:59');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: roles_permisos
# ------------------------------------------------------------

INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 1, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 2, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 3, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 4, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 5, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 6, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 7, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 8, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 9, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 10, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 11, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 12, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 13, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 14, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 15, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 16, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 17, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 18, '2026-02-16 12:03:43');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 19, '2026-02-16 21:42:20');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 20, '2026-02-16 21:42:20');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 21, '2026-02-16 21:42:20');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 22, '2026-02-16 21:42:20');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 23, '2026-02-18 12:57:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 24, '2026-02-18 12:57:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (1, 25, '2026-02-18 12:57:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 2, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 3, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 4, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 5, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 9, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 10, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 11, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (2, 12, '2026-02-16 12:07:45');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (3, 3, '2026-02-16 12:07:56');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (3, 7, '2026-02-16 12:07:56');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (3, 8, '2026-02-16 12:07:56');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (4, 1, '2026-02-16 12:08:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (4, 3, '2026-02-16 12:08:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (4, 12, '2026-02-16 12:08:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (4, 13, '2026-02-16 12:08:04');
INSERT INTO
  `roles_permisos` (`rol_id`, `permiso_id`, `created_at`)
VALUES
  (4, 14, '2026-02-16 12:08:04');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: usuarios
# ------------------------------------------------------------

INSERT INTO
  `usuarios` (
    `id`,
    `rol_id`,
    `nombre`,
    `usuario`,
    `password_hash`,
    `activo`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    1,
    'Administrador',
    'admin',
    '$2b$10$Muc0rx1GhAGF0ahTPXgdreAzwh.D4WIKlw0mhD3IcBPpDh.s8O4nG',
    1,
    '2026-02-02 09:23:01',
    '2026-02-02 10:50:00'
  );
INSERT INTO
  `usuarios` (
    `id`,
    `rol_id`,
    `nombre`,
    `usuario`,
    `password_hash`,
    `activo`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    2,
    1,
    'Kevin Garcia',
    'kevin',
    '$2b$10$oV7gVdEASvzecGegGwqdcOKw2JiSrm1yb10U7ikgpL8QicdzgNswq',
    1,
    '2026-02-16 21:51:44',
    '2026-02-16 21:52:04'
  );

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
