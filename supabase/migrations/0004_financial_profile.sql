-- 0004_financial_profile.sql
-- Client financial profile: assets, liabilities, cashflow rules, goals, risk assessments.

CREATE TABLE assets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  asset_type              TEXT NOT NULL,
  asset_category          TEXT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'INR',
  current_value           NUMERIC(20,2) NOT NULL DEFAULT 0,
  cost_basis              NUMERIC(20,2),
  expected_return         NUMERIC(8,4),
  liquidity               TEXT,
  liquidate_at_retirement BOOLEAN NOT NULL DEFAULT false,
  external_reference      TEXT,
  metadata                JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at             TIMESTAMPTZ
);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE liabilities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id),
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  liability_type     TEXT NOT NULL,
  outstanding_amount NUMERIC(20,2) NOT NULL,
  interest_rate      NUMERIC(8,4),
  monthly_payment    NUMERIC(20,2),
  maturity_date      DATE,
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at        TIMESTAMPTZ
);

CREATE TRIGGER liabilities_set_updated_at
  BEFORE UPDATE ON liabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cashflow_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type              TEXT NOT NULL
                    CHECK (type IN ('income', 'expense', 'sip', 'stp', 'swp', 'transfer')),
  name              TEXT NOT NULL,
  annual_amount     NUMERIC(20,2),
  monthly_amount    NUMERIC(20,2),
  annual_growth_rate NUMERIC(8,4),
  start_date        DATE,
  end_date          DATE,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER cashflow_rules_set_updated_at
  BEFORE UPDATE ON cashflow_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  goal_type       TEXT NOT NULL,
  priority        TEXT NOT NULL
                  CHECK (priority IN ('essential', 'important', 'aspirational')),
  target_amount   NUMERIC(20,2),
  target_date     DATE,
  years_to_goal   NUMERIC(8,2),
  inflation_rate  NUMERIC(8,4),
  recurring       BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only: risk assessments are never overwritten, hence no updated_at.
CREATE TABLE risk_assessments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  answers              JSONB NOT NULL,
  raw_score            NUMERIC(10,4),
  profile              TEXT,
  dimension_scores     JSONB NOT NULL DEFAULT '{}',
  questionnaire_version TEXT NOT NULL,
  assessed_by          UUID REFERENCES users(id),
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
