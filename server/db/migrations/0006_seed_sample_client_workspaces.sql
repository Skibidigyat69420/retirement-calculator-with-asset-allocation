-- Give each linked reusable sample enough persisted data to exercise the
-- ordinary client workflow (planner, calculator, IPS, dossier and reports).
-- Idempotent: existing resource types are left unchanged.

insert into financial_resources (organization_id, client_id, resource_type, data)
select d.organization_id, d.client_id, 'assets', jsonb_build_object(
  'name', 'Sample opening portfolio',
  'category', 'equity',
  'assetCategory', 'equity',
  'currency', 'INR',
  'currentValue', coalesce((d.data #>> '{financialSummary,investableAssets}')::numeric, 1000000),
  'expectedReturn', 10
)
from client_drafts d
where d.is_sample = true and d.client_id is not null
  and not exists (select 1 from financial_resources r where r.client_id = d.client_id and r.resource_type = 'assets' and r.status = 'active');

insert into financial_resources (organization_id, client_id, resource_type, data)
select d.organization_id, d.client_id, 'cashflows', jsonb_build_object('type', 'income', 'annualAmount', greatest(1200000, coalesce((d.data #>> '{financialSummary,investableAssets}')::numeric, 1200000) * 0.08))
from client_drafts d
where d.is_sample = true and d.client_id is not null
  and not exists (select 1 from financial_resources r where r.client_id = d.client_id and r.resource_type = 'cashflows' and r.data->>'type' = 'income' and r.status = 'active');

insert into financial_resources (organization_id, client_id, resource_type, data)
select d.organization_id, d.client_id, 'goals', jsonb_build_object('name', 'Sample retirement objective', 'targetAmount', greatest(5000000, coalesce((d.data #>> '{financialSummary,netWorth}')::numeric, 5000000) * 1.5), 'yearsToGoal', 15, 'priority', 'essential')
from client_drafts d
where d.is_sample = true and d.client_id is not null
  and not exists (select 1 from financial_resources r where r.client_id = d.client_id and r.resource_type = 'goals' and r.status = 'active');
