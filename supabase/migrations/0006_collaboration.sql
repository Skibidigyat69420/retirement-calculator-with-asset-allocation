-- 0006_collaboration.sql
-- Meetings, decisions, audit, reports, documents, tasks, notifications, invitations.

CREATE TABLE meeting_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT,
  current_stage   INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'open',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER meeting_sessions_set_updated_at
  BEFORE UPDATE ON meeting_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE meeting_checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  meeting_id    UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  stage_id      INTEGER NOT NULL,
  checklist_key TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_by  UUID REFERENCES users(id),
  completed_at  TIMESTAMPTZ,
  UNIQUE (meeting_id, checklist_key)
);

CREATE TABLE meeting_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  meeting_id      UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  stage_id        INTEGER,
  body            TEXT NOT NULL,
  author_id       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER meeting_notes_set_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only planning narrative: no updated_at.
CREATE TABLE decision_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES retirement_plans(id),
  actor_user_id   UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  summary         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only security/accountability log (distinct from decision_logs).
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id   UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  ip_address      TEXT,
  user_agent      TEXT,
  request_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES retirement_plans(id),
  report_type     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'generating', 'ready', 'failed', 'archived')),
  plan_version_id UUID REFERENCES plan_versions(id),
  storage_key     TEXT,
  idempotency_key TEXT UNIQUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES retirement_plans(id),
  name            TEXT NOT NULL,
  document_type   TEXT NOT NULL,
  storage_key     TEXT NOT NULL,
  mime_type       TEXT,
  size_bytes      BIGINT,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES retirement_plans(id),
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     UUID REFERENCES users(id),
  due_at          TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by      UUID REFERENCES users(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-use, short-expiry, revocable invitations. Only a SHA-256 hash of the
-- invite token is stored — never the raw token.
CREATE TABLE invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email               CITEXT NOT NULL,
  role                TEXT NOT NULL
                      CHECK (role IN ('practice_admin', 'wealth_practitioner',
                                      'associate', 'read_only')),
  token_hash          TEXT NOT NULL UNIQUE,
  invited_by          UUID REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at          TIMESTAMPTZ NOT NULL,
  accepted_at         TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
