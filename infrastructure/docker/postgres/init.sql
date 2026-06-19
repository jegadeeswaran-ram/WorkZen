-- WorkZen PostgreSQL initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Shadow database for Prisma migrate (already created via POSTGRES_DB env in compose)
-- Ensure search path is correct
SET search_path TO public;

-- Full-text search configuration
CREATE TEXT SEARCH CONFIGURATION workzen (COPY = english);
