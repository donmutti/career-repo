# Inbox Preflight

**Prompt:** Count the total number of emails matching a Gmail search query.

**Input:**
```json
{
  "query": "string (the Gmail search query to count)"
}
```

**Output:**
```json
{
  "total": 123
}
```

**Behavior:**

1. Search Gmail with the provided `query` using `max_results=500`. Count the number of results returned and note the `next_page_token` if present.

2. If a `next_page_token` is present, fetch the next page with `max_results=500` and the page token. Add the count to the running total. Repeat until there is no `next_page_token`.

3. Return the final total count as the JSON object described above.

4. On error, return `{ "total": 0 }` — do not throw.

**IMPORTANT:** Your final response must be a raw JSON object only — no explanation, no prose, no markdown code fences. Start with `{` and end with `}`.
