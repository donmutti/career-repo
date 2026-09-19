# Claude Code Configuration

## 1. Development

Career Repo is a local-first, private career tracker. It runs on the user's own machine: UI at `http://localhost:3000`, API at `http://localhost:8000/api`.

This project uses spec-driven development. SPEC.md is the ground truth, authored by the human developer. Code follows SPEC, never the other way around.

Consult README.md first for the tech stack, prerequisites, and environment setup (Python via `uv`, venv location, etc.) before making changes.

Apply file changes directly without IDE involvement. Use Read/Edit/Write tools.
Files may be created, renamed, moved, or deleted freely to match SPEC.
Never go in circles. All commands complete in one pass.
No commits shall be made. The user commits manually.

There are no automated tests. Do not create test files or add test dependencies.

## 2. Operation

This section is for agents driving the running app on behalf of its user, not for development work.

An agent with shell/HTTP access to the machine running Career Repo can drive the whole product through the API: creating and scoring opportunities, triaging inbox emails, generating cover letters, maintaining the profile, all without opening the UI.

Before operating the app, confirm it's running: `GET /api/system/status` returns `profile_exists`, `active_agent_runs`, and `embedding.status`. If `profile_exists` is false, there's no user to act on behalf of yet. Onboarding (`POST /profile`) must happen in the UI first.

### 2.1. Add Job Opportunity

Trigger: the user pastes a bare URL (a job posting link), optionally with wording like "add this job", "score this", or similar. Bare links with no other context default to this use case.

Steps:

1. `POST /opportunities` with `{"url": "<the link>", "type": "job"}`.
   - On success (201): a new Opportunity is created with `status: opened`.
   - On 409: an opportunity with this URL already exists; the response body includes the existing `id`. Treat this as "already tracked": don't create a duplicate. Report the existing opportunity by proceeding to step 2 with that id (re-scoring is fine if the user asked to score) or just link it if they only asked to add.
2. Report:
   ```
   New opportunity created:
   {ui_url}/opportunities/jobs/{id}

   Scoring...
   ```
3. `POST /opportunities/{id}/source` (202, runs in the background). This makes Claude fetch the job page, enrich fields (organization, title, location, compensation, contract type, etc.), rewrite `description` with the full JD, and score against the user's profile.
4. Poll `GET /opportunities/{id}` (or `GET /opportunities/{id}/agent-runs`) until `score` is populated / no active agent run remains. Sourcing typically takes well under a minute; don't guess a duration up front. Report the actual elapsed time once it completes.
5. Report the result back to the user in this shape, a compact scorecard, not a data dump:

```
Sourced and scored in {elapsed}.

**{score}**
{ui_url}/opportunities/jobs/{id}
{title} · {organization_name} · {location} · {job_contract_type} · {job_pay_max | job_pay_min | job_pay_min – job_pay_max | "$ unknown"}

Pros: {score_explanation.pros}

Cons: {score_explanation.cons}

Source: {url}
```

### 2.2. Other use cases

The same pattern (call the API, poll if async, report a compact human-readable summary rather than raw JSON) applies to the rest of the product:

- **Re-score an opportunity**: same as Add Job Opportunity from step 2 onward, triggered by "re-score this" / "update the score" on an opportunity the user references by title, org, or link.
- **Archive an opportunity**: "archive this", "not interested", "pass on this one" + a reason. `PATCH /opportunities/{id}` with `{"status": "closed", "close_reason": "<reason>"}`. If the user gives no reason, ask for one, archiving always records a reason.
- **Star / unstar**: "star this" / "bookmark this". `PATCH /opportunities/{id}` with `{"is_starred": true|false}`.
- **Add a note**: "note that...", "remember that...". `POST /opportunities/{id}/comments` with `{"body": "<markdown>"}`.
- **Generate a cover letter**: "write me a cover letter for this". `POST /opportunities/{id}/cover-letter` (202, async; accepts optional `instructions` for one-off guidance layered on top of the user's writing-style settings). Report where the PDF landed, not its contents in full.
- **Scan inbox**: "check my email for job stuff", "scan the inbox". `POST /inbox/scan` (async). Report a count of new emails / extracted opportunities, not a list of raw subjects.
- **Triage an inbox opportunity**: "accept that one", "decline it, not relevant". `PATCH /inbox/opportunities/{id}` with `{"status": "extracted"|"skipped", ...}`.
- **Update profile fields**: "add this work permit", "update my job preferences". `PATCH /profile` or the relevant sub-resource (work experience, work permits).

When a request doesn't map cleanly to one of these, inspect the API routers directly for the exact endpoint before improvising a request shape.
