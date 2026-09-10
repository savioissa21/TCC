CREATE TABLE mining_job (
    id VARCHAR(36) NOT NULL,
    establishment_id BIGINT NOT NULL,
    state VARCHAR(20) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    reviews_imported INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    started_at TIMESTAMP(6),
    finished_at TIMESTAMP(6),
    CONSTRAINT pk_mining_job PRIMARY KEY (id),
    CONSTRAINT fk_mining_job_establishment FOREIGN KEY (establishment_id)
        REFERENCES establishment (id) ON DELETE CASCADE
);

CREATE INDEX idx_mining_job_establishment_created
    ON mining_job (establishment_id, created_at);
CREATE INDEX idx_mining_job_state ON mining_job (state);
