-- Invalid legacy rows must be repaired explicitly before migration; no invented data.
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE establishment ALTER COLUMN name SET NOT NULL;
ALTER TABLE establishment ALTER COLUMN maps_url SET NOT NULL;
ALTER TABLE establishment ADD CONSTRAINT ck_establishment_name_length
    CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 2 AND 100);
ALTER TABLE review ALTER COLUMN establishment_id SET NOT NULL;
ALTER TABLE aspect ALTER COLUMN review_id SET NOT NULL;
ALTER TABLE aspect ALTER COLUMN name SET NOT NULL;
-- NULL remains allowed for historical unclassified data. Never invent a polarity.
ALTER TABLE review ADD CONSTRAINT ck_review_sentiment
    CHECK (overall_sentiment IN ('Positivo', 'Neutro', 'Negativo'));
ALTER TABLE aspect ADD CONSTRAINT ck_aspect_sentiment
    CHECK (sentiment IN ('Positivo', 'Neutro', 'Negativo'));
