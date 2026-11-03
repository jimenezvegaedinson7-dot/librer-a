ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(255) NULL;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verified_at DATETIME NULL;
