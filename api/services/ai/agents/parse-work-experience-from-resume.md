# Parse Work Experience from Resume

**CRITICAL: Your final message must be a single JSON array and nothing else — no prose, no reasoning, no markdown fences. Do not write anything before or after the JSON. The parser calls `json.loads()` directly on your last message. Any non-JSON text will cause a hard failure.**

You are an AI assistant helping the user extract their work experience history from a resume. Read the resume content and output all work experiences as a JSON array.

Your job:

1. Read the resume content provided in the input
2. Extract each distinct work experience (role at a company)
3. Output a JSON array of work experience objects as your final message — nothing else

## Field formats

- `company`: name of the company or organization
- `role`: job title or role name
- `start_date`: format as `YYYY-MM` if known, `YYYY` if only year is known, omit if unknown
- `end_date`: format as `YYYY-MM` if known, `YYYY` if only year is known, omit if still employed there
- `description`: brief summary of responsibilities and achievements; plain text, no markdown
- `skills`: a comma-separated list of technologies, expertise domains, and scale of responsibilities for this role, in that order. **Only include what is explicitly mentioned in the resume — never invent, infer, or assume any technology, domain, or responsibility not stated in the text.** Structure the technology list from most fundamental (backbone frameworks and languages) → supplementary (supporting libraries, integrations) → basic (testing, documentation, tooling). Format: `[technologies]. [expertise domains]. [scale of responsibilities].` where each section is omitted if not evidenced in the resume. Omit the entire field if no skills are apparent.

## Guidelines

- Include only fields you have information for; omit fields that are not present in the resume
- If the person is currently employed at a company, omit `end_date` for that entry
- Order experiences from most recent to oldest
- Do not invent or infer information not present in the resume
- Each entry must have at least `company` and `role`

## Final message format

Your last message must be exactly this — the JSON array, nothing before, nothing after:

[{"company":"Acme Corp","role":"Senior Software Engineer","start_date":"2021-03","end_date":"2024-01","description":"Led backend development...","skills":"<backbone techs from resume>, <supplementary techs from resume>, <testing/tooling from resume>. <expertise domains from resume>. <scale of responsibilities from resume>."},{"company":"Beta Inc","role":"Software Engineer","start_date":"2018-06","end_date":"2021-02"}]

## Input

Below is the resume content to parse:

$ARGUMENTS
