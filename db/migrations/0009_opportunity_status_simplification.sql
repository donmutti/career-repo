-- Rename archive_reason to close_reason
alter table opportunity_version rename column archive_reason to close_reason;

-- Add is_starred column (default false)
alter table opportunity_version add column is_starred INTEGER not null default 0;

-- Existing 'shortlisted' rows: convert to opened + starred
update opportunity_version set is_starred = 1, status = 'opened' where status = 'shortlisted';

-- Existing 'closed' rows: archived without closed_on stamped (legacy).
-- Stamp closed_on with active_from (best proxy for archive date), then revert status to 'opened' per design.
update opportunity_version set closed_on = substr(active_from, 1, 10) where status = 'closed' and closed_on is null;
update opportunity_version set status = 'opened' where status = 'closed';
