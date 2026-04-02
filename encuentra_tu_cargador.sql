-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 01-04-2026 a las 22:35:34
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `encuentra_tu_cargador`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cargadores`
--

CREATE TABLE `cargadores` (
  `id_cargador` int(11) NOT NULL,
  `latitud` decimal(10,7) NOT NULL,
  `longitud` decimal(10,7) NOT NULL,
  `tipo` enum('Rápido','Estándar','Compatible') NOT NULL,
  `estado` enum('Libre','Ocupado','En reparación') NOT NULL DEFAULT 'Libre',
  `nivel_carga` int(11) DEFAULT 100,
  `coste` decimal(6,2) DEFAULT 0.00,
  `tiempo_estimado` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cargadores`
--

INSERT INTO `cargadores` (`id_cargador`, `latitud`, `longitud`, `tipo`, `estado`, `nivel_carga`, `coste`, `tiempo_estimado`, `activo`) VALUES
(1, 40.4368000, -3.7038000, 'Rápido', 'Libre', 100, 20.00, '15 min', 1),
(2, 40.4230000, -3.7120000, 'Estándar', 'Libre', 100, 10.00, '30 min', 1),
(3, 40.4050000, -3.7010000, 'Compatible', 'Libre', 0, 8.00, '45 min', 1),
(4, 40.4120000, -3.6920000, 'Rápido', 'Libre', 90, 20.00, '15 min', 1),
(5, 40.4300000, -3.7050000, 'Estándar', 'Libre', 100, 10.00, '30 min', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `incidencias`
--

CREATE TABLE `incidencias` (
  `id_incidencia` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_cargador` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('Pendiente','En revisión','Resuelta') DEFAULT 'Pendiente',
  `fecha_reporte` datetime DEFAULT current_timestamp(),
  `comentario_tecnico` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `incidencias`
--

INSERT INTO `incidencias` (`id_incidencia`, `id_usuario`, `id_cargador`, `descripcion`, `estado`, `fecha_reporte`, `comentario_tecnico`) VALUES
(1, 4, 1, 'No va', 'Resuelta', '2026-04-01 21:10:05', 'a'),
(2, 4, 4, 'no va', 'Resuelta', '2026-04-01 21:10:29', 'a'),
(3, 4, 3, '1', 'Resuelta', '2026-04-01 21:26:10', 'a');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservas`
--

CREATE TABLE `reservas` (
  `id_reserva` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_cargador` int(11) NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `estado` enum('Activa','Cancelada','Finalizada') DEFAULT 'Activa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reservas`
--

INSERT INTO `reservas` (`id_reserva`, `id_usuario`, `id_cargador`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES
(1, 1, 2, '2026-03-30 20:05:35', '2026-03-30 21:05:35', 'Cancelada'),
(2, 1, 4, '2026-03-30 20:11:20', '2026-03-30 21:11:20', 'Cancelada'),
(3, 1, 1, '2026-03-30 20:11:38', '2026-03-30 21:11:38', 'Cancelada'),
(4, 1, 2, '2026-03-30 20:11:49', '2026-03-30 21:11:49', 'Cancelada'),
(5, 1, 5, '2026-03-30 20:15:05', '2026-03-30 21:15:05', 'Cancelada'),
(6, 1, 4, '2026-03-30 20:15:17', '2026-03-30 20:50:17', 'Finalizada'),
(7, 1, 1, '2026-03-30 20:23:12', '2026-03-30 21:23:12', 'Cancelada'),
(8, 1, 2, '2026-03-30 20:24:25', '2026-03-30 21:24:25', 'Cancelada'),
(9, 1, 5, '2026-03-30 20:47:42', '2026-03-30 21:47:42', 'Finalizada'),
(10, 4, 4, '2026-03-30 20:48:46', '2026-03-30 21:16:46', 'Finalizada'),
(11, 4, 5, '2026-04-01 15:55:42', '2026-04-01 16:55:42', 'Cancelada'),

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('usuario','admin','tecnico') NOT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `email`, `password`, `rol`, `activo`) VALUES
(1, 'Usuario', 'usuario@gmail.com', '1234', 'usuario', 1),
(2, 'Admin', 'admin@gmail.com', '1234', 'admin', 1),
(3, 'Tecnico', 'tecnico@gmail.com', '1234', 'tecnico', 1),


--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cargadores`
--
ALTER TABLE `cargadores`
  ADD PRIMARY KEY (`id_cargador`);

--
-- Indices de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD PRIMARY KEY (`id_incidencia`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_cargador` (`id_cargador`);

--
-- Indices de la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id_reserva`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_cargador` (`id_cargador`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cargadores`
--
ALTER TABLE `cargadores`
  MODIFY `id_cargador` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  MODIFY `id_incidencia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id_reserva` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD CONSTRAINT `incidencias_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `incidencias_ibfk_2` FOREIGN KEY (`id_cargador`) REFERENCES `cargadores` (`id_cargador`);

--
-- Filtros para la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `reservas_ibfk_2` FOREIGN KEY (`id_cargador`) REFERENCES `cargadores` (`id_cargador`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;