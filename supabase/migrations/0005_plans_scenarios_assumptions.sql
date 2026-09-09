-- 0005_plans_scenarios_assumptions.sql
-- Retirement plans, plan versions, scenarios, and assumption sets.

CREATE TABLE retirement_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id),
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'in_review', 'approved', 'active', 'archived')),
  created_by         UUID REFERENCES users(id),
  current_version_id UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at        TIMESTAMPTZ
);

CREATE TRIGGER retirement_plans_set_updated_at
  BEFORE UPDATE ON retirement_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only version snapshots: no updated_at.
CREATE TABLE plan_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  plan_id             UUID NOT NULL REFERENCES retirement_plans(id) ON DELETE CASCADE,
  version_number      INTEGER NOT NULL,
  input_snapshot      JSONB NOT NULL,
  assumptions_snapshot JSONB NOT NULL,
  result_snapshot     JSONB,
  engine_version      TEXT NOT NULL,
  created_by          UUID REFERENCES users(id),
  change_summary      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version_number)
);

-- scenarios.base_version_id references plan_versions, so this ALTER must come
-- after plan_versions exists. No DROP — migrations are append-only.
ALTER TABLE retirement_plans
  ADD CONSTRAINT retirement_plans_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES plan_versions(id);

CREATE TABLE plan_scenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  plan_id         UUID NOT NULL REFERENCES retirement_plans(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  scenario_type   TEXT NOT NULL
                  CHECK (scenario_type IN ('base', 'conservative', 'optimistic',
                                           'custom', 'stress', 'reverse', 'what_if')),
  assumptions     JSONB NOT NULL,
  result          JSONB,
  result_status   TEXT NOT NULL DEFAULT 'draft'
                  CHECK (result_status IN ('draft', 'stale', 'calculated', 'archived')),
  -- Which plan version this scenario was calculated against; drives staleness.
  base_version_id UUID REFERENCES plan_versions(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TRIGGER plan_scenarios_set_updated_at
  BEFORE UPDATE ON plan_scenarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- organization_id is NULLABLE: NULL means a global (platform-wide) assumption set.
CREATE TABLE assumption_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id), -- NULL = global
  name            TEXT NOT NULL,
  source          TEXT NOT NULL,
  version         TEXT NOT NULL,
  data            JSONB NOT NULL,
  valid_from      DATE,
  valid_to        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
