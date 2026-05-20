-- Career Repo Database Schema
-- SQLite 3.x with foreign keys enabled

pragma foreign_keys = on;

----------------------------------------------------------
-- Profile
----------------------------------------------------------

-- Profile (root)
create table profile (
    id TEXT primary key,
    created_at TEXT not null
);

-- Profile (versions)
create table profile_version (
    id TEXT primary key,
    profile_id TEXT not null references profile (id),
    active_from TEXT not null,
    active_to TEXT,
    full_name TEXT not null,
    email TEXT,
    phone TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    location TEXT,
    job_preferences TEXT,
    job_dealbreakers TEXT,
    voice_settings TEXT,
    avatar_file_name TEXT
);

create trigger on_profile_update
    after insert
    on profile_version
begin
update profile_version
   set active_to = NEW.active_from
 where profile_id = NEW.profile_id
   and id != NEW.id
   and active_to is null;
end;

-- WorkPermit (attached to profile_version)
create table work_permit (
    id TEXT primary key,
    profile_version_id TEXT not null references profile_version (id),
    permit_type TEXT not null,
    country TEXT not null,
    description TEXT
);

-- WorkExperience (root)
create table work_experience (
    id TEXT primary key,
    profile_id TEXT not null references profile (id),
    created_at TEXT not null
);

-- WorkExperience (versions)
create table work_experience_version (
    id TEXT primary key,
    work_experience_id TEXT not null references work_experience (id),
    active_from TEXT not null,
    active_to TEXT,
    company TEXT not null,
    role TEXT not null,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    skills TEXT
);

create trigger on_work_experience_update
    after insert
    on work_experience_version
begin
update work_experience_version
   set active_to = NEW.active_from
 where work_experience_id = NEW.work_experience_id
   and id != NEW.id
   and active_to is null;
end;

-- WorkExperienceProject
create table work_experience_project (
    id TEXT primary key,
    work_experience_id TEXT not null references work_experience (id) on delete cascade,
    name TEXT not null,
    description TEXT,
    status TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT not null
);
create index idx_work_experience_project_we on work_experience_project (work_experience_id);

-- Resume
create table resume (
    id TEXT primary key,
    profile_id TEXT not null references profile (id),
    file_name TEXT not null,
    original_name TEXT not null,
    created_at TEXT not null
);
create index idx_resume_profile on resume (profile_id);

----------------------------------------------------------
-- Opportunity
----------------------------------------------------------

-- Opportunity (root)
create table opportunity (
    id TEXT primary key,
    url TEXT,
    type TEXT not null,
    created_at TEXT not null,
    sourcing_started_at TEXT,
    sourcing_completed_at TEXT,
    sourcing_agent_run_id TEXT,
    avatar_url TEXT
);

-- Opportunity (versions) — flat layout, all type-specific fields nullable
create table opportunity_version (
    id TEXT primary key,
    opportunity_id TEXT not null references opportunity (id),
    active_from TEXT not null,
    active_to TEXT,
    -- Common fields
    parent_id TEXT references opportunity (id),
    organization_name TEXT,
    status TEXT not null,
    title TEXT,
    description TEXT,
    location TEXT,
    score INTEGER,
    score_explanation TEXT,
    opened_on TEXT not null,
    started_on TEXT,
    completed_on TEXT,
    closed_on TEXT,
    -- Job-specific fields
    job_role TEXT,
    job_level TEXT,
    job_contract_type TEXT,
    job_work_mode TEXT,
    job_pay_period TEXT,
    job_pay_currency TEXT,
    job_pay_min REAL,
    job_pay_max REAL,
    -- Project-specific fields
    project_type TEXT,
    -- Education-specific fields
    education_type TEXT,
    education_level TEXT,
    -- Networking-specific fields
    networking_type TEXT,
    networking_is_online INTEGER,
    networking_contact_info TEXT,
    -- Learning-specific fields
    learning_type TEXT,
    learning_duration TEXT
);

create trigger on_opportunity_update
    after insert
    on opportunity_version
begin
update opportunity_version
   set active_to = NEW.active_from
 where opportunity_id = NEW.opportunity_id
   and id != NEW.id
   and active_to is null;
end;

----------------------------------------------------------
-- Comment
----------------------------------------------------------

-- Comment (root)
create table comment (
    id TEXT primary key,
    opportunity_id TEXT not null references opportunity (id) on delete cascade,
    created_at TEXT not null
);

-- Comment (versions)
create table comment_version (
    id TEXT primary key,
    comment_id TEXT not null references comment (id) on delete cascade,
    active_from TEXT not null,
    active_to TEXT,
    body TEXT not null
);

create trigger on_comment_update
    after insert
    on comment_version
begin
update comment_version
   set active_to = NEW.active_from
 where comment_id = NEW.comment_id
   and id != NEW.id
   and active_to is null;
end;

----------------------------------------------------------
-- Attachment
----------------------------------------------------------

create table attachment (
    id TEXT primary key,
    opportunity_id TEXT not null references opportunity (id) on delete cascade,
    type TEXT not null,
    title TEXT,
    file_path TEXT not null,
    file_type TEXT not null,
    created_at TEXT not null
);

----------------------------------------------------------
-- InboxEmail
----------------------------------------------------------

create table inbox_email (
    id TEXT primary key,
    external_id TEXT not null,
    received_at TEXT not null,
    from_address TEXT not null,
    to_address TEXT not null,
    subject TEXT not null,
    body TEXT not null,
    created_at TEXT not null
);

----------------------------------------------------------
-- EmailOpportunity
----------------------------------------------------------

create table email_opportunity (
    id TEXT primary key,
    created_at TEXT not null,
    inbox_email_id TEXT not null references inbox_email (id) on delete cascade,
    title TEXT not null,
    type TEXT not null default 'job',
    url TEXT,
    status TEXT not null default 'pending',
    opportunity_id TEXT references opportunity (id) on delete set null
);

create index idx_email_opportunity_email on email_opportunity (inbox_email_id);

----------------------------------------------------------
-- AgentRun
----------------------------------------------------------

create table agent_run (
    id TEXT primary key,
    agent TEXT not null,
    status TEXT not null default 'running',
    opportunity_id TEXT references opportunity (id) on delete set null,
    output TEXT,
    completed_at TEXT,
    created_at TEXT not null
);

----------------------------------------------------------
-- Indices
----------------------------------------------------------

create index idx_opportunity_version_entity on opportunity_version (opportunity_id, active_to);
create index idx_opportunity_version_status on opportunity_version (status);
create index idx_opportunity_type on opportunity (type);
create index idx_opportunity_version_opened_on on opportunity_version (opened_on);
create index idx_profile_version_entity on profile_version (profile_id, active_to);
create index idx_comment_opportunity on comment (opportunity_id);
create index idx_attachment_opportunity on attachment (opportunity_id);
create index idx_work_permit_profile_version on work_permit (profile_version_id);
create index idx_work_experience_profile on work_experience (profile_id);
create index idx_work_experience_version_entity on work_experience_version (work_experience_id, active_to);
create index idx_inbox_email_external_id on inbox_email (external_id);
create index idx_inbox_email_received_at on inbox_email (received_at);
create index idx_agent_run_status on agent_run (status);
create index idx_comment_version_entity on comment_version (comment_id, active_to);
