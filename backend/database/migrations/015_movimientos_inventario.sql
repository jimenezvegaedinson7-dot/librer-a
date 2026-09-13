-- ============================================================
-- MIGRACIÓN 015: MOVIMIENTOS DE INVENTARIO (KARDEX)
-- ============================================================
-- Registra cada cambio de stock del inventario (entradas/salidas)
-- con su cantidad, stock resultante, motivo y usuario responsable.
-- Permite construir el historial/kardex de movimientos.
-- SEGURO: CREATE TABLE IF NOT EXISTS, no borra datos.
-- ============================================================

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_libro INT NOT NULL,
    id_usuario INT NULL,
    tipo ENUM('entrada', 'salida') NOT NULL,
    motivo VARCHAR(100) NOT NULL DEFAULT 'ajuste',
    cantidad INT NOT NULL,
    stock_resultante INT NOT NULL,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_mov_libro_fecha (id_libro, fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;