-- V2__analysis_engine.sql

ALTER TABLE repositories ADD COLUMN default_branch VARCHAR(50) DEFAULT 'main';

CREATE TABLE tech_stack_detections (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    category        VARCHAR(30) NOT NULL,   -- BACKEND / FRONTEND / DATABASE / INFRA
    technology      VARCHAR(50) NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tech_detection UNIQUE (repository_id, category, technology)
);

CREATE TABLE health_scores (
    id                      BIGSERIAL PRIMARY KEY,
    repository_id           BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    overall_score            SMALLINT NOT NULL,
    documentation_score      SMALLINT NOT NULL,
    commit_activity_score    SMALLINT NOT NULL,
    issues_score              SMALLINT NOT NULL,
    popularity_score          SMALLINT NOT NULL,
    maturity_score            SMALLINT NOT NULL,
    computed_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE architecture_diagrams (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
    diagram_json    JSONB NOT NULL,
    diagram_type    VARCHAR(30) NOT NULL DEFAULT 'LAYERED',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_stack_repo_category ON tech_stack_detections (repository_id, category);
CREATE INDEX idx_diagram_json ON architecture_diagrams USING GIN (diagram_json);
