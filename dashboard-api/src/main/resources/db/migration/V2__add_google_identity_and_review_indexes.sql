-- IF NOT EXISTS permite adotar bancos que já receberam estas adições pelo Hibernate.
-- Nenhum registro, identidade interna ou valor existente é reescrito.
ALTER TABLE review ADD COLUMN IF NOT EXISTS google_review_id VARCHAR(512);

CREATE UNIQUE INDEX IF NOT EXISTS uk_review_google_establishment
    ON review (establishment_id, google_review_id);
CREATE INDEX IF NOT EXISTS idx_review_establishment
    ON review (establishment_id);
CREATE INDEX IF NOT EXISTS idx_review_establishment_collected
    ON review (establishment_id, collected_at, id);
CREATE INDEX IF NOT EXISTS idx_aspect_review
    ON aspect (review_id);
