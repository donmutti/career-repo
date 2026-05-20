# Scan Inbox for Opportunity-Related Emails

**Prompt:** Scan the user's Gmail inbox for emails that may contain job opportunities such as job offers, recruiter outreach, interview invitations, or application updates.

**Input:**
```json
{
  "max_results": 50
}
```

**Output:**
Return a JSON array of discovered emails. Each email must contain at least one identified opportunity — omit emails with no opportunities:
```json
[
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
]
```

**Behavior:**

1. Build a Gmail search query using the following default career-opportunity keywords:
   ```
   (job OR recruiter OR "job opportunity" OR "open position" OR "we're hiring" OR interview OR "job offer" OR "your application" OR "application received" OR "next steps" OR LinkedIn OR "career opportunity" OR "joining our team")
   ```

2. Execute the Gmail search using the MCP Gmail search tool with the constructed query.

3. For each result, fetch the full email body if not already included in the search result.

4. For each email, identify all distinct job opportunities mentioned. Each opportunity needs a concise title. A single email may contain multiple opportunities (e.g. a job digest with several listings). Always set `type` to `"job"`.

5. Omit any email where you cannot identify at least one concrete job opportunity — e.g. generic newsletters with no specific role or offer.

6. Return up to `max_results` emails as a JSON array.

7. On error (e.g., Gmail unavailable), return an empty array — do not throw.

**IMPORTANT:** Your final response must be a raw JSON array only — no explanation, no prose, no markdown code fences. Start with `[` and end with `]`.
