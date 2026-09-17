-- Fails without truncating legacy names that need manual correction first.
ALTER TABLE establishment ALTER COLUMN name TYPE VARCHAR(100);
ALTER TABLE establishment ALTER COLUMN maps_url TYPE VARCHAR(2000);
