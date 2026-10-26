-- A nota geral do Google pertence ao estabelecimento e não deve ser recalculada
-- somente a partir da amostra de comentários textuais analisados pelo NEXO.
ALTER TABLE establishment ADD COLUMN IF NOT EXISTS google_rating DOUBLE PRECISION;
ALTER TABLE establishment ADD COLUMN IF NOT EXISTS google_review_count BIGINT;
ALTER TABLE establishment ADD COLUMN IF NOT EXISTS google_rating_updated_at TIMESTAMP(6);

-- Versões anteriores transformavam avaliações sem texto em um comentário
-- artificial. Elas não são evidência textual e não devem entrar na ABSA.
DELETE FROM aspect
WHERE review_id IN (
    SELECT id
    FROM review
    WHERE text IS NULL
       OR TRIM(text) = ''
       OR LOWER(TRIM(text)) = LOWER('Avaliação sem comentário.')
);

DELETE FROM review
WHERE text IS NULL
   OR TRIM(text) = ''
   OR LOWER(TRIM(text)) = LOWER('Avaliação sem comentário.');
