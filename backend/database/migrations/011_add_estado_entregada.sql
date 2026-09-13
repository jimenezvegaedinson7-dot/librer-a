-- ============================================================
-- MIGRACIÓN 011: AGREGAR 'entregada' AL ENUM DE VENTAS
-- ============================================================
-- El panel y el backend ya soportan marcar una venta como
-- Entregada (transición: pagada -> entregada), pero el ENUM de
-- la columna estado no la incluía y la BD rechazaba el UPDATE.
-- SEGURO: MODIFY conserva datos existentes (pendiente/pagada/cancelada).
-- ============================================================

ALTER TABLE ventas
    MODIFY COLUMN estado ENUM('pendiente', 'pagada', 'entregada', 'cancelada') NOT NULL DEFAULT 'pendiente';