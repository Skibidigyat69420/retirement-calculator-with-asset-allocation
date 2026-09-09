-- 0003_clients_and_households.sql
-- Households, clients, and practitioner-to-client assignments.

CREATE TABLE households (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER households_set_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  household_id    UUID REFERENCES households(id),
  first_name      TEXT,
  last_name       TEXT NOT NULL,
  preferred_name  TEXT,
  email           CITEXT,
  phone           TEXT,
  date_of_birth   DATE,
  marital_status  TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE client_assignments (
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL DEFAULT 'secondary'
                  CHECK (assignment_role IN ('primary', 'secondary', 'associate', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, user_id)
);
