-- A collision fails the migration; do not silently merge different accounts.
UPDATE users SET email = LOWER(TRIM(email));
ALTER TABLE users ADD CONSTRAINT ck_users_normalized_email
    CHECK (email = LOWER(TRIM(email)));
