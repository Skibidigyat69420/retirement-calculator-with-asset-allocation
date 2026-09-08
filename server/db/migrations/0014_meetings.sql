-- 0014_meetings.sql
-- Spec sections 25-27 (meeting sessions, checklists, notes).

CREATE TABLE meeting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    title TEXT,

    current_stage INTEGER NOT NULL DEFAULT 1
        CHECK (current_stage BETWEEN 1 AND 4),

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER meeting_sessions_touch_updated_at
BEFORE UPDATE ON meeting_sessions
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE meeting_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    meeting_id UUID NOT NULL
        REFERENCES meeting_sessions(id)
        ON DELETE CASCADE,

    stage_id INTEGER NOT NULL
        CHECK (stage_id BETWEEN 1 AND 4),

    checklist_key TEXT NOT NULL,

    completed BOOLEAN NOT NULL DEFAULT false,

    completed_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    UNIQUE (meeting_id, checklist_key)
);

CREATE TABLE meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    meeting_id UUID NOT NULL
        REFERENCES meeting_sessions(id)
        ON DELETE CASCADE,

    stage_id INTEGER
        CHECK (stage_id BETWEEN 1 AND 4),

    body TEXT NOT NULL,

    author_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER meeting_notes_touch_updated_at
BEFORE UPDATE ON meeting_notes
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
