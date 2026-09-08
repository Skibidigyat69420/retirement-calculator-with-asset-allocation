-- 0018_tasks_notifications.sql
-- Spec sections 32 (tasks) and 33 (notifications).

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID
        REFERENCES clients(id)
        ON DELETE CASCADE,

    plan_id UUID
        REFERENCES retirement_plans(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,

    description TEXT,

    assigned_to UUID REFERENCES users(id),

    due_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),

    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    created_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tasks_touch_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL,

    title TEXT NOT NULL,
    body TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
