-- Runs once on first init of the production Postgres container
-- (docker-entrypoint-initdb.d). The Fonoster Identity service uses its own
-- database on the same instance; the postgres image only creates
-- POSTGRES_DB (proyecta), so create Identity's here too. Unlike
-- docker/postgres-init.sql (dev), there is no proyecta_test database in
-- production. Identity migrates its own schema on startup once the database
-- exists.
CREATE DATABASE identity;
