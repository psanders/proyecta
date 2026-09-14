-- Separate database for integration tests (reset per run).
CREATE DATABASE proyecta_test;
-- Fonoster Identity keeps its own database on the same instance and migrates it on startup.
CREATE DATABASE identity;
