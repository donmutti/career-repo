# Career Repo – Product Specification

## 1. Overview

Career Repo is a local-first, private career tracking tool that runs entirely on your machine.

Career Repo's users are software engineers managing their career trajectory – from first job to retirement. They want a private, structured, lifetime-long store for opportunities they've explored, roles they've held, and achievements they've earned, without their data living on someone else's server.

For them, Career Repo feels like a daily organiser – familiar, calm, always one click away, bookmarked in your browser as "Career". You return to it when something happens: a new career opportunity, an interview, a role change. Over years, it becomes the single place that knows your entire professional story.

All attachments – cover letters, CV snapshots, case studies – are downloadable at any moment, ready to send to a recruiter or a partner.

---

## 2. Project structure

Mono-repo. One Python backend, one React frontend, one SQLite database.

```
career-repo/
├── api/                                  # FastAPI backend
│   ├── db/                               # Database access layer
│   │   ├── daos/                         # DAO classes
│   │   │   ├── base/                     # Base DAO classes
│   │   │   ├── agent/                    # AgentRun DAO
│   │   │   ├── inbox/                    # Inbox DAOs
│   │   │   ├── opportunity/              # Opportunity DAOs (base/ + meta/)
│   │   │   └── profile/                  # Profile DAOs
│   │   ├── migrations/                   # SQL migration files
│   │   └── connection.py                 # DB connection and initialization
│   ├── models/                           # Pydantic models
│   │   ├── entities/                     # Entity models (base/, agent/, inbox/, opportunity/, profile/, timeline/)
│   │   ├── dtos/                         # Request/response DTOs (base/, inbox/, opportunity/, profile/, timeline/)
│   │   └── types/                        # Shared enums and value objects
│   ├── routers/                          # API endpoints
│   │   ├── agent/                        # Agent run endpoints
│   │   ├── inbox/                        # Inbox endpoints
│   │   ├── opportunity/                  # Opportunity endpoints (base/ + meta/)
│   │   └── profile/                      # Profile endpoints
│   ├── services/                         # Business logic and AI
│   │   ├── ai/                           # AI invocation + commands/
│   │   └── files/                        # File writing service
│   ├── config.py                         # Runtime configuration
│   └── main.py                           # FastAPI entry point
├── db/                                   # Database files
│   ├── data.db                           # SQLite binary (gitignored)
│   ├── data.json                         # Human-readable DB dump (committed)
│   └── migrations/                       # SQL migration files
├── ui/                                   # React SPA
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── app/                          # Domain modules
│   │   │   ├── inbox/                    # Inbox pages, components, hooks, and models
│   │   │   ├── onboarding/               # Onboarding pages, components, hooks, and models
│   │   │   ├── opportunities/            # Opportunity pages, components, hooks, and models
│   │   │   ├── profile/                  # Profile pages, components, hooks, and models
│   │   │   ├── App.tsx                   # App layout shell
│   │   │   ├── AppContext.tsx            # App-level context and system status
│   │   │   ├── AppRoutes.tsx             # Route definitions
│   │   │   ├── Sidebar.tsx               # App sidebar component
│   │   ├── shared/                       # Reusable, general-purpose components and utils
│   │   │   ├── controls/                 # Reusable, general-purpose components (buttons, inputs, etc.)
│   │   │   └── utils/                    # Reusable, general-purpose utilities (formatting, etc.)
│   │   ├── services/                     # API clients, API queries
│   │   ├── index.css                     # Global styles
│   │   └── index.tsx                     # App entry point
│   └── index.html                        # HTML entry point
├── config.yml                            # Runtime settings
├── pyproject.toml                        # Python dependencies
└── SPEC.md
```

Tech stack:

- DB: SQLite, append-only versioning, UUID v4 identifiers
- API: Python 3.13, FastAPI, Pydantic, uv, raw `sqlite3` for data access, `claude-agent-sdk` for AI, `sentence-transformers` + `sqlite-vec` for local embeddings
- UI: TypeScript, React 19, Vite, React Router, TanStack Query, Tailwind 4, Radix UI, Lucide

---

## 3. Configuration

Runtime settings live in `config.yml` at the repo root. The API reads this file at startup.

- `api.host` — API server host (default: 127.0.0.1)
- `api.port` — API server port (default: 8000)
- `ui.port` — UI dev server port (default: 3000)
- `db.path` — path to the SQLite database file (default: ./db/data.db)
- `db.dump_path` — path to the JSON dump file (default: ./db/data.json)
- `db.attachment_path` — root directory for generated attachments (default: ./db/attachments)
- `db.resumes_path` — root directory for uploaded resume files (default: ./db/resumes)
- `db.images_path` — root directory for uploaded images (default: ./db/images)
- `inbox.scan_days` — how many days back to scan Gmail on first scan; subsequent scans use `last_scanned_at` as the `after:` date (default: 30)
- `inbox.scan_batch_size` — number of emails per batch (default: 10)
- `inbox.scan_keywords` — list of search terms used to filter career-related emails

---

## 4. Models

All entities have: `id` (UUID v4), `created_at` (timestamp).

Entities can be either:

- mutable entity
- immutable entity
- versioned entity

Mutable entities have no versions; fields updated in place.
Immutable entities have no versions; fields set at creation, never changed.
Versioned entities have append-only immutable versions, each with `active_from` (timestamp) and `active_to` (timestamp, nullable). Current version = `active_to` is null.

### 4.1. Profile

Profile (versioned entity) - central user entity:

- full_name: string
- email: string (optional)
- phone: string (optional)
- github_url: string (optional)
- linkedin_url: string (optional)
- website_url: string (optional)
- location: string (optional)
- work_permits: WorkPermit[] (optional)
- job_preferences: string (optional)
- job_dealbreakers: string (optional)
- voice_settings: string
- avatar_file_name: string (optional)

WorkPermit (value object):

- type: WorkPermitType
- country: string
- description: string (optional)

WorkPermitType (enum): CITIZENSHIP | RESIDENCY | VISA | OTHER

### 4.2. Opportunity

Opportunity (versioned entity) — universal entity for every professional engagement; `type` is a discriminator:

Identity fields (set at creation, never changed):

- url: string (optional)
- type: OpportunityType
- avatar_url: string (optional) — logo/favicon fetched during sourcing
- sourcing_started_at: timestamp (optional)
- sourcing_completed_at: timestamp (optional)
- sourcing_agent_run_id: UUID (optional)

Version fields:

- organization_name: string (optional) — plain string, curated by Claude; no org entity
- parent_id: UUID (optional) — references another Opportunity
- status: OpportunityStatus
- title: string (optional)
- description: string (optional)
- location: string (optional)
- score: integer 0–10 (optional)
- score_explanation: string (optional) — AI-generated explanation of the score
- opened_on: date
- started_on: date (optional)
- completed_on: date (optional)
- closed_on: date (optional)

Job-specific fields:

- job_role: string (optional)
- job_level: string (optional)
- job_contract_type: JobContractType (optional)
- job_work_mode: JobWorkMode (optional)
- job_pay_period: JobPayPeriod (optional)
- job_pay_currency: Currency (optional)
- job_pay_min: number (optional)
- job_pay_max: number (optional)

Project-specific fields:

- project_type: ProjectType (optional)

Education-specific fields:

- education_type: EducationType (optional)
- education_level: EducationLevel (optional)

Networking-specific fields:

- networking_type: NetworkingType (optional)
- networking_is_online: boolean (optional)
- networking_contact_info: string (optional)

Learning-specific fields:

- learning_type: LearningType (optional)
- learning_duration: string (optional)

OpportunityType (enum): JOB | PROJECT | EDUCATION | NETWORKING | LEARNING
OpportunityStatus (enum): OPENED | SHORTLISTED | STARTED | COMPLETED | CLOSED
JobContractType (enum): PERMANENT | FIXED_TERM | CONTRACTOR
JobWorkMode (enum): ONSITE | REMOTE | HYBRID
JobPayPeriod (enum): HOURLY | DAILY | MONTHLY | ANNUAL | MILESTONE
ProjectType (enum): PRODUCT | SERVICE | FEATURE | MILESTONE | COMMUNITY | EVENT | OTHER
EducationType (enum): DEGREE | CERTIFICATION | COURSE | WORKSHOP | OTHER
EducationLevel (enum): BACHELOR | MASTER | PHD | PROFESSIONAL | ASSOCIATE | OTHER
NetworkingType (enum): MEET | ATTEND | HOST
LearningType (enum): BOOK | ARTICLE | MEDIA | REPOSITORY | STUDY | OTHER
Currency: ISO 4217 string (e.g. "USD", "EUR")

### 4.3. OpportunitySimilarity

OpportunitySimilarity (Pydantic BaseModel) — a detected near-duplicate pair; returned by `GET /opportunities/{id}/similar`; represents only undismissed rows:

- id_a: str — lexicographically smaller of the two opportunity IDs
- id_b: str — lexicographically larger of the two opportunity IDs
- similarity: float — cosine similarity 0.0–1.0
- created_at: datetime
- updated_at: datetime
- title: str (optional) — inlined from the neighbor opportunity; not stored in DB
- organization_name: str (optional) — inlined from the neighbor opportunity
- avatar_url: str (optional) — inlined from the neighbor opportunity

### 4.4. Attachment

Attachment (immutable entity) — document attached to an Opportunity:

- opportunity_id: UUID
- type: AttachmentType
- title: string (optional)
- file_path: string — local file path
- file_type: string — MIME type

AttachmentType (enum): CV | MOTIVATION | STUDY | PORTFOLIO | OTHER

### 4.5. Comment

Comment (versioned entity) — timestamped note attached to an Opportunity:

- opportunity_id: UUID
- body: string — Markdown

### 4.6. WorkExperience

WorkExperience (versioned entity) — a single job or role in the user's employment history; attached to Profile:

- profile_id: UUID

Version fields:

- company: string
- role: string
- start_date: string (optional) — ISO 8601 date
- end_date: string (optional) — ISO 8601 date; null means current
- description: string (optional)
- skills: string (optional)

WorkExperienceProject (value object) — project within a work experience entry:

- work_experience_id: UUID
- name: string
- description: string (optional)
- status: string (optional)
- start_date: string (optional)
- end_date: string (optional)

### 4.7. Resume

Resume (immutable entity) — an uploaded resume/CV file attached to a Profile:

- profile_id: UUID
- file_name: string — stored file name (UUID-based)
- original_name: string — original upload filename

### 4.8. EmailOpportunity

EmailOpportunity (immutable entity) — a potential opportunity identified by Claude within an inbox email:

- inbox_email_id: UUID
- title: string
- type: string — opportunity type hint
- url: string (optional)
- organization_name: string (optional) — hiring organization extracted by Claude during scan
- status: string — `pending` | `extracted` | `skipped`
- opportunity_id: UUID (optional) — set after extraction

### 4.9. InboxEmail

InboxEmail (immutable entity) — an email surfaced from the user's inbox:

- external_id: string — Gmail message ID
- received_at: timestamp
- from_address: string
- to_address: string
- subject: string
- body: string

### 4.10. AgentRun

AgentRun (mutable entity) — log of a single AI invocation:

- agent: string — command file name (e.g. `source-opportunity.md`)
- status: string — `running` | `completed` | `cancelled` | `failed`
- opportunity_id: UUID (optional) — associated opportunity
- output: string (optional) — final assistant text
- completed_at: timestamp (optional)
- meta: JSON object (optional) — arbitrary agent-specific progress data (e.g. `{ current: 50, total: 300 }` for batch scans)

---

## 5. DB

### 5.1. Schema

SQLite 3. `PRAGMA foreign_keys = ON` at connection time. Schema lives in `db/migrations/`, applied on first run via a migration runner.

Storage conventions:

- UUIDs: TEXT
- Enums: TEXT, lowercase snake_case
- Dates and timestamps: TEXT, ISO 8601, UTC
- Booleans: INTEGER (0/1)

All entities have: `id` (TEXT, UUID v4), `created_at` (TEXT, ISO 8601).
Mutable entities: no versions, fields updated in place.
Immutable entities: no versions, fields set at creation, never changed.
Versioned entities: two-table pattern — `<entity>` holds identity table (`id`, `created_at`), `<entity>_version` holds immutable snapshots (`id`, `<entity>_id`, `active_from`, `active_to`, plus all versioned fields). An `AFTER INSERT` trigger closes the previous version by setting `active_to = NEW.active_from`. Current version = `active_to IS NULL`. New versions are always inserted, never updated.

`profile` — identity table:

- id TEXT primary key
- created_at TEXT not null

`profile_version` — version table:

- id TEXT primary key
- profile_id TEXT not null (references `profile`)
- active_from TEXT not null
- active_to TEXT
- full_name TEXT not null
- email TEXT
- phone TEXT
- github_url TEXT
- linkedin_url TEXT
- website_url TEXT
- location TEXT
- job_preferences TEXT
- job_dealbreakers TEXT
- voice_settings TEXT
- avatar_file_name TEXT

`work_permit` — attached to profile_version:

- id TEXT primary key
- profile_version_id TEXT not null (references `profile_version`)
- permit_type TEXT not null
- country TEXT not null
- description TEXT

`work_experience` — identity table:

- id TEXT primary key
- profile_id TEXT not null (references `profile`)
- created_at TEXT not null

`work_experience_version` — version table:

- id TEXT primary key
- work_experience_id TEXT not null (references `work_experience`)
- active_from TEXT not null
- active_to TEXT
- company TEXT not null
- role TEXT not null
- start_date TEXT
- end_date TEXT
- description TEXT
- skills TEXT

`work_experience_project` — immutable, attached to work_experience:

- id TEXT primary key
- work_experience_id TEXT not null (references `work_experience`, on delete cascade)
- name TEXT not null
- description TEXT
- status TEXT
- start_date TEXT
- end_date TEXT
- created_at TEXT not null

`resume` — immutable, attached to profile:

- id TEXT primary key
- profile_id TEXT not null (references `profile`)
- file_name TEXT not null
- original_name TEXT not null
- created_at TEXT not null

`opportunity` — identity table; `url` is optional deduplication key; `type` set at creation, never changed:

- id TEXT primary key
- url TEXT
- type TEXT not null
- created_at TEXT not null
- sourcing_started_at TEXT
- sourcing_completed_at TEXT
- sourcing_agent_run_id TEXT
- avatar_url TEXT

`opportunity_version` — version table; flat layout, all type-specific fields nullable:

- id TEXT primary key
- opportunity_id TEXT not null (references `opportunity`)
- active_from TEXT not null
- active_to TEXT
- parent_id TEXT (references `opportunity`)
- organization_name TEXT
- status TEXT not null
- title TEXT
- description TEXT
- location TEXT
- score INTEGER
- score_explanation TEXT
- opened_on TEXT not null
- started_on TEXT
- completed_on TEXT
- closed_on TEXT
- job_role TEXT
- job_level TEXT
- job_contract_type TEXT
- job_work_mode TEXT
- job_pay_period TEXT
- job_pay_currency TEXT
- job_pay_min REAL
- job_pay_max REAL
- project_type TEXT
- education_type TEXT
- education_level TEXT
- networking_type TEXT
- networking_is_online INTEGER
- networking_contact_info TEXT
- learning_type TEXT
- learning_duration TEXT

`comment` — identity table:

- id TEXT primary key
- opportunity_id TEXT not null (references `opportunity`, on delete cascade)
- created_at TEXT not null

`comment_version` — version table:

- id TEXT primary key
- comment_id TEXT not null (references `comment`, on delete cascade)
- active_from TEXT not null
- active_to TEXT
- body TEXT not null

`attachment` — immutable:

- id TEXT primary key
- opportunity_id TEXT not null (references `opportunity`, on delete cascade)
- type TEXT not null
- title TEXT
- file_path TEXT not null
- file_type TEXT not null
- created_at TEXT not null

`inbox_email` — immutable:

- id TEXT primary key
- external_id TEXT not null
- received_at TEXT not null
- from_address TEXT not null
- to_address TEXT not null
- subject TEXT not null
- body TEXT not null
- created_at TEXT not null

`email_opportunity` — immutable; potential opportunity identified within an email:

- id TEXT primary key
- created_at TEXT not null
- inbox_email_id TEXT not null (references `inbox_email`, on delete cascade)
- title TEXT not null
- type TEXT not null default 'job'
- url TEXT
- organization_name TEXT
- status TEXT not null default 'pending'
- opportunity_id TEXT (references `opportunity`, on delete set null)

`agent_run` — mutable log of AI invocations:

- id TEXT primary key
- agent TEXT not null
- status TEXT not null default 'running'
- opportunity_id TEXT (references `opportunity`, on delete set null)
- output TEXT
- completed_at TEXT
- created_at TEXT not null

`opportunity_embedding` — stores a packed float32 vector for each sourced opportunity; used for similarity detection:

- opportunity_id TEXT primary key (references `opportunity`, on delete cascade)
- embedding BLOB not null — packed float32[] vector (sentence-transformers `all-MiniLM-L6-v2`, 384 dimensions)
- updated_at TEXT not null

`opportunity_similarity` — undirected near-duplicate pair detected by cosine similarity; key is always normalised to `(min(id_a, id_b), max(id_a, id_b))`:

- id_a TEXT not null (references `opportunity`, on delete cascade) — lexicographically smaller ID
- id_b TEXT not null (references `opportunity`, on delete cascade) — lexicographically larger ID
- similarity REAL not null — cosine similarity 0.0–1.0
- dismissed_at TEXT — null = active; non-null = dismissed by user
- created_at TEXT not null
- updated_at TEXT not null
- primary key (id_a, id_b)

Indices:

- `<entity>_id` + `active_to` on all version tables
- `type`, `opened_on` on `opportunity_version`; `type` on `opportunity`
- `opportunity_id` on `comment`, `attachment`
- `profile_id` on `work_experience`, `resume`
- `work_experience_id` on `work_experience_project`
- `external_id`, `received_at` on `inbox_email`
- `inbox_email_id` on `email_opportunity`
- `status` on `agent_run`
- `id_a`, `id_b` on `opportunity_similarity` (separate indices)

---

## 6. API

### 6.1. Models

Python 3.13+, Pydantic v2. Naming: snake_case for fields; PascalCase for classes; UPPER_SNAKE_CASE for enum constants. Enums extend `str, Enum`; values are lowercase snake_case strings (serialized identically at API boundaries and in DB).

Source lives in `api/models/`.

#### 6.1.1. Enums

WorkPermitType (enum): CITIZENSHIP | RESIDENCY | VISA | OTHER

OpportunityType (enum): JOB | PROJECT | EDUCATION | NETWORKING | LEARNING
OpportunityStatus (enum): OPENED | SHORTLISTED | STARTED | COMPLETED | CLOSED
JobContractType (enum): PERMANENT | FIXED_TERM | CONTRACTOR
JobWorkMode (enum): ONSITE | REMOTE | HYBRID
JobPayPeriod (enum): HOURLY | DAILY | MONTHLY | ANNUAL | MILESTONE
ProjectType (enum): PRODUCT | SERVICE | FEATURE | MILESTONE | COMMUNITY | EVENT | OTHER
EducationType (enum): DEGREE | CERTIFICATION | COURSE | WORKSHOP | OTHER
EducationLevel (enum): BACHELOR | MASTER | PHD | PROFESSIONAL | ASSOCIATE | OTHER
NetworkingType (enum): MEET | ATTEND | HOST
LearningType (enum): BOOK | ARTICLE | MEDIA | REPOSITORY | STUDY | OTHER
AttachmentType (enum): CV | MOTIVATION | STUDY | PORTFOLIO | OTHER

#### 6.1.2. Value objects

WorkPermit (Pydantic BaseModel):

- type: WorkPermitType
- country: str
- description: str (optional)

#### 6.1.3. Entity models

BaseEntity (Pydantic BaseModel) — base for all entities:

- id: str
- created_at: datetime

EntityVersion (Pydantic BaseModel) — base for all version records:

- active_from: datetime
- active_to: datetime (optional)

VersionedEntity[V: EntityVersion] (BaseEntity, Generic[V]) — base for versioned entities:

- active_version: V

ProfileVersion (EntityVersion):

- full_name: str
- email: str (optional)
- phone: str (optional)
- github_url: str (optional)
- linkedin_url: str (optional)
- website_url: str (optional)
- location: str (optional)
- work_permits: list[WorkPermit]
- job_preferences: str (optional)
- job_dealbreakers: str (optional)
- voice_settings: str
- avatar_file_name: str (optional)

Profile (VersionedEntity[ProfileVersion])

WorkExperienceVersion (Pydantic BaseModel):

- active_from: str (optional)
- active_to: str (optional)
- company: str
- role: str
- start_date: str (optional)
- end_date: str (optional)
- description: str (optional)
- skills: str (optional)

WorkExperience (Pydantic BaseModel):

- id: str
- profile_id: str
- created_at: str
- active_version: WorkExperienceVersion

WorkExperienceProject (Pydantic BaseModel):

- id: str (optional)
- work_experience_id: str (optional)
- name: str
- description: str (optional)
- status: str (optional)
- start_date: str (optional)
- end_date: str (optional)

Resume (Pydantic BaseModel):

- id: str
- profile_id: str
- file_name: str
- original_name: str
- created_at: str

OpportunityVersion (EntityVersion) — flat layout, all type-specific fields optional:

- status: OpportunityStatus
- title: str (optional)
- description: str (optional)
- location: str (optional)
- score: int (optional)
- score_explanation: str (optional)
- opened_on: date
- started_on: date (optional)
- completed_on: date (optional)
- closed_on: date (optional)
- organization_name: str (optional)
- parent_id: str (optional)
- job_role: str (optional)
- job_level: str (optional)
- job_contract_type: JobContractType (optional)
- job_work_mode: JobWorkMode (optional)
- job_pay_period: JobPayPeriod (optional)
- job_pay_currency: str (optional)
- job_pay_min: float (optional)
- job_pay_max: float (optional)
- project_type: ProjectType (optional)
- education_type: EducationType (optional)
- education_level: EducationLevel (optional)
- networking_type: NetworkingType (optional)
- networking_is_online: bool (optional)
- networking_contact_info: str (optional)
- learning_type: LearningType (optional)
- learning_duration: str (optional)

Opportunity (VersionedEntity[OpportunityVersion]):

- type: OpportunityType
- url: str (optional)
- avatar_url: str (optional)
- sourcing_started_at: datetime (optional)
- sourcing_completed_at: datetime (optional)
- sourcing_agent_run_id: str (optional)

OpportunitySimilarity (Pydantic BaseModel) — near-duplicate pair; returned by the similarity endpoint; dismissed_at is excluded (only undismissed rows are returned):

- id_a: str
- id_b: str
- similarity: float
- created_at: datetime
- updated_at: datetime
- title: str (optional)
- organization_name: str (optional)
- avatar_url: str (optional)

CommentVersion (EntityVersion):

- body: str

Comment (VersionedEntity[CommentVersion]):

- opportunity_id: str

Attachment (BaseEntity):

- opportunity_id: str
- type: AttachmentType
- title: str (optional)
- file_path: str
- file_type: str

EmailOpportunity (BaseEntity):

- inbox_email_id: str
- title: str
- type: str
- url: str (optional)
- organization_name: str (optional)
- status: str — `pending` | `extracted` | `skipped`
- opportunity_id: str (optional)

InboxEmail (BaseEntity):

- external_id: str
- received_at: datetime
- from_address: str
- to_address: str
- subject: str
- body: str

AgentRun (BaseEntity):

- agent: str
- status: str
- opportunity_id: str (optional)
- output: str (optional)
- completed_at: datetime (optional)
- meta: dict (optional) — arbitrary agent-specific progress data; stored as JSON

### 6.2. DAOs

Raw `sqlite3`, no ORM. Connection opened once at startup with `PRAGMA foreign_keys = ON` and `row_factory = sqlite3.Row`. All public methods accept and return domain model instances — no raw dicts cross public boundaries.

Source lives in `api/db/`.

`init_db()` — called at startup: creates `data.db` from `db/migrations/` if absent, then hydrates from `data.json` if available.
`dump_db()` — called after every mutation: serializes the full DB to `data.json` atomically via temp file + `os.replace()`.

#### 6.2.1. Base DAOs

BaseEntityDAO[T: BaseEntity] (ABC, Generic[T]):

- `get(id): T | None` (abstract)
- `delete(id): None` (abstract)
- `_generate_id(): str` — UUID v4
- `_now(): datetime` — UTC now
- `_save()` — commit + dump_db

VersionedEntityDAO[T: BaseEntity] (BaseEntityDAO[T]):

- `update(id, version): T | None` — inserts new version, returns updated entity
- `get_versions(id): list[dict]` — all version rows, newest first
- `delete(id): None` — closes current version by setting `active_to`
- `_insert_version(id, version, active_from?): str` (version id)
- `_get_latest_version_row(id): dict | None`
- `_version_to_dict(version): dict` (abstract)

#### 6.2.2. Entity DAOs

ProfileDAO (VersionedEntityDAO[Profile]):

- `create(full_name, voice_settings): str` (profile id)
- `get(id?): Profile | None` — single-user; ignores id, returns first row
- `update(profile_id, version): Profile | None`
- `delete(id?): None` — not implemented

WorkExperienceDAO (BaseEntityDAO[WorkExperience]):

- `create(profile_id, company, role, start_date?, end_date?, description?, skills?): WorkExperience`
- `get(we_id): WorkExperience | None`
- `list_for_profile(profile_id): list[WorkExperience]`
- `update(we_id, **fields): WorkExperience | None` — inserts new version
- `delete(we_id): None`

WorkExperienceProjectDAO (BaseEntityDAO[WorkExperienceProject]):

- `create(work_experience_id, name, description?, status?, start_date?, end_date?): WorkExperienceProject`
- `get(project_id): WorkExperienceProject | None`
- `list_for_experience(work_experience_id): list[WorkExperienceProject]`
- `update(project_id, **kwargs): WorkExperienceProject | None`
- `delete(project_id): None`

ResumeDAO (BaseEntityDAO[Resume]):

- `create(profile_id, file_name, original_name): Resume`
- `get(resume_id): Resume | None`
- `list_for_profile(profile_id): list[Resume]`
- `delete(resume_id): None`

OpportunityDAO (VersionedEntityDAO[Opportunity]):

- `create(url, opp_type, version): str` — returns existing id if URL already exists
- `get(opp_id): Opportunity | None`
- `require(opp_id): Opportunity` — raises `EntityNotFoundError` if not found
- `find_by_url(url): Opportunity | None`
- `list_all(): list[Opportunity]`
- `set_sourcing_started(opp_id, run_id): None`
- `set_sourcing_completed(opp_id): None`
- `set_avatar_url(opp_id, avatar_url): None`
- `reset_stuck_sourcing(): None` — clears stale sourcing state on startup
- `delete(opp_id): None`

CommentDAO (VersionedEntityDAO[Comment]):

- `create(opportunity_id, version): Comment`
- `get(comment_id): Comment | None`
- `list_for_opportunity(opportunity_id): list[Comment]`
- `relink(comment_id, new_opportunity_id): None` — reassigns a comment to a different opportunity; used during absorb

AttachmentDAO (BaseEntityDAO[Attachment]):

- `create(opportunity_id, attachment_type, file_path, file_type, title?): Attachment`
- `get(attachment_id): Attachment | None`
- `list_for_opportunity(opportunity_id): list[Attachment]`
- `delete(attachment_id): None`

InboxEmailDAO (BaseEntityDAO[InboxEmail]):

- `create(external_id, received_at, from_address, to_address, subject, body): InboxEmail`
- `get(email_id): InboxEmail | None`
- `get_by_external_id(external_id): InboxEmail | None`
- `list_all(from_date?, to_date?): list[InboxEmail]`
- `counts_by_window(today): dict` — returns per-window counts and all-sorted flags for `all`, `today`, `yesterday`, `last7`, `last30`
- `last_scanned_at(): str | None`
- `clear(): None` — deletes all inbox emails (cascade deletes email_opportunity)
- `delete(email_id): None`

EmailOpportunityDAO (BaseEntityDAO[EmailOpportunity]):

- `create(inbox_email_id, title, type, url?, organization_name?): EmailOpportunity`
- `get(eo_id): EmailOpportunity | None`
- `list_by_email(inbox_email_id): list[EmailOpportunity]`
- `set_status(eo_id, status, opportunity_id?): EmailOpportunity`
- `sorted_counts(): dict` — returns `{email_id: [sorted, total]}` for all emails
- `delete(eo_id): None`

AgentRunDAO (BaseEntityDAO[AgentRun]):

- `create(agent, opportunity_id?): AgentRun` — status defaults to `running`
- `get(run_id): AgentRun | None`
- `list(): list[AgentRun]`
- `list_active(): list[AgentRun]`
- `list_active_for_opportunity(opportunity_id): list[AgentRun]`
- `complete(run_id, output): None`
- `cancel(run_id): None`
- `fail(run_id, output): None`
- `set_meta(run_id, meta: dict): None` — updates the `meta` field; used for progress reporting during long-running scans
- `delete(run_id): None`

OpportunityEmbeddingDAO (plain class, not BaseEntityDAO):

- `upsert(opportunity_id, vector: list[float]): None` — insert or replace embedding; vector packed as float32 BLOB
- `get(opportunity_id): list[float] | None` — returns unpacked vector
- `find_similar(opportunity_id, top_k=5, min_similarity=0.85): list[tuple[str, float]]` — returns `[(similar_id, similarity), ...]`; excludes the query opportunity and any pairs already dismissed (dismissed_at IS NOT NULL); uses `sqlite-vec` cosine distance

OpportunitySimilarityDAO (plain class, not BaseEntityDAO):

- `upsert(id_a, id_b, similarity): None` — normalises key order (lexicographic min/max); inserts or updates similarity and updated_at
- `list_for_opportunity(opportunity_id): list[OpportunitySimilarity]` — undismissed rows where id_a = opp_id OR id_b = opp_id; inlines title, organization_name, avatar_url via JOIN against opportunity and opportunity_version
- `get_raw_pair(id_a, id_b): dict | None` — returns raw row including dismissed_at; used by the absorb handler for the 409 guard
- `dismiss(id_a, id_b): None` — sets dismissed_at; normalises key order
- `delete_pair(id_a, id_b): None` — hard delete; normalises key order; called after confirmed absorb

### 6.3. Services

#### 6.3.1. FileService

Handles attachment file writing and rendering. Initialized with `attachment_root: Path`. Source lives in `api/services/files/`.

FileService:

- `write_md(relative_path, md_content): Path` — writes Markdown file under attachment_root
- `write_pdf(relative_path, md_content): Path` — renders Markdown to PDF via weasyprint; raises `RuntimeError` if weasyprint unavailable

#### 6.3.2. InboxService

Orchestrates inbox scanning. Source lives in `api/services/inbox/`. Instantiated as a module-level singleton in `api/routers/inbox/scan_inbox.py`.

InboxService:

- `build_scan_query() -> str` — builds the Gmail search query from configured keywords and `last_scanned_at`
- `list_active_scans() -> list[AgentRun]` — returns active `scan-inbox.md` runs that have meta set
- `create_scan_run() -> AgentRun` — creates a new `AgentRun` with `meta = { current: 0, total: 0, preparing: true }`
- `start_scan(run_id) -> None` — starts the scan coroutine via `ClaudeService.create_task()`

The scan coroutine `_run_scan(ctx: AgentRunHandle)` contains all scan logic: probe (via `claude.generate("inbox-preflight", ...)`), batch loop (via `claude.generate("scan-inbox", ...)`), email/opportunity persistence. All `AgentRun` state transitions go through `AgentRunHandle`.

#### 6.3.3. EmbeddingService

Handles local text embedding for similarity detection. Separate from `ClaudeService` — has no involvement with the Claude agent SDK. Source lives in `api/services/ai/embedding_service.py`.

Uses `sentence-transformers` to load `all-MiniLM-L6-v2` from HF Hub (downloaded to `.cache/huggingface/` in the repo root on first use, ~22 MB, fully offline thereafter). Inference runs in a thread pool to avoid blocking the event loop. No API key required.

Instantiated as a module-level singleton `embedding` in `api/services/ai/__init__.py` alongside the existing `claude` singleton.

EmbeddingService:

- `async embed(text: str): list[float]` — encodes text to a 384-dim normalised float vector

#### 6.3.4. ClaudeService

##### 6.3.4.1. Invocation

Claude invoked in-process via the `claude-agent-sdk` Python SDK. Source lives in `api/services/ai/`. Prompt templates live in `api/services/ai/commands/` as `.md` files; each file is the **system prompt** for one operation. Structured input is passed as the **user message**, wrapped in `<input>` tags, and the prompt explicitly instructs Claude to treat tag contents as untrusted data.

`ClaudeError` — raised on SDK error, timeout, or unparseable output.

`AgentRunHandle` — injected into coroutines started via `create_task()`; provides the only sanctioned interface for `AgentRun` state transitions inside multi-step orchestration loops:

- `run_id: str`
- `set_meta(meta: dict) -> None` — update progress metadata
- `is_cancelled() -> bool` — returns `True` if run status is no longer `running` (or record is missing); used as the loop exit check before each batch
- `complete(output: str = "") -> None` — mark run completed
- `fail(message: str) -> None` — mark run failed

`ClaudeResult[T]` (Pydantic BaseModel) — return envelope for collected (non-streaming) calls:

- output: T — parsed result (dict, list, str, depending on method)
- cost_usd: float
- duration_ms: int
- model: str
- run_id: str — id of the persisted `AgentRun`

All Claude invocations flow through one private primitive: `_generate_stream()`. It owns the entire invocation lifecycle — `AgentRun` persistence, SDK invocation, tool allowlist resolution, timeout, cancellation, and event emission. No other code path invokes the SDK directly.

`async _generate_stream(command_path, payload, opportunity_id?): AsyncIterator[StreamEvent]` — invocation contract:

1. Reads the command file; uses its contents as `system_prompt`.
2. Serializes `payload` to JSON and sends as the user message: `<input>{json}</input>`.
3. Resolves the tool allowlist from `command_path` via the per-command table below.
4. Creates an `AgentRun` record (status `running`); registers the running task in an in-memory `run_id` to `asyncio.Task` map.
5. Invokes `claude_agent_sdk.query()` with `allowed_tools`, `permission_mode='bypassPermissions'`, `max_turns=5`, and a per-operation timeout (see public surface below).
6. Iterates SDK messages; yields a `StreamEvent` for each text chunk, tool use, and tool result; accumulates assistant text and tracks `usage` / `total_cost_usd` from the final result message.
7. On completion: updates `AgentRun` with output and `completed_at`; emits final `done` event carrying cost/duration/model/run_id; removes task from registry.
8. On failure or timeout: marks `AgentRun` `failed`; emits `error` event with `run_id` and `message`; removes task from registry; raises `ClaudeError`.
9. On cancellation: marks `AgentRun` `cancelled`; emits `cancelled` event with `run_id`; removes task from registry; re-raises `asyncio.CancelledError` after the event has been yielded, so any non-streaming caller still sees the exception.

##### 6.3.4.2. Streaming

`StreamEvent` (Pydantic BaseModel) — single event in the underlying stream; emitted by `_generate_stream()` and forwarded to clients by `generate_stream()`:

- type: `text` | `tool_use` | `tool_result` | `done` | `cancelled` | `error`
- data: str | dict — for `done`, contains `cost_usd`, `duration_ms`, `model`, `run_id`; for `cancelled`, contains `run_id`; for `error`, contains `run_id` and `message`

Every stream ends with exactly one terminal event: `done`, `cancelled`, or `error`. Clients treat the receipt of any terminal event as end-of-stream and the absence of a terminal event before connection close as an abnormal termination (network drop, server crash) distinct from cancellation.

`generate_stream()` delegates to `_generate_stream()` and yields events verbatim. Used by the SSE endpoint (`POST /agent-runs`). It does not parse output; the client is responsible for any aggregation.

##### 6.3.4.3. Public surface

ClaudeService:

- `__init__(agent_run_dao)` — DAO injected for run persistence
- `async generate(agent, payload, opportunity_id?, raw_text?, run_id?, timeout?): ClaudeResult` — run an agent to completion; resolves command path from agent name; raises `ClaudeError` if agent unknown
- `async generate_stream(agent, payload, opportunity_id?, timeout?): AsyncIterator[StreamEvent]` — run an agent and yield `StreamEvent`s; resolves command path from agent name; raises `ClaudeError` if agent unknown
- `create_task(run_id, coro_factory: (AgentRunHandle) -> Coroutine): asyncio.Task` — builds an `AgentRunHandle`, calls `coro_factory(ctx)` to obtain the coroutine, registers it in the task registry under `run_id`, and starts it; the wrapper catches `CancelledError` and marks the run failed if it wasn't already terminal
- `async cancel(run_id): None`

`generate()` consumes the full event stream from `_generate_stream()`, concatenates `text` events into a single assistant string, reads the final `done` event for cost/duration/model/run_id, parses the assistant string (JSON by default, raw text if `raw_text=True`), and returns `ClaudeResult`. Domain-specific payload construction is the caller's responsibility.

`cancel(run_id)` looks up the task in the registry and calls `task.cancel()`; the SDK aborts the in-flight request. Used by `DELETE /agent-runs/{id}`.

##### 6.3.4.4. Per-command tool allowlist

Resolved by `_generate_stream()` from the command file name:

- `inbox-preflight.md` — `mcp__gmail__*` (Gmail MCP tools only)
- `scan-inbox.md` — `mcp__gmail__*` (Gmail MCP tools only)
- `extract-opportunity-from-email.md` — none
- `source-opportunity.md` — `WebFetch`
- `generate-attachment.md` — none
- `parse-work-experience-from-resume.md` — none

##### 6.3.4.5. Output parsing

JSON-returning commands instruct Claude in the system prompt to return **only** a JSON object or array — no prose, no markdown fences. `generate()` parses this strictly via `json.JSONDecoder().raw_decode()`; on parse failure, `ClaudeError` is raised. Pass `raw_text=True` to skip parsing and return the assistant text unmodified (used for attachment generation).

##### 6.3.4.6. Authentication

SDK uses the credentials configured by the Claude Code CLI (subscription login or `ANTHROPIC_API_KEY` env var). The repo does not manage auth.

### 6.4. Endpoints

All endpoints prefixed with `/api`. Source lives in `api/routers/`.

#### 6.4.1. System

- `GET /system/status` — returns `status`, `version`, `database`, `profile_exists`, `active_agent_runs`, `services`

#### 6.4.2. Profile

- `POST /profile` — creates profile; 409 if already exists
- `GET /profile` — returns current profile; 404 if none
- `PATCH /profile` — creates new profile version with updated fields
- `POST /profile/avatar` — uploads avatar image; stores under `images_path`; updates `avatar_file_name`
- `GET /profile/avatar` — serves the avatar image file

#### 6.4.3. Work experience

- `GET /profile/work-experiences` — lists all work experiences for the current profile
- `POST /profile/work-experiences` — creates work experience
- `GET /profile/work-experiences/{id}` — returns work experience; 404 if not found
- `PATCH /profile/work-experiences/{id}` — updates work experience fields (inserts new version)
- `DELETE /profile/work-experiences/{id}` — deletes work experience; 204
- `GET /profile/work-experiences/{id}/projects` — lists projects for a work experience
- `POST /profile/work-experiences/{id}/projects` — creates project
- `PATCH /profile/work-experiences/projects/{id}` — updates project
- `DELETE /profile/work-experiences/projects/{id}` — deletes project; 204

#### 6.4.4. Resumes

- `GET /profile/resumes` — lists all resumes for the current profile
- `POST /profile/resumes` — uploads resume file (PDF, DOC, DOCX); stores under `resumes_path`
- `GET /profile/resumes/{id}` — returns resume metadata
- `GET /profile/resumes/{id}/file/{filename}` — serves the resume file
- `DELETE /profile/resumes/{id}` — deletes resume record and file; 204
- `GET /profile/resumes/parse-work-experience/active` — returns active parse run id or null
- `POST /profile/resumes/{id}/parse-work-experience` — parses work experience from resume via Claude; runs in background; 202

#### 6.4.5. Opportunities

- `GET /opportunities` — lists all opportunities
- `POST /opportunities` — creates opportunity; returns existing if URL already present
- `GET /opportunities/{id}` — returns opportunity; 404 if not found
- `PATCH /opportunities/{id}` — creates new version with updated fields
- `DELETE /opportunities/{id}` — deletes opportunity; 204
- `GET /opportunities/{id}/history` — returns version history
- `POST /opportunities/{id}/source` — AI sourcing: fetches job details from the web and scores against profile; runs in background; 202
- `GET /opportunities/{id}/agent-runs` — returns active agent runs for this opportunity
- `GET /opportunities/{id}/comments` — lists comments
- `POST /opportunities/{id}/comments` — creates comment
- `GET /opportunities/{id}/attachments` — lists attachments
- `POST /opportunities/{id}/attachments` — creates attachment
- `GET /opportunities/{id}/cover-letter/active` — returns active cover-letter run id or null
- `POST /opportunities/{id}/cover-letter` — generates cover letter for a Job opportunity; runs in background; 202
- `GET /opportunities/{id}/similar` — returns list[OpportunitySimilarity] for undismissed near-duplicate pairs; 404 if opportunity not found
- `DELETE /opportunities/{id}/similar/{neighbor_id}` — dismisses a near-duplicate candidate (sets dismissed_at); 404 if either opportunity not found; 204
- `PATCH /opportunities/{id}/url` — updates the URL of an opportunity; body: `{url: string}`; 404 if not found; returns updated Opportunity
- `POST /opportunities/{id}/absorb/{neighbor_id}` — merges neighbor into this opportunity, relinks comments, hard-deletes neighbor, deletes similarity row; 404 if either not found; 409 if pair is already dismissed; 204
- `GET /attachments/{id}/download` — downloads attachment file

#### 6.4.6. Comments

- `PATCH /comments/{id}` — updates comment body
- `DELETE /comments/{id}` — deletes comment; 204

#### 6.4.7. Inbox

- `GET /inbox/status` — returns `last_scanned_at`
- `GET /inbox/counts` — returns per-window email counts and all-sorted flags
- `GET /inbox/sorted-counts` — returns `{email_id: [sorted, total]}` for all emails with extracted opportunities
- `GET /inbox/scan/active` — returns active scan run id or null
- `POST /inbox/scan` — scans Gmail inbox via Claude; deduplicates and stores new emails; runs in background; 202
- `GET /inbox` — lists stored emails; accepts `from_date` and `to_date` query params
- `GET /inbox/{id}` — returns email; 404 if not found
- `DELETE /inbox/{id}` — deletes email and its extracted opportunities; 204
- `POST /inbox/{id}/extract` — extracts opportunities from email via Claude; returns created opportunities
- `GET /inbox/{id}/opportunities` — lists EmailOpportunity records for an email
- `PATCH /inbox/opportunities/{id}` — updates EmailOpportunity status and optional opportunity_id
- `DELETE /inbox/clear` — deletes all inbox scan results (emails + extracted opportunities); 204

#### 6.4.8. Agent runs

- `GET /agent-runs` — lists all agent runs, newest first
- `GET /agent-runs/{id}` — returns agent run metadata and status
- `POST /agent-runs` — starts agent run; streams output as SSE; each line is a `StreamEvent` JSON object; stream ends with exactly one terminal event: `done`, `cancelled`, or `error`; absence of a terminal event before connection close indicates abnormal termination
- `DELETE /agent-runs/{id}` — cancels active run; aborts in-flight SDK request via `ClaudeService.cancel()`; marks the run `cancelled` in the DB

---

## 7. UI

### 7.1. Controls

This section defines shared, reusable, domain-agnostic components for common UI patterns: buttons, edits, lists, dialogs, panes, etc.
All these components can be used in any domain as a shared library of general-purpose UI primitives.

Source lives in `ui/src/shared/controls/`.

#### 7.1.0. Primitives

Source lives in `ui/src/shared/controls/`.

Spinner — 16px rotating loader icon (`Loader2` from Lucide, `spinning` class). No props.

Tooltip — Radix tooltip wrapper:

- content: string
- children: ReactNode — trigger element (rendered via `asChild`)
- side?: 'top' | 'right' | 'bottom' | 'left' (default: 'right')
- delayMs?: number (default: 500)

Avatar — circular avatar image with fallback icon (`Building`):

- url?: string — image URL; shows fallback icon if absent
- size?: 'sm' | 'md' | 'lg' (default: 'md') — maps to 24/36/48px
- alt?: string
- className?: string

DateLabel — displays a date as relative ("3 hours ago") or absolute ("2026-05-29 14:30"); clicking toggles mode; mode persisted via `DateFormatContext`:

- date: string | Date
- className?: string

DatePicker — inline date input with clear action:

- value: string | null
- placeholder?: string
- readOnly?: boolean
- onSave: (v: string | null) => void

MonthPicker — month+year selector (no day):

- value: string | null — ISO date string (day ignored)
- placeholder?: string
- readOnly?: boolean
- onSave: (v: string | null) => void

Flow — horizontal or vertical step-flow indicator; each step is a clickable tab; active step highlighted:

- steps: FlowStep[]
- value: string — key of the active step
- onChange: (key: string) => void
- direction?: 'horizontal' | 'vertical' (default: 'horizontal')
- disabled?: boolean

FlowStep:

- key: string
- label: string
- icon?: LucideIcon

#### 7.1.1. Buttons

Source lives in `ui/src/shared/controls/buttons/`.

All buttons apply `hoverable` for hover feedback.

IconButton — square icon button; forwards ref and spreads all HTML button attributes so it works as a Radix `asChild` trigger:

- icon: LucideIcon
- label: string — used as tooltip content
- tooltip?: boolean — show tooltip on hover (default: true)
- onClick?: (e: MouseEvent) => void
- active?: boolean
- danger?: boolean
- disabled?: boolean
- size?: number | 'sm' | 'md' (default: 'md')
- className?: string
- iconClassName?: string

ToggleButton — two-state icon button:

- pressed: boolean
- onPressedChange: (v: boolean) => void
- icon: LucideIcon
- activeIcon?: LucideIcon
- label: string

DropdownButton — composable dropdown menu with custom trigger:

- trigger?: ReactNode — the element that opens the menu; rendered via Radix `asChild`
- items: DropdownItem[]
- align?: 'start' | 'end' — menu alignment relative to trigger (default: 'start')
- className?: string — Tailwind classes applied to the menu content panel (default: 'min-w-40')

DropdownItem:

- label?: string — display text
- divider?: boolean — renders a horizontal separator; all other fields ignored when true
- header?: boolean — renders a non-interactive uppercase section label; all other fields ignored when true
- onClick?: () => void — click handler; ignored if `divider` or `header` is true
- icon?: ReactElement — left-aligned icon; space only reserved when at least one item has an icon
- checked?: boolean — right-aligned checkmark; space only reserved when at least one item has a checkmark
- disabled?: boolean — non-interactive and styled as disabled
- danger?: boolean — styles item in danger/red color

UploadButton — file input trigger with optional size validation:

- onFileSelect: (file: File) => void
- accept?: string
- maxSizeBytes?: number
- label?: string
- disabled?: boolean

ScoreBadge - colored badge displaying a numeric score (0–10) as a grade letter with contextual color, `font-medium`:

- score: number (0–10)
- size?:
  - `sm` - `p-1 text-sm rounded-sm`
  - `md` - `p-2 text-base rounded`

Grade mapping (score to color token):

- A (9.0–10.0): `score-a` — filled bg + white text (Excellent)
- B (7.0–8.9): `score-b` — border + text only (Good)
- C (5.0–6.9): `score-c` — border + text only (Average)
- D (3.0–4.9): `score-d` — border + text only (Below average)
- E (1.0–2.9): `score-e` — border + text only (Poor)
- F (0.0): `score-f` — border + text only, neutral stone (unscored)

#### 7.1.2. Edits

Source lives in `ui/src/shared/controls/edits/`.

InlineEdit — single-line inline text editor; blur or Enter submits, Escape cancels:

- value: string
- placeholder?: string
- className?: string
- bare?: boolean — omits border styling when true
- readOnly?: boolean
- allowEmpty?: boolean
- doubleClickToEdit?: boolean
- disabled?: boolean
- onSubmit: (v: string) => void
- onCancel?: () => void

TextEdit — multiline text editor with edit/preview toggle; supports controlled and uncontrolled editing state:

- value: string
- placeholder?: string
- header?: string — small label rendered above content
- readOnly?: boolean
- doubleClickToEdit?: boolean — enter edit mode on double-click
- alwaysEditing?: boolean — always shows textarea; debounces submit on change
- editing?: boolean — controlled editing state
- onEditingChange?: (editing: boolean) => void — controlled editing state callback
- disabled?: boolean
- onSubmit: (v: string) => void
- onCancel?: () => void

DateEdit — inline date picker with clear action:

- value: string | null
- placeholder?: string
- readOnly?: boolean
- onSave: (v: string | null) => void

DropdownEdit — searchable dropdown selector using a Radix Popover:

- value: string
- options: DropdownEditOption[]
- placeholder?: string
- onChange: (value: string) => void
- autoFocus?: boolean
- filterMode?: 'filter' | 'jump' — 'filter' hides non-matching options; 'jump' scrolls to first match

DropdownEditOption:

- value: string
- label: string
- icon?: ReactNode

CountryEdit — country selector built on DropdownEdit; options sourced from Countries utility with flag icons:

- value: string
- onChange: (value: string) => void
- placeholder?: string
- autoFocus?: boolean

#### 7.1.3. Views

Source lives in `ui/src/shared/controls/views/`.

TimeWindowRow — selectable row for a time window filter; shows icon, label, count, and optional attention dot:

- label: string
- icon: LucideIcon
- selected: boolean
- onClick: () => void
- count?: number
- allSorted?: boolean — attention dot shown only when `allSorted === false` (strict; `undefined` suppresses it)

TimeWindow (interface):

- key: string
- label: string
- icon: LucideIcon

`TIME_WINDOWS` — shared constant list of time windows (All, Today, Yesterday, Last 7 days, Last 30 days); source lives in `ui/src/shared/controls/views/TimeWindowTypes.ts` alongside `TimeWindowRow`

`getDateRange(windowKey)` — returns `{from_date?, to_date?}` for use as API query params; `'all'` returns `{}`

`filterByTimeWindow(items, windowKey)` — filters any list of `{created_at: string}` items by the given window key; `'all'` returns the full list unchanged

ListView — scrollable vertical list with loading, empty, and single-select states; `px-2` horizontal padding:

- items: T[]
- renderItem: (item: T, isSelected: boolean) => ReactNode
- onSelectItem?: (item: T) => void — fired on row click; ListView tracks selected item internally
- getItemKey?: (item: T) => string — key extractor; defaults to index
- emptyState?: ReactNode
- isLoading?: boolean

GroupView — collapsible named section with header, optional count, status, and action buttons:

- label: ReactNode
- count?: number — shown next to label when provided
- actions?: GroupAction[]
- status?: ReactNode — right-aligned status content (e.g. spinner + text)
- collapsible?: boolean — shows collapse toggle when true
- isCollapsed?: boolean — controlled collapsed state
- onToggle?: () => void — controlled toggle callback
- onExpand?: () => void — called when group is expanded
- children: ReactNode

GroupAction:

- icon: LucideIcon
- label: string — tooltip
- onClick: () => void
- expandGroup?: boolean — expands the group when action is clicked
- disabled?: boolean
- size?: 'sm' | 'md'

GroupedListView — list of named sections each rendered via GroupView:

- groups: Group<T>[]
- row: (item: T) => ReactNode
- hideEmptyGroups?: boolean
- collapseEmptyGroups?: boolean — empty groups start collapsed but remain visible
- showGroupDividers?: boolean
- groupBy?: (item: T) => string — when provided, overrides `groups` structure; all items from all groups are re-bucketed by the return value
- groupByKeys?: string[] — predefined group keys to always include (even if empty) when `groupBy` is set
- groupSortKey?: (groupKey: string) => number — sort order for dynamic groups; lower = higher in list; defaults to alphabetical
- groupLabelDetail?: (groupKey: string) => ReactNode — rendered right-aligned in the group header via `GroupView.status`

Group<T>:

- key: string
- label: string
- count?: number
- items: T[]
- actions?: GroupAction[]

ShowMoreView — collapses content to a fixed height with a "Show more" toggle:

- children: ReactNode
- collapsedHeight?: number (default: 200)
- forceExpanded?: boolean — bypasses collapse when true

ValueRow — labelled inline-edit row for displaying and editing a single named value; two-column grid (10rem label + flex value):

- type: `'string'` — `InlineEdit`; props: `value: string`, `placeholder?`, `allowEmpty?`, `onSubmit: (v: string) => void`
- type: `'number'` — `InlineEdit` with numeric coercion; props: `value: number | null | undefined`, `placeholder?`, `onSubmit: (v: number | null) => void`
- type: `'boolean'` — read-only italic "toggle" placeholder; props: `value: boolean`, `onSubmit: (v: boolean) => void`

EmptyState — pane-level placeholder with optional actions:

- icon: LucideIcon
- title: string
- description?: string
- className?: string
- primaryButton?: EmptyStateAction
- secondaryButton?: EmptyStateAction

#### 7.1.4. Dialogs

Source lives in `ui/src/shared/controls/dialogs/`.

BaseDialog — base modal shell used by all dialogs; title bar with close button, Radix portal + overlay:

- open: boolean
- onOpenChange: (v: boolean) => void
- title: string
- width?: string — Tailwind width class (default: 'w-[440px]')
- children: ReactNode

ConfirmationDialog — generic confirmation for destructive actions:

- open: boolean
- onOpenChange: (v: boolean) => void
- title: string
- body: string
- primaryActionLabel: string
- secondaryActionLabel?: string
- severity?: 'info' | 'warning' | 'danger' | 'success'
- onConfirm: () => void
- onCancel?: () => void
- isSubmitting?: boolean

ValueDialog — generic modal for collecting a single value:

- open: boolean
- onOpenChange: (v: boolean) => void
- title: string
- children: ReactNode
- onSubmit: () => void
- submitLabel?: string
- isSubmitting?: boolean

FilePreviewDialog — previews a file with download and open actions:

- open: boolean
- onOpenChange: (v: boolean) => void
- fileType: string
- filePath: string
- title?: string

ScoreDialog — displays AI score details (pros/cons) with rescore action; score_explanation is a JSON string `{pros: string[], cons: string[]}`:

- open: boolean
- onOpenChange: (v: boolean) => void
- score: number | null | undefined
- explanation: string | null | undefined
- title?: string | null
- organizationName?: string | null
- url?: string | null
- onRescore?: () => void

#### 7.1.5. Panes

Source lives in `ui/src/shared/controls/panes/`.

Panes — horizontal flex container filling remaining space; clips overflow. No props. No styling.

Pane — vertical flex column:

- width?: number — fixed width in pixels; omit for flex-fill
- minWidth?: number — minimum width in pixels; defaults to 200
- className?: string — additional Tailwind classes

PaneHeader — fixed-height header bar with bottom border; space-between layout; `min-h-[57px]`; title is `text-lg font-semibold`:

- icon?: LucideIcon — left-aligned icon before the title
- title: string
- actions?: ReactNode — right-aligned content (icon buttons, etc.)

PaneBody — scrollable content area:

- children: ReactNode

PaneResizeHandle — draggable vertical divider, `w-[4px]`, has vertical line in the center (`before` pseudo with `w-px bg-frame-light`); cursor is `col-resize` on hover; expands hit area by 50% on either side via negative margins:

- onResize: (delta: number) => void — fired on drag with pixel delta

### 7.2. Styling

This section defines shared, reusable, domain-agnostic Tailwind v4 tokens and utilities.
All these tokens and utilities can be used in any domain as a shared library of general-purpose UI styling primitives.

All styling must use Tailwind utility classes. Never use `style` for colors, spacing, typography, borders, shadows, or layout - these all have Tailwind equivalents.
Inline `style` is permitted only when the value is a JavaScript expression computed at runtime (e.g. `style={{ width: paneWidth }}`), not a hardcoded literal.
Do not add new CSS rules to `index.css` except to define new design tokens or utilities.

Source lives in `ui/src/index.css`.

Structure of `index.css`:

1. `@import "tailwindcss"` — Tailwind v4 entry point
2. `@theme { }` — design token definitions as CSS custom properties (`--color-*`); light mode values only
3. `:root { }` — base typography, `color-scheme: light dark`
4. `@media (prefers-color-scheme: dark) { :root { } }` — dark mode token overrides; tokens are remapped (e.g. `panel-white` becomes near-black) so component code never branches on color scheme
5. `@layer base { }` — global element resets (box-sizing, html/body/root height, button/input/label defaults)
6. `@utility <name> { }` — one block per custom utility; used for design system utilities (`hoverable`, `shade-*`, button variants, etc.)

Dark mode is fully automatic via `prefers-color-scheme` — no manual toggling, no `.dark` class, no JS involvement. All token scales invert naturally: `panel-white` is white in light mode and near-black in dark mode, so the same class names work in both modes.

Viewport is fixed: `html`, `body`, `#root` are `height: 100%; overflow: hidden`.

#### 7.2.1. Color tokens

Token families:

- panel tokens are for background color only (`bg-panel-*`)
- label tokens are for text color only (`text-label-*`)
- frame tokens are for border/divider color only (`border-frame-*`, `divide-frame-*`).
- semantic tokens are role-specific (e.g. `bg-action` for primary buttons, never used outside that context)

Never mix token families across roles (e.g. do not use a panel token for text or a label token for a background).

Panel tokens (light / dark):

- `panel-white`: `#ffffff` / `#0c0a09` — page body, modal surfaces
- `panel-lightest`: `#fafaf9` / `#1c1917` — top-level panel backgrounds
- `panel-lighter`:  `#f5f5f4` / `#292524` — inner panels, sidebars, filter panes
- `panel-light`: `#e7e5e4` / `#44403c` — nested sections, card backgrounds
- `panel-medium`: `#d6d3d1` / `#57534e` — hover states, subtle fills
- `panel-dark`: `#a8a29e` / `#a8a29e` — active/selected states
- `panel-darker`: `#78716c` / `#d6d3d1` — strong contrast surfaces
- `panel-darkest`: `#57534e` / `#f5f5f4` — inverted surfaces
- `panel-black`: `#1c1917` / `#fafaf9` — maximum contrast backgrounds

Label tokens (light / dark):

- `label-white`: `#fafaf9` / `#292524` — on dark/inverted surfaces
- `label-lightest`: `#f5f5f4` / `#44403c` — on dark surfaces
- `label-lighter`: `#e7e5e4` / `#57534e` — decorative or disabled
- `label-light`: `#d6d3d1` / `#78716c` — secondary, placeholder
- `label-medium`: `#a8a29e` / `#a8a29e` — tertiary labels, metadata
- `label-dark`: `#78716c` / `#d6d3d1` — default body text
- `label-darker`: `#57534e` / `#f5f5f4` — headings, emphasis
- `label-darkest`: `#1c1917` / `#fafaf9` — maximum contrast
- `label-black`: `#0c0a09` / `#ffffff` — pure black text

Frame tokens (light / dark):

- `frame-white`: `#ffffff` / `#292524` — on dark surfaces
- `frame-lightest`: `#f5f5f4` / `#44403c` — subtle row separators
- `frame-lighter`: `#e7e5e4` / `#57534e` — low-emphasis separators
- `frame-light`: `#d6d3d1` / `#44403c` — default input and card borders
- `frame-medium`: `#a8a29e` / `#57534e` — focused inputs, active outlines
- `frame-dark`: `#78716c` / `#78716c` — high-contrast dividers
- `frame-darker`: `#57534e` / `#a8a29e` — deeper border
- `frame-darkest`: `#1c1917` / `#d6d3d1` — near-black border
- `frame-black`: `#0c0a09` / `#f5f5f4` — maximum contrast border

Semantic tokens (light / dark):

- `action`: `#3478f6` — bg color for primary buttons (same in light and dark)
- `action-text`: `#ffffff` / `#0f172a` — text color for primary buttons
- `input`: `#3b82f6` — focus ring color for inputs (same in light and dark)
- `intent-info`: `#3b82f6` / `#60a5fa` — bg color for info states
- `intent-info-text`: `#ffffff` / `#0f172a` — text color for info states
- `intent-warning`: `#f59e0b` / `#fbbf24` — bg color for warning states
- `intent-warning-text`: `#ffffff` / `#0f172a` — text color for warning states
- `intent-danger`: `#ef4444` / `#f87171` — bg color for error/destructive states
- `intent-danger-text`: `#ffffff` / `#0f172a` — text color for error/destructive states
- `intent-success`: `#22c55e` / `#4ade80` — bg color for success states
- `intent-success-text`: `#ffffff` / `#0f172a` — text color for success states
- `score-a`: `#65a30d` / `#84cc16` — grade A (Excellent); used as filled bg + `score-text` foreground
- `score-b`: `#92aa40` / `#b8e060` — grade B (Good); used as border + text color
- `score-c`: `#c88840` / `#f0c040` — grade C (Average); used as border + text color
- `score-d`: `#c87848` / `#f09060` — grade D (Below average); used as border + text color
- `score-e`: `#c86060` / `#e86060` — grade E (Poor); used as border + text color
- `score-f`: `#a8a29e` / `#a8a29e` — grade F (unscored); used as border + text color
- `score-text`: `#ffffff` / `#0f172a` — text color for filled (Excellent) badges only

#### 7.2.2. Layout utilities

- `devmod` — applies `bg-rose-300/50` (for layout debugging)
- `one-liner` — single-line truncation with ellipsis
- `shade-xs`, `shade-sm`, `shade-md`, `shade-lg`, `shade-xl` — box-shadow depth scale
- `hoverable` — subtle bg darkening on hover
- `hoverable-inverse` — subtle bg lightening on hover (for dark surfaces)
- `hoverable-text` — darkens text on hover
- `hoverable-text-inverse` — lightens text on hover
- `hovered` — statically applies the hover state (for active items)
- `container-full` — full width, 16px horizontal padding
- `container-wide` — max-width 1200px, centered, 24px horizontal padding

#### 7.2.3. Button utilities

The below button utilities apply to buttons only (`button`, DropdownButton, etc.).

- `primary` — `bg-action`, `text-action-text`, borderless
- `secondary` — `bg-transparent`, `border-frame-light`, `text-label-darker`, with hoverable border darkening
- `auxiliary` — borderless, transparent bg; for icon buttons in chrome (e.g. close dialog, toolbar actions)
- `danger` — filled destructive button (red)
- `warning` — filled warning button (amber)
- `info` — filled info button (blue)
- `success` — filled success button (green)
- `hyperlink` — underlined link style
- `hyperlink-subtle` — link style, underline on hover

#### 7.2.4. Component utilities

- `spinning` — infinite rotation animation (0.7s linear); used by the `Spinner` component
- `attention-dot` — 8px filled circle in `action` color; used for inbox and email unsorted indicators
- `steps` — flex row of step tabs (no list style)
- `step-tab` — tab item; `.active` highlights with action color; `.done` highlights with success color

#### 7.2.5. Typography utilities

Override Tailwind's default `text-*` sizes with custom px values:

- `text-xs` — 11px / 1.4
- `text-sm` — 12px / 1.4
- `text-base` — 14px / 1.45
- `text-lg` — 16px / 1.4
- `text-xl` — 20px / 1.3

### 7.3. Utils

Source lives in `ui/src/shared/utils/`.

`FormatUtils` — shared formatting helpers:

- `formatCount(n)` — `""` for 0, `String(n)` otherwise
- `formatDuration(seconds)` — `"1h 2m 3s"` (omits zero parts)
- `formatDate(value)` — today → `"HH:MM"`; this year → `"May 29"`; older → `"2026-05-29"`
- `formatTimestamp(value)` — `"Today at 14:30"`, `"Yesterday at 09:00"`, `"May 29 at 14:30"`
- `formatPay(min, max, currency, period)` — `"80,000–100,000 EUR/year"` or null if no values
- `formatDateAgo(value)` — `"just now"`, `"3 minutes ago"`, `"2 days ago"`, etc.
- `pluralize(count, singular, plural)` — returns singular if count === 1, plural otherwise

`ToastUtils` — thin wrapper around react-toastify:

- `toastError(message)` — red toast, bottom-center
- `toastInfo(message)` — info toast, bottom-center

`Countries` — static list of ISO 3166-1 countries with `code`, `name`, and `countryFlag(code)` emoji helper; used by `CountryEdit`.

`LocalStorageUtils` — typed wrapper around `localStorage`:

- `get<T>(key, fallback)` — reads and JSON-parses; returns fallback if absent or unparseable
- `set<T>(key, value)` — JSON-serializes and writes
- `remove(key)` — removes the key

### 7.4. API Client

Source lives in `ui/src/services/client.ts`.

Hand-written typed API client. Thin `fetch` wrapper organized by resource (e.g. `profile`, `opportunities`, `inbox`). Used by query hooks only — never imported directly by pages or components.

- wraps `fetch` via a shared `apiFetch<T>` helper
- throws `ApiError` (with `status`, `code`, `message`, `details`) on non-2xx responses
- maps each method to one endpoint with inline TypeScript response types
- has no business logic — only fetch, serialize, deserialize

### 7.5. API Queries

Source lives co-located with their domain under `ui/src/app/<domain>/`, e.g.:

- `ui/src/app/opportunities/useOpportunities.ts`
- `ui/src/app/inbox/useInbox.ts`

TanStack Query (React Query) hooks manage all server state. Each query hook:

- wraps one or more `ApiClient` calls
- exposes query/mutation state to the page
- has no business logic — only fetch, cache, invalidate

### 7.6. App Routes

Source lives in `ui/src/app/AppRoutes.tsx`.

`AppRoutes` — exported `RouteObject[]`; imported by `index.tsx` to create the browser router via `createBrowserRouter`. All pages are lazy-loaded.

Routes:

- `/` — App
  - `/` — redirect to `/opportunities/jobs`
  - `/onboarding` — OnboardingPage
  - `/opportunities` — OpportunityPage (layout shell)
    - `/opportunities` — redirect to `/opportunities/jobs`
    - `/opportunities/jobs` — JobListPage
    - `/opportunities/jobs/:id` — JobListPage with detail pane open
    - `/opportunities/projects` — ProjectListPage
    - `/opportunities/education` — EducationListPage
    - `/opportunities/networking` — NetworkingListPage
    - `/opportunities/learning` — LearningListPage
  - `/inbox` — InboxPage (layout shell)
    - `/inbox` — InboxListPage
    - `/inbox/:id` — InboxListPage with detail pane open
  - `/profile` — ProfilePage (layout shell)
    - `/profile` — redirect to `/profile/info`
    - `/profile/info` — ProfileIdentityPage
    - `/profile/work-experience` — ProfileWorkExperiencePage
      - `/profile/work-experience` — redirect to `/profile/work-experience/resume`
      - `/profile/work-experience/resume` — ResumeDetailPane
      - `/profile/work-experience/:id` — WorkExperienceDetailPane
    - `/profile/job-preferences` — ProfileJobPreferencesPage
    - `/profile/voice-settings` — ProfileVoiceSettingsPage
  - `*` — redirect to `/opportunities/jobs`
- `*` — redirect to `/onboarding`

### 7.7. App

Source lives in `ui/src/app/`.

`App` — root component; wraps everything in `QueryClientProvider` and `RadixTooltip.Provider`; mounts `ToastContainer` (bottom-center, 3s auto-close).

`AppShell` — layout shell; fetches `GET /system/status` on mount; shows full-screen spinner while loading. Routing logic:

- On `/onboarding`: if profile exists, redirect to `/`; otherwise render `<Outlet/>`
- On any other route: if no profile, redirect to `/onboarding`
- Otherwise: wrap `<Outlet/>` in `AppContext.Provider` with status; render `<Sidebar/>` on the left and `<main>` on the right

`AppContext` (`ui/src/app/AppContext.tsx`) — holds system status and loading state; consumed by any component needing global status.

Pages use a three-pane layout: Filter pane — List pane — Detail pane. Each pane owns its own vertical scroll area and never scrolls horizontally.

### 7.8. Sidebar

Source lives in `ui/src/app/`.

Fixed-width (`w-14`) vertical strip. `bg-panel-lighter`. Always visible after onboarding. Never collapses, never resizes, never scrolls.

Top-aligned navigation buttons (Radix Tooltip + button):

- Profile — navigates to `/profile/info`; active when on `/profile`; shows avatar image if `avatar_file_name` is set, falls back to `User` icon
- Inbox — navigates to `/inbox`; active when on `/inbox`; shows an attention dot when any time window has `count > 0 && !all_sorted` (fetched from `GET /inbox/counts`)
- Opportunities — navigates to `/opportunities`; active when on `/opportunities`

Active button: action-colored icon + `hovered` background.

Button flash: when an opportunity is added or removed, the Opportunities button briefly flashes — blue (`flash-add`) on add, red (`flash-delete`) on remove. Triggered by `flashSidebarButton(button, intent)` from `AppContext`.

### 7.9. Pages

#### 7.9.1. Onboarding

Source lives in `ui/src/app/onboarding/`.

Full-page first-run flow. Shown only when the API reports no profile. Card-style form collects:

- Full name (text input, required)
- Job preferences (textarea, optional)
- Writing style / voice settings (textarea, optional)

On success, calls `POST /profile`, invalidates system status, redirects to `/profile`.

#### 7.9.2. Opportunities

Source lives in `ui/src/app/opportunities/`.

`OpportunityContext` — outlet context passed from `OpportunityPage` to child routes:

- timeWindow: string
- setTimeWindow: (w: string) => void

`OpportunityPage` — three-pane layout shell (`Panes`):

- Filter pane — `PaneHeader` "Opportunities"; `ListView` of `TimeWindowRow` items (All, Today, Yesterday, Last 7 days, Last 30 days) with count, persisted in `localStorage` under `pane.opportunities.timeWindow`, default `'all'`; divider; `ListView` of `OpportunityTypeRow` items (one per type: Jobs, Projects, Education, Networking, Learning) with count scoped to the active time window; clicking navigates to the type's route
- `<Outlet context={OpportunityContext}/>` — renders the active type list page

JobGroupByMode: `'status'` | `'organization_name'` | `'score'` | `'title'` — controls how the Jobs list is grouped; persisted in `localStorage` under `pane.jobs.groupBy`; default is `'status'`

JobGroupByOption — per-mode grouping config:
- label: string — menu item label
- icon: LucideIcon — shown in the Group By dropdown
- groupBy?: (item) => string — bucket function
- groupByKeys?: string[] — predefined keys always present
- groupSortKey?: (key) => number — sort order; lower = higher
- groupLabelDetail?: (key) => ReactNode — right-aligned detail in group header
- hideEmptyGroups: boolean
- collapseEmptyGroups?: boolean

Score grade buckets (used by `'score'` mode): Excellent (9.0–10.0), Good (7.0–8.9), Average (5.0–6.9), Below average (3.0–4.9), Poor (0.0–2.9), Unscored — always shown, empty buckets start collapsed; range shown right-aligned in group header.

Type list pages: `JobListPage`, `ProjectListPage`, `EducationListPage`, `NetworkingListPage`, `LearningListPage` — each follows the same pattern:

- List pane — `PaneHeader` with type label and `ArrowDownUp` Group By dropdown (Jobs only: "Group by" header + Status / Score / Company / Title, each with icon, mutually exclusive with checkmarks); `AddJobBar` below header; `GroupedListView` grouped per `JobGroupByMode`; items pre-filtered by `timeWindow` from `OpportunityContext`; default (status): New (opened), Shortlisted (shortlisted), In progress (started), Completed (completed), Archived (closed, collapsed by default); Title mode groups A–Z by first letter, then `#` for non-alpha
  - Each row: `JobRow` (or equivalent) — avatar, title, organization, score badge; clicking navigates to `…/:id`
- Detail pane — `JobView` (or equivalent) when `:id` selected, otherwise `EmptyState`

`JobView` — detail view for a Job opportunity:

- Toolbar: `Flow` status stepper; scoring area (spinner + elapsed timer while sourcing; "Re-score" / "Score" button; `ScoreBadge` opens `ScoreDialog`)
- Header: URL link with avatar, editable title (`InlineEdit`), editable organization name (`InlineEdit`); `OpportunityMenu` (kebab)
- Pay section (if present)
- Cover letters section: `GroupView` with "Generate cover letter" action; `ListView` of `AttachmentRow`; spinner with elapsed timer while generating
- Description section: `GroupedListView` with "Edit" action; `ShowMoreView` wrapping `TextEdit`
- Similar opportunities section: collapsible `GroupView` with count; hidden when empty; renders `SimilarOpportunityRow` per item; positioned just above Notes
- Notes section: `GroupedListView` with "Add note" action; `CommentRow` per note

`OpportunityMenu` — `DropdownButton` with `IconButton` trigger:

- Visit URL (disabled when no URL set)
- (divider)
- Set URL… (opens `ValueDialog` with URL input pre-filled; disabled while sourcing) — calls `PATCH /opportunities/{id}/url`
- Re-score (disabled while sourcing)
- Generate cover letter (Job only; disabled while sourcing or generating)
- (divider)
- Merge into… (opens `MergeIntoDialog`)
- (divider)
- Delete… (opens `ConfirmationDialog`)

`CommentRow` — note row with hover `CommentMenu` (Edit, Delete); new note row submits on Enter, cancels on Escape/blur.

`SimilarOpportunityRow` — row in the "Similar opportunities" group; entire row is clickable and navigates to the neighbor opportunity:

- Shows avatar, title – organization name, similarity percentage (e.g. "97% match") right-aligned
- **More** menu (`MoreVertical` icon, `sm` `IconButton`), visible on hover only — contains one item: **Merge here** (`SquaresUnite` icon) — opens `ConfirmationDialog`: `"[title]" will be deleted. Its notes and job description will be moved here as a note. This cannot be undone.`; on confirm calls `POST /opportunities/{id}/absorb/{neighbor_id}`

`MergeIntoDialog` — manual merge picker; opened from **Merge into…** in `OpportunityMenu`:

- Lists all jobs except the current one, sorted by similarity score desc (known pairs first, rest at bottom)
- Each row: avatar, title, organization name, similarity % (if known), `ScoreBadge`; clicking selects the row
- "Merge into selected…" button (disabled until selection) — opens a `ConfirmationDialog`: `"This opportunity will be deleted. Its notes and job description will be moved to "[selected title]" as a note. This cannot be undone."`; primary action label "Merge now"
- On confirm: calls `POST /opportunities/{canonical_id}/absorb/{this_id}` (roles reversed vs. Absorb); navigates to canonical

#### 7.9.3. Inbox

Source lives in `ui/src/app/inbox/`.

`InboxPage` — three-pane layout shell:

- Filter pane — `PaneHeader` "Inbox" with scan controls (spinner + elapsed + cancel while scanning; "Scan" button + "More" dropdown with "Clear scan results" when idle); `ListView` of `TimeWindowRow` items (All, Today, Yesterday, Last 7 days, Last 30 days) with count and all-sorted indicator; active window persisted in `localStorage` under `inbox.window`, default `'today'`
- `<Outlet/>` — renders `InboxListPage`

`InboxListPage` — two-pane layout (list + detail):

- List pane — `PaneHeader` with active window label and decision count; `ListView` of `InboxEmailRow` (from, subject, date; attention dot if not all sorted)
- Detail pane — `InboxEmailView` when email selected, otherwise `EmptyState`

`InboxEmailView` — detail view for an email:

- Header: subject (left) + "View in Gmail" link (right); from/to, received date (`DateLabel`)
- Body: `ShowMoreView` wrapping `TextEdit` (read-only)
- Extracted opportunities: grouped by type (Job, Project, etc.); each `InboxEmailOpportunityRow` shows title, URL, status (`pending` / `extracted` / `skipped`) with accept/skip actions

`useInboxScan(activeWindow)` — manages the inbox scan lifecycle; used by `InboxPage`:

- On mount, checks `GET /inbox/scan/active` for an already-running scan
- Polls the active `AgentRun` every 2s until terminal status (`completed` | `failed` | `cancelled`)
- On terminal: invalidates `inboxStatus`, `inboxCounts`, `inboxSortedCounts`, `inboxList`, `inboxActiveScan`
- Drives an elapsed timer (seconds since `run.created_at`)
- Returns: `scanning`, `elapsed`, `progress` (`{ current, total, preparing } | null`), `start()`, `cancel()`

#### 7.9.4. Profile

Source lives in `ui/src/app/profile/`.

`ProfilePage` — two-pane layout shell:

- Nav pane — avatar upload (`AvatarUpload`); user's full name; `ListView` of `NavLink` rows: About, Work experience, Job preferences, Writing style
- Detail pane — `<Outlet/>` renders the active section page

`ProfileIdentityPage` (`/profile/info`) — editable personal details:

- Avatar upload
- Full name, email, phone, GitHub URL, LinkedIn URL, website URL, location (all `InlineEdit`)
- Work permits section (`GroupView`): `WorkPermitRow` per permit; "Add" opens `WorkPermitDialog`

`ProfileWorkExperiencePage` (`/profile/work-experience`) — two-pane layout:

- List pane — Resume entry + `ListView` of `WorkExperienceRow`; "+" opens `WorkExperienceDialog`
- Detail pane — `ResumeDetailPane` or `WorkExperienceDetailPane` per route

`ResumeDetailPane` — shows uploaded resume with parse-work-experience action; `UploadButton` to upload new resume

`WorkExperienceDetailPane` — shows work experience details; `WorkExperienceView` with editable fields and projects section (`ProjectRow`, `ProjectDialog`)

`ProfileJobPreferencesPage` (`/profile/job-preferences`) — `TextEdit` for job preferences and job dealbreakers

`ProfileVoiceSettingsPage` (`/profile/voice-settings`) — `TextEdit` for writing style / voice settings

---

## 8. Workflows

### 8.1. Initial setup

- User clones the repo, installs dependencies, and starts the app for the first time.
- System detects no profile and shows the Onboarding page.
- User enters full name, optionally job preferences and writing style.
- System creates Profile and redirects to `/profile`.

### 8.2. Profile

Update profile:

- User navigates to Profile → About.
- User edits identity fields (name, contact info, location, work permits, avatar).
- System creates a new Profile version on each save.

Upload resume and parse work experience:

- User navigates to Profile → Work experience.
- User uploads a PDF/DOC resume via `UploadButton`.
- System stores the file and creates a `Resume` record.
- User clicks "Parse work experience"; system invokes Claude with `parse-work-experience-from-resume.md`.
- On completion, work experience entries are created and appear in the list.

Manage work experience manually:

- User clicks "+" to open `WorkExperienceDialog`; fills in company, role, dates, description, skills.
- User can add projects to each work experience entry via `ProjectDialog`.

### 8.3. Opportunities

View opportunities:

- User opens Opportunities page; selects a type (Jobs, Projects, etc.) from the filter pane.
- System shows matching opportunities grouped by status.
- User clicks a row to open the detail pane.

Create opportunity:

- User clicks "+" and pastes a URL (e.g. a job posting link).
- System creates a new opportunity record and immediately triggers sourcing; returns existing if URL already present (toast: "Already in your list").

Source opportunity:

- User opens an opportunity and clicks "Score" (or "Re-score").
- System calls `POST /opportunities/{id}/source`; Claude fetches the job page via `WebFetch`, enriches fields, and scores against the user profile and work experience.
- System saves the updated version; `Flow` status, score badge, and fields update in the detail view.
- Elapsed timer shown while sourcing; user can cancel.

Generate cover letter (Job-specific):

- User opens a Job opportunity and clicks "Generate cover letter".
- System calls `POST /opportunities/{id}/cover-letter`; Claude produces a Markdown cover letter using the opportunity, profile, and work experience; cover letter is rendered to PDF.
- PDF is saved under `db/attachments/` and an `Attachment` record is created.
- Elapsed timer shown while generating; user can cancel.
- User sees the new cover letter in the Cover letters section and can preview or delete it.

### 8.4. Inbox

Scan inbox:

- User opens Inbox page and clicks the scan button.
- System calls `POST /inbox/scan`; returns `run_id` immediately; sets `AgentRun.meta = { current: 0, total: 0, preparing: true }`; scan runs in the background until all emails are processed.
- Preflight: Claude paginates Gmail with `max_results=500` until all pages are exhausted to get an accurate total count. On completion, sets `AgentRun.meta.preparing = false` and `total = N`.
- Query uses `after:{last_scanned_at}` if a prior scan completed, otherwise `after:{today - scan_days}`.
- UI shows "Preparing scan… Xs" while `preparing` is true, then "Scanning {current}/{total} emails for Xs…" once preflight completes.
- System scans in batches of `scan_batch_size`, paginating via Gmail `pageToken`, until no more results. After each batch: deduplicates by `external_id`, stores new `InboxEmail` records, creates `EmailOpportunity` stubs (`status: pending`, `organization_name` populated from scan output), and updates `AgentRun.meta.current`. Before each batch, checks run status — exits immediately if cancelled.
- On completion, scan run is marked `completed`; on any exception, marked `failed`. `last_scanned_at` is derived from the most recent completed scan run's `completed_at`.
- Each batch is a separate Claude invocation; the scan-level `AgentRun` is managed by the scan coroutine via `AgentRunHandle` (not delegated to `_generate_stream`). The coroutine is started via `ClaudeService.create_task(run_id, coro_factory)` so it participates in the shared task registry and can be cancelled via `DELETE /agent-runs/{id}`.
- Scan parameters are configured in `config.yml` under `inbox`: `scan_days`, `scan_batch_size`, `scan_keywords`.
- Inbox page shows newly surfaced emails; attention dot appears on emails and sidebar until triaged.

Triage email opportunities:

- User opens an email; extracted `EmailOpportunity` items are shown grouped by type.
- User clicks "Save" to save; `EmailOpportunity` status set to `extracted`, an associated `Opportunity` is created and sent for sourcing.
- User clicks "Save" to un-save; `EmailOpportunity` status set to `pending`, the associated `Opportunity` is deleted and any active agent run on it is canceled.
- User clicks "Decline" to skip; `EmailOpportunity` status set to `skipped`; if associated `Opportunity` existed, it is deleted and any active agent run on it is canceled.
- User clicks "Decline" to un-skip; `EmailOpportunity` status set to `skipped`.
- When all email opportunities for an email are triaged, the attention dot clears for that email.
- When all emails are triaged for the selected filter group, the attention dot clears for that filter group.

### 8.5. Opportunity similarity

Detect similar opportunities (automatic, runs after each sourcing):

- After sourcing completes, system assembles an embed string by joining non-null fields with ` | `: `{organization_name} × 5 | {title} | {organization_unit_name}` — org name is repeated 5 times to increase its weight in the vector (`organization_unit_name` is ephemeral — from sourcer output, not persisted). If no fields are present, stops — not enough signal.
- System encodes the string locally via `EmbeddingService`, stores the vector in `opportunity_embedding`.
- System queries `sqlite-vec` for the top-5 nearest neighbors by cosine distance; excludes the opportunity itself and any already-dismissed pairs.
- Any neighbor with cosine similarity ≥ 0.5 is written to `opportunity_similarity` as `(min(id_a, id_b), max(id_a, id_b), similarity)` — upserted.
- "Similar opportunities (N)" `GroupView` appears just above Notes in `JobView` for any opportunity with undismissed matches.

Absorb a duplicate opportunity (two entry points):

1. **From Similar opportunities row** — user opens More menu, clicks **Merge here**; `ConfirmationDialog` confirms; calls `POST /opportunities/{id}/absorb/{neighbor_id}`.
2. **From Merge into…** — user opens `OpportunityMenu`, clicks **Merge into…**; selects canonical in `MergeIntoDialog`; confirms; calls `POST /opportunities/{canonical_id}/absorb/{current_id}` (roles reversed).
- Server keeps canonical's version fields unchanged; relinks duplicate's comments to canonical; creates a new note dated to duplicate's `created_at` with a meta line `"Copied from [title – org] (url)"` (url omitted if absent; plus `" · Pay: {currency}{min} – {currency}{max}/{period}"` if duplicate has pay data) followed by the duplicate's description if present; hard-deletes duplicate; deletes similarity row.
- UI invalidates the opportunities list and all cached similar-opportunity queries; navigates to the list page.