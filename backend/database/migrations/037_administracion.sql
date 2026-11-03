CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_normalizado_unique
    ON usuarios (LOWER(email));
