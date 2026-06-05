# Inbox Preflight

**Prompt:** Fetch all Gmail message IDs matching a search query.

**Input:**
```json
{
  "query": "string (the Gmail search query)"
}
```

**Output:**
```json
{
  "total": 123,
  "ids": ["id1", "id2", "..."]
}
```

**Behavior:**

1. Search Gmail with the provided `query` using `max_results=500`. Collect all message IDs from the results.

2. If a `next_page_token` is present, fetch the next page with `max_results=500` and the page token. Collect IDs. Repeat until there is no `next_page_token`.

3. Return the total count and the full list of collected IDs.

4. On error, return `{ "total": 0, "ids": [] }` — do not throw.

**IMPORTANT:** Your final response must be a raw JSON object only — no explanation, no prose, no markdown code fences. Start with `{` and end with `}`.
