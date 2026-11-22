-- SWAPA: extend match statuses used by the exchange workflow.
-- Kept in its own migration because PostgreSQL forbids using a newly added
-- enum value in the same transaction that adds it.

alter type public.match_status add value if not exists 'reserved';
alter type public.match_status add value if not exists 'completed';
