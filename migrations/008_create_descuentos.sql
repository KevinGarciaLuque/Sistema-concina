-- Crear tabla de descuentos
CREATE TABLE IF NOT EXISTS `descuentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: Tercera Edad, Promo 2x1',
  `tipo` enum('PORCENTAJE','MONTO_FIJO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PORCENTAJE',
  `valor` decimal(10,2) NOT NULL COMMENT 'Porcentaje (0-100) o Monto fijo',
  `tipo_aplicacion` enum('POR_ITEM','POR_TOTAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POR_TOTAL',
  `motivo` enum('PROMO','CORTESIA','CUPON','TERCERA_EDAD','CUARTA_EDAD','DISCAPACIDAD','DANO','OTRO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROMO',
  `requiere_autorizacion` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Si requiere autorización de supervisor',
  `limite_porcentaje` decimal(5,2) DEFAULT NULL COMMENT 'Límite máximo de descuento (%) si NULL = sin límite',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '999' COMMENT 'Orden de visualización',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración de descuentos';

-- Insertar descuentos por defecto
INSERT INTO `descuentos` (`nombre`, `tipo`, `valor`, `tipo_aplicacion`, `motivo`, `requiere_autorizacion`, `limite_porcentaje`, `descripcion`, `activo`, `orden`) VALUES
('Cuarta Edad 35%', 'PORCENTAJE', 35.00, 'POR_TOTAL', 'CUARTA_EDAD', 0, 35.00, 'Descuento para adultos mayores de 70 años', 1, 1),
('Tercera Edad 25%', 'PORCENTAJE', 25.00, 'POR_TOTAL', 'TERCERA_EDAD', 0, 25.00, 'Descuento para adultos mayores de 60 años', 1, 2),
('Discapacidad 20%', 'PORCENTAJE', 20.00, 'POR_TOTAL', 'DISCAPACIDAD', 0, 20.00, 'Descuento para personas con discapacidad', 1, 3),
('Cortesía 100%', 'PORCENTAJE', 100.00, 'POR_TOTAL', 'CORTESIA', 1, 100.00, 'Consumo de cortesía (requiere autorización)', 0, 4);
