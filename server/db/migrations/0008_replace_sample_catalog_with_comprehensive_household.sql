-- Replace any previously installed sample catalog with one deliberately
-- comprehensive household. Its per-practice test clients, plans, reports and
-- resources are disposable and are removed with the old catalog.

delete from clients
where id in (select client_id from sample_client_workspaces);

delete from sample_draft_catalog;
delete from client_drafts where is_sample = true;

insert into sample_draft_catalog (sample_key, name, data)
values (
  'comprehensive-household',
  'Sample Household',
  '{"tier":"HNI","stage":"Active Mandate","tags":["Comprehensive Test","Dossier Ready","Multi-Goal"],"financialSummary":{"netWorth":68400000,"investableAssets":51900000,"totalAssets":84600000,"totalLiabilities":16200000,"assetCount":8}}'::jsonb
);
