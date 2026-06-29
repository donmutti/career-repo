# Decimal score resolution

## Goal

Bump score resolution from integer 0–10 (11 distinct values) to integer 0–100 (101 distinct values, displays as 0.0–10.0 with 0.1 step). Storage stays integer; UI divides by 10.

## Motivation

Today the scoring agent can only emit `0, 1, 2, … 10`. Two jobs at "7" are indistinguishable. With 0.1 resolution the agent can express nuance ("7.3 vs 7.6"), thresholds (Good = 7.0+) survive small shifts, and ranking stays stable across rescoring runs.

## Scope

### Backend

- `OpportunityVersion.score: Optional[int]` — type unchanged, semantic range becomes 0–100.
- `opportunity_version.score INTEGER` — column unchanged.
- `api/services/ai/agents/source-opportunity.md`:
  - Replace "scale of 0-10" with "scale of 0-100 — represents 0.0–10.0 in the user-facing UI; emit `73` for 7.3, `45` for 4.5, etc."
  - Update calibration anchors: `90+` excellent, `70–89` good, `50–69` average, `30–49` below average, `0–29` poor.
  - Update example JSON: change `"score":8` to `"score":80` (matching the existing pros/cons example).
- `api/services/opportunity/opportunity_service.py` — add post-process guardrail: if returned `score` is non-null and `<= 10`, multiply by 10 (assume agent regressed to old scale) with a single-line warning log. Belt-and-suspenders for prompt regression.
- DAO sort `v.score DESC NULLS LAST` — works unchanged.

### Frontend

- `OpportunityVersion.score: number | null` — type unchanged.
- New helper in `OpportunityTypes.ts` (or `FormatUtils.ts`):
  ```ts
  export function displayScore(raw: number | null | undefined): number | null {
    return raw == null ? null : raw / 10
  }
  ```
- All consumers convert raw→display at the boundary, then operate on the display scale:
  - `ScoreBadge` — `displayScore(score)?.toFixed(1)`
  - `ScoreDialog` title — `displayScore(score)?.toFixed(1)`
  - `getScoreGrade(score)` — accepts display value (unchanged); callers must pass `displayScore(raw)`
  - `JOB_GROUP_BY_OPTIONS.score.groupBy` — `getScoreGrade(displayScore(item.active_version.score))`
  - `buildClipboardText` in ScoreDialog — already pulls from `score`, must call `displayScore` first
- Grade thresholds (Excellent 9.0+, Good 7.0+, Average 5.0+, Below average 3.0+) stay defined in display terms — readable as-is.

### SPEC

- §4.2 `score` field: change "integer 0–10" → "integer 0–100 — represents 0.0–10.0 in the user-facing UI; raw value divided by 10 when displayed". Example numbers unchanged (SPEC already speaks display scale).
- §6.2 `score INTEGER` schema row: append "stores 0–100 for 0.1-step resolution".
- §8.1.x Score grade buckets: unchanged (operate on display scale).
- §9 Source opportunity workflow: no change.

### DB migration

`db/migrations/0010_score_decimal_resolution.sql`:
```sql
-- Bump score from 0–10 to 0–100 (1 decimal place displayed).
-- Multiplies all historic + active version rows uniformly.
update opportunity_version set score = score * 10 where score is not null;
```

Applies to active and inactive versions uniformly; no data loss.

## Edge cases

1. **Agent regression to 0–10.** Even after prompt update, an LLM may emit single-digit scores. The OpportunityService post-process catches `score <= 10`, multiplies by 10, logs a warning. Belt-and-suspenders.
2. **Manual score edits (if any).** No UI exists for direct score editing today. If added later, the input form must multiply ×10 on submit.
3. **Comparison/sort stability.** All comparisons happen in raw space (0–100) or display space (0.0–10.0) — never mixed. The boundary is the `displayScore()` helper.
4. **Clipboard text.** "Score: 4.0/10" format already uses `.toFixed(1)` — must consume `displayScore(raw)` to avoid "Score: 40.0/10".
5. **Existing scored rows post-migration.** Old "8" becomes "80" (displays as 8.0) — exactly matches their original meaning. No semantic shift.

## Execution order (when greenlit)

1. SPEC update (§4.2, §6.2)
2. Backend: prompt update + post-process guardrail
3. Migration 0010 (apply once; reversible by `/10` if needed)
4. Frontend: add `displayScore()` helper + thread through ScoreBadge, ScoreDialog, getScoreGrade callers, group-by
5. Restart API, smoke test: view a previously-scored opportunity (display should be unchanged) and rescore one (new value should be a non-integer like 7.4)

## Open questions

- Should `ScoreBadge` show `.0` for whole numbers (i.e. always `7.0`) or strip the trailing zero (`7`)? Current behavior is `toFixed(1)` → always one decimal. Keep that.
- Display 0.1 step vs round to nearest 0.5 for visual clarity? Recommend 0.1 — that's the whole point.
- Should we cap historical scores or migrate all? Recommend migrate all (active + inactive); keeps the version history consistent and DAO logic uniform.
