-- La búsqueda/login y las ediciones de perfil usan el mismo correo normalizado.
-- Protege también dos altas o cambios concurrentes. Si hay duplicados legacy
-- por mayúsculas, el índice falla sin fusionar ni eliminar cuentas.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_normalizado_unique
    ON usuarios (LOWER(email));
