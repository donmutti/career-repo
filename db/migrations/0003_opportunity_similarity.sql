create table opportunity_embedding (
    opportunity_id TEXT primary key references opportunity (id) on delete cascade,
    embedding BLOB not null,
    updated_at TEXT not null
);

create table opportunity_similarity (
    id_a TEXT not null,
    id_b TEXT not null,
    similarity REAL not null,
    dismissed_at TEXT,
    created_at TEXT not null,
    updated_at TEXT not null,
    primary key (id_a, id_b),
    foreign key (id_a) references opportunity (id) on delete cascade,
    foreign key (id_b) references opportunity (id) on delete cascade
);

create index opportunity_similarity_id_a on opportunity_similarity (id_a);
create index opportunity_similarity_id_b on opportunity_similarity (id_b);
