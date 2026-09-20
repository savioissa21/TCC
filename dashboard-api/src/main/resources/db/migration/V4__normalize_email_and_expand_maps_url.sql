-- Não unir contas automaticamente: uma colisão interrompe a migration inteira.
-- Verificar colisões de lower(trim(email)) e fazer backup antes de atualizar.
UPDATE users SET email = LOWER(TRIM(email));
ALTER TABLE users ADD CONSTRAINT ck_users_email_canonical CHECK (email = LOWER(TRIM(email)));
ALTER TABLE establishment ALTER COLUMN maps_url TYPE VARCHAR(2000);
