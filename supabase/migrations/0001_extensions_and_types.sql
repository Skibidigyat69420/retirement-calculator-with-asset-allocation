-- 0001_extensions_and_types.sql
-- Extensions and shared trigger function for the Sound Thesis Wealth platform.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- harmless in PG14+; gen_random_uuid() is core

-- Shared updated_at maintenance. Attached as a BEFORE UPDATE trigger to every
-- table that carries an updated_at column (never to append-only tables).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
