-- ============================================================
-- TitanSearch Phase 2 schema: users, repositories, topics,
-- languages, search_history, user_favorites.
-- (health_scores, ai_summaries, resume_analyses,
--  architecture_diagrams, similar_repositories ship in Phase 3/4)
-- ============================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150),
    role            VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repositories (
    id                  BIGSERIAL PRIMARY KEY,
    github_id           BIGINT UNIQUE NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    owner               VARCHAR(150) NOT NULL,
    description         TEXT,
    stars               INT NOT NULL DEFAULT 0,
    forks               INT NOT NULL DEFAULT 0,
    open_issues         INT NOT NULL DEFAULT 0,
    primary_language    VARCHAR(50),
    readme_preview      TEXT,
    repo_created_at     TIMESTAMPTZ,
    repo_pushed_at      TIMESTAMPTZ,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repo_topics (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    topic           VARCHAR(100) NOT NULL
);

CREATE TABLE repo_languages (
    id              BIGSERIAL PRIMARY KEY,
    repository_id   BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    language        VARCHAR(50) NOT NULL,
    byte_count      BIGINT NOT NULL DEFAULT 0,
    percentage      NUMERIC(5,2)
);

CREATE TABLE user_favorites (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id   BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, repository_id)
);

CREATE TABLE search_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    query           VARCHAR(500),
    filters         JSONB,
    result_count    INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repositories_full_name ON repositories (full_name);
CREATE INDEX idx_repositories_stars ON repositories (stars DESC);
CREATE INDEX idx_repo_topics_topic ON repo_topics (topic);
CREATE INDEX idx_repo_languages_language ON repo_languages (language);
CREATE INDEX idx_search_history_filters ON search_history USING GIN (filters);
