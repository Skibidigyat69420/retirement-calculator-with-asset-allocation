-- 0095_app_role.sql
-- Application role. RLS only bites for non-superuser, non-BYPASSRLS roles:
-- connections made as `postgres` (or any superuser) silently bypass every
-- policy, which is why migrations run as the superuser but the API must run
-- as app_user (see docs/DATABASE.md).
--
-- The password below is a LOCAL DEVELOPMENT default only. Production must
-- provision the role through infrastructure/secrets management.
--
-- Placed after all current table migrations and combined with
-- ALTER DEFAULT PRIVILEGES so tables created by later migrations
-- (e.g. auth-owned 0100_auth.sql) are covered automatically.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        EXECUTE format(
            'CREATE ROLE app_user LOGIN PASSWORD %L',
            coalesce(current_setting('app.app_user_password', true), 'app_user_dev_password')
        );
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_user', current_database());
END;
$$;

GRANT USAGE ON SCHEMA public TO app_user;

-- Existing tables (at the time this migration runs).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Tables created by later migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
