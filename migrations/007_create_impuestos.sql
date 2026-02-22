-- Crear tabla de impuestos
CREATE TABLE IF NOT EXISTS `impuestos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: ISV 15%, Propina 10%',
  `porcentaje` decimal(5,2) NOT NULL COMMENT 'Porcentaje del impuesto (0-100)',
  `tipo_aplicacion` enum('POR_ITEM','POR_TOTAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POR_ITEM' COMMENT 'Cómo se aplica el impuesto',
  `incluido_en_precio` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si está incluido en el precio del producto',
  `categoria_id` int DEFAULT NULL COMMENT 'Si aplica solo a una categoría específica (NULL = todas)',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '999' COMMENT 'Orden de visualización',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_impuestos_categoria` (`categoria_id`),
  CONSTRAINT `fk_impuestos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración de impuestos';

-- Insertar impuestos por defecto
INSERT INTO `impuestos` (`nombre`, `porcentaje`, `tipo_aplicacion`, `incluido_en_precio`, `categoria_id`, `descripcion`, `activo`, `orden`) VALUES
('ISV 15%', 15.00, 'POR_ITEM', 0, NULL, 'Impuesto sobre ventas estándar', 1, 1),
('Exento 0%', 0.00, 'POR_ITEM', 0, NULL, 'Productos exentos de impuestos', 1, 2);
