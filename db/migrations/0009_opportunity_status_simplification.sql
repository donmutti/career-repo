-- Rename archive_reason to close_reason
alter table opportunity_version rename column archive_reason to close_reason;

-- Add is_starred column (default false)
alter table opportunity_version add column is_starred INTEGER not null default 0;

-- Existing 'shortlisted' rows: convert to opened + starred
update opportunity_version set is_starred = 1, status = 'opened' where status = 'shortlisted';

-- Drop opened_on (no longer used; ordering falls back to created_at)
drop index if exists idx_opportunity_version_opened_on;
alter table opportunity_version drop column opened_on;

-- Rename date columns to ISO-timestamp columns (still TEXT)
alter table opportunity_version rename column started_on to started_at;
alter table opportunity_version rename column completed_on to completed_at;
alter table opportunity_version rename column closed_on to closed_at;

-- Upgrade existing date values to ISO timestamps (YYYY-MM-DD -> YYYY-MM-DDT00:00:00Z)
update opportunity_version set started_at = started_at || 'T00:00:00Z'
  where started_at is not null and length(started_at) = 10;
update opportunity_version set completed_at = completed_at || 'T00:00:00Z'
  where completed_at is not null and length(completed_at) = 10;
update opportunity_version set closed_at = closed_at || 'T00:00:00Z'
  where closed_at is not null and length(closed_at) = 10;

-- Existing 'closed' rows: stamp closed_at on the active version where missing,
-- using active_from as the best proxy for archive time.
update opportunity_version set closed_at = active_from
  where status = 'closed' and closed_at is null and active_to is null;

-- Re-mark archived rows as 'closed' status (any active version with closed_at set
-- should have status='closed', since closed_at is the lifecycle marker for archive)
update opportunity_version set status = 'closed'
  where closed_at is not null and active_to is null and status != 'closed';
