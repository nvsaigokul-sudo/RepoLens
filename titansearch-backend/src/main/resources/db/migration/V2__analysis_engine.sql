-- ============================================================
-- TitanSearch Phase 3 schema: tech_stack_detections, health_scores,
-- architecture_diagrams.
-- ============================================================

CREATE TABLE tech_stack_detections (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    category        VARCHAR(30) NOT NULL, -- FRONTEND, BACKEND, DATABASE, INFRA
    technology      VARCHAR(50) NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0.000 AND 1.000),
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_repo_category_tech UNIQUE (repository_id, category, technology)
);

CREATE TABLE health_scores (
    id                      BIGSERIAL PRIMARY KEY,
    repository_id           BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    overall_score           SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    documentation_score     SMALLINT NOT NULL CHECK (documentation_score BETWEEN 0 AND 100),
    commit_activity_score   SMALLINT NOT NULL CHECK (commit_activity_score BETWEEN 0 AND 100),
    issues_score            SMALLINT NOT NULL CHECK (issues_score BETWEEN 0 AND 100),
    popularity_score        SMALLINT NOT NULL CHECK (popularity_score BETWEEN 0 AND 100),
    maturity_score          SMALLINT NOT NULL CHECK (maturity_score BETWEEN 0 AND 100),
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE architecture_diagrams (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    diagram_json    JSONB NOT NULL,
    diagram_type    VARCHAR(30) NOT NULL DEFAULT 'LAYERED',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_stack_repo_category ON tech_stack_detections (repository_id, category);
