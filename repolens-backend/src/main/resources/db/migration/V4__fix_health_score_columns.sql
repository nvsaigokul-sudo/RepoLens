-- V4__fix_health_score_columns.sql
-- Migrates the SMALLINT columns in health_scores to INTEGER to align with JPA Entity types

ALTER TABLE health_scores
    ALTER COLUMN overall_score TYPE INTEGER,
    ALTER COLUMN documentation_score TYPE INTEGER,
    ALTER COLUMN commit_activity_score TYPE INTEGER,
    ALTER COLUMN issues_score TYPE INTEGER,
    ALTER COLUMN popularity_score TYPE INTEGER,
    ALTER COLUMN maturity_score TYPE INTEGER;
