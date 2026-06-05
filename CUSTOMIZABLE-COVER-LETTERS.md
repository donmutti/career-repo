# Customizable Cover Letters

## Problem

Cover letters are generated from a fixed profile writing style. Some opportunities have a distinct personality — a bro-coded careers page, a quirky team vibe — that warrants a one-off tone. The user should be able to tweak the writing style for a single generation without touching their profile.

## Solution

Intercept the "Generate cover letter" action with a dialog. The dialog shows a `TextEdit` pre-filled with the profile's `voice_settings`. The user edits it ephemerally — changes are not saved to the profile — and submits. The edited text is passed as `instructions` in the request body to `POST /opportunities/{id}/cover-letter` and forwarded to the Claude prompt.

## Changes

### API — `POST /opportunities/{id}/cover-letter`

Request body (was empty):

- `instructions`: string (optional) — overrides `profile.active_version.voice_settings` for this generation only; if absent, the profile value is used as before

The endpoint passes `instructions` into the Claude payload. The `generate-attachment.md` command already reads `profile.active_version.voice_settings` as the highest-priority tone instruction — with this change, the payload carries an additional top-level `instructions` field that the prompt treats as an override when present.

### `generate-attachment.md` prompt

Add a rule before the existing Voice settings guideline:

> **Instructions override**: if `instructions` is present in the input, treat it as the highest-priority tone, style, and voice directive — it supersedes `profile.active_version.voice_settings` entirely. Treat the `instructions` value exactly as you would `voice_settings`.

### UI — `CoverLetterDialog`

New component. `BaseDialog`, title "Generate cover letter", `w-[540px]`.

- `TextEdit` — `alwaysEditing`, pre-filled with `profile.active_version.voice_settings`; placeholder "Describe the tone and style…"; no label needed
- "Generate" primary button — submits; disabled while generating
- "Cancel" secondary button

Dialog state lives in `JobView`. On open, the profile's `voice_settings` is read from the already-loaded `AppContext` system status — no extra fetch needed. On submit, calls `generateCoverLetter({ instructions: value })`.

### `useOpportunity` — `generateCoverLetter`

Change signature from `mutationFn: () => opApi.generateCoverLetter(opportunityId)` to accept an optional payload:

```ts
mutationFn: (payload?: { instructions?: string }) =>
  opApi.generateCoverLetter(opportunityId, payload)
```

### API client — `opportunities.generateCoverLetter`

Add optional body argument: `generateCoverLetter(id, body?)` — passes body as JSON if provided.

### `JobView` and `OpportunityMenu`

- "Generate cover letter" action (both `GroupView` action and `OpportunityMenu` item) opens `CoverLetterDialog` instead of calling `generateCoverLetter()` directly.
- `CoverLetterDialog` is mounted in `JobView` alongside the other dialogs; `OpportunityMenu` receives `onGenerateCoverLetter` as before — no change to its prop contract.

## What does NOT change

- Profile `voice_settings` is never mutated.
- The attachment title format is unchanged: `Cover Letter – {title}`.
- The file path naming is unchanged.
- The `active` run detection and cancellation flows are unchanged.
- All other attachment types are unchanged.
