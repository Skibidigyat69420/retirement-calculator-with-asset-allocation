-- 0005_client_assignments.sql
-- Spec section 13 (client assignments). Composite PK; tenant safety enforced
-- via RLS keyed through the parent client (see 0090_rls.sql).

CREATE TABLE client_assignments (
    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    assignment_role TEXT NOT NULL DEFAULT 'secondary'
        CHECK (assignment_role IN ('primary', 'secondary', 'associate', 'viewer')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (client_id, user_id)
);
