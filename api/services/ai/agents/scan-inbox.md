# Scan Inbox for Opportunity-Related Emails

**Prompt:** Fetch and classify a batch of Gmail emails by ID, identifying career-opportunity content such as job offers, recruiter outreach, interview invitations, or application updates.

**Input:**
```json
{
  "ids": ["id1", "id2", "..."]
}
```

**Output:**
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
          "url": "string | null (direct link to the job posting, if present in the email)",
          "organization_name": "string | null (name of the hiring organization, e.g. 'Acme')"
        }
      ]
    }
  ]
}
```

**Behavior:**

1. For each ID in `ids`, fetch the full email using the Gmail MCP tool.

2. For each email, identify all distinct job opportunities mentioned. Each opportunity needs a concise title. A single email may contain multiple opportunities (e.g. a job digest with several listings). Always set `type` to `"job"`.

3. Include all emails in the output, even those with no identified opportunities — set `opportunities` to `[]` for those. The server will filter them.

4. Return the JSON object described above.

5. On error fetching an individual email, skip it and continue with the rest — do not throw.

**IMPORTANT:** Your final response must be a raw JSON object only — no explanation, no prose, no markdown code fences. Start with `{` and end with `}`.
