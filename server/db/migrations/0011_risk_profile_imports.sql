-- Imported profiles are retained as a distinct source so an adviser can see
-- whether the current household result came from a client link, an interview,
-- or a signed portable import.
alter table client_risk_profiles
  drop constraint if exists client_risk_profiles_source_check;

alter table client_risk_profiles
  add constraint client_risk_profiles_source_check
  check (source in ('advisor', 'client', 'imported'));
