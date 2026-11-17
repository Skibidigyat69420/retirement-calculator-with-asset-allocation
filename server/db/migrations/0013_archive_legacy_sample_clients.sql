-- Remove automatically created sample workspaces from live directories without
-- deleting their rows. They remain recoverable for an administrator if needed.
update clients
set status = 'archived', updated_at = now()
where id in (select client_id from sample_client_workspaces);
