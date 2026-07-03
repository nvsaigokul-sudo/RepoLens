-- V3__ai_layer.sql

CREATE TABLE ai_summaries (
    id                    BIGSERIAL PRIMARY KEY,
    repository_id         BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    overview               TEXT,
    main_purpose            TEXT,
    architecture_summary    TEXT,
    key_technologies         TEXT,
    learning_value            TEXT,
    model_version             VARCHAR(50) NOT NULL,
    generated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resume_analyses (
    id                       BIGSERIAL PRIMARY KEY,
    repository_id            BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id                   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resume_score               NUMERIC(3,1) NOT NULL,
    strengths                   TEXT,
    weaknesses                  TEXT,
    industry_relevance          TEXT,
    suggested_improvements       TEXT,
    generated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE similar_repositories (
    id                       BIGSERIAL PRIMARY KEY,
    repository_id             BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    similar_repository_id      BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    similarity_score            NUMERIC(4,3) NOT NULL,
    reason                       VARCHAR(255),
    CONSTRAINT uq_similar_pair UNIQUE (repository_id, similar_repository_id)
);

CREATE INDEX idx_resume_analyses_repo ON resume_analyses (repository_id);
CREATE INDEX idx_similar_repo_score ON similar_repositories (repository_id, similarity_score DESC);
