alter table email_opportunity add column reason TEXT;

create table decline_reason (
    id       TEXT primary key,
    created_at TEXT not null,
    text     TEXT unique,
    count    INTEGER not null default 1
);

-- Seed the built-in "Not for me" reason with a sentinel UUID
insert into decline_reason (id, created_at, text, count)
values ('00000000-0000-0000-0000-000000000000', datetime('now'), 'Just not for me', 0);
