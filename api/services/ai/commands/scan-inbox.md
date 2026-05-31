# Scan Inbox for Opportunity-Related Emails

**Prompt:** Scan a batch of emails from the user's Gmail inbox for career-opportunity content such as job offers, recruiter outreach, interview invitations, or application updates.

**Input:**
```json
{
  "query": "string (the Gmail search query to execute)",
  "page_token": "string | null (Gmail pageToken for pagination; null for first batch)",
  "max_results": 10
}
```

**Output:**
Return a JSON object with the following shape:
```json
{
  "emails": [
    {
      "id": "string (stable Gmail message ID)",
      "subject": "string",
      "from": "string (sender email address)",
      "to": "string (recipient email address)",
      "date": "string (ISO 8601 UTC timestamp)",
      "body": "string (email body, plain text preferred)",
      "opportunities": [
        {
          "title": "string (concise opportunity title, e.g. 'Senior Engineer at Acme')",
          "type": "job",
          "url": "string | null (direct link to the job posting, if present in the email)"
        }
      ]
    }
  ],
  "next_page_token": "string | null (pageToken for next batch; null if no more results)"
}
```

**Behavior:**

1. Execute the Gmail search using the MCP Gmail search tool with the provided `query`, `page_token` (if provided), and `max_results`.

2. Extract `next_page_token` from the search result if present.

3. For each result, fetch the full email body if not already included in the search result.

4. For each email, identify all distinct job opportunities mentioned. Each opportunity needs a concise title. A single email may contain multiple opportunities (e.g. a job digest with several listings). Always set `type` to `"job"`.

5. Include all emails in the output, even those with no identified opportunities — set `opportunities` to `[]` for those. The server will filter them.

6. Return the JSON object described above.

7. On error (e.g., Gmail unavailable), return `{ "emails": [], "next_page_token": null }` — do not throw.

**IMPORTANT:** Your final response must be a raw JSON object only — no explanation, no prose, no markdown code fences. Start with `{` and end with `}`.
