ALTER TABLE ventas
    MODIFY COLUMN estado ENUM('pendiente', 'pagada', 'entregada', 'cancelada') NOT NULL DEFAULT 'pendiente';
