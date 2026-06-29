-- Bump score from integer 0-10 to integer 0-100 (0.1-step display resolution).
-- Multiplies all historic + active version rows uniformly. UI divides by 10 to display.
update opportunity_version set score = score * 10 where score is not null;
