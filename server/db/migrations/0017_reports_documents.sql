-- 0017_reports_documents.sql
-- Spec sections 30 (reports) and 31 (documents).
-- Binaries live in object storage; these tables hold metadata only.

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    plan_id UUID
        REFERENCES retirement_plans(id)
        ON DELETE SET NULL,

    report_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'generating', 'ready', 'failed')),

    plan_version_id UUID
        REFERENCES plan_versions(id)
        ON DELETE SET NULL,

    storage_key TEXT,

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID
        REFERENCES clients(id)
        ON DELETE CASCADE,

    plan_id UUID
        REFERENCES retirement_plans(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,

    document_type TEXT NOT NULL,

    storage_key TEXT NOT NULL,

    mime_type TEXT,
    size_bytes BIGINT,

    uploaded_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
