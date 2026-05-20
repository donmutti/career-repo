---
name: run-spec
description: Validate the codebase against SPEC.md layer by layer and fix all discrepancies. Use when the user asks to run spec, check conformance, or sync code to spec. Supports `/run-spec dryrun` for a report-only pass.
disable-model-invocation: true
---

Your task is to bring the entire codebase into full conformance with SPEC by finding and fixing discrepancies layer by layer.

If invoked as `/run-spec dryrun`, you are in dry-run mode.
If invoked as `/run-spec`, you are in live mode.

## Step 1. Validate SPEC

Read the full SPEC.md.

Check SPEC for internal consistency. Look for logical discrepancies within SPEC itself:

- contradictions between sections
- fields declared in one place but missing or differently named in another
- enum values that are inconsistent across their definition and usage
- entity relationships that conflict
- route shapes that contradict model definitions
- any other inconsistency that would make it impossible to produce a correct, unambiguous implementation.

Collect all identified inconsistencies and report them as a bullet list, e.g.:

- 1.2. "Section name":
  - says "exact quote or paraphrase from this section", but 2.1. "Other section name" says "exact quote or paraphrase from that section"

If there are inconsistencies, **stop immediately** and wait for the user to correct SPEC before continuing.

Then, trace each workflow in 8. Workflows end-to-end in your head:

- Follow each step of the workflow through the full stack: UI action → API endpoint → router → service/DAO → DB → response → UI update.
- For each call crossing a layer boundary, verify that the signatures, argument names, field names, and return types declared in SPEC are sufficient and consistent to carry the data required by that workflow step.
- Flag any gap where a workflow step cannot be completed as specified — e.g. a required field is not passed, a method signature lacks a needed argument, a response shape is missing a field the UI needs, or a step refers to behaviour not defined anywhere in SPEC.

Collect all identified workflow gaps as a bullet list:

- Workflow name (e.g., "8.3. Curate opportunity")
  - Step description and gap (e.g., "curate step calls ClaudeService.curate_opportunity() but profile is optional in the signature yet required by the prompt contract")

If there are no workflow gaps, record: "8. Workflows: No gaps found"

If there are inconsistencies or workflow gaps, **stop immediately** and wait for the user to correct SPEC before continuing.

If SPEC is fully consistent and all workflows are traceable, proceed to Step 2.

## Step 2. Validate code against SPEC

Section 2. Project structure is the canonical source of truth for project structure, directory and file naming, and source paths.

Process each of the below layers in strict order, using the relevant SPEC section for each layer:

- DB Schema ← 4. Models + 5.1. Schema
- API Models ← 4. Models + 6.1. Models
- API DAOs ← 4. Models + 5.1. Schema + 6.2. DAOs
- API Services ← 6.3. Services
- API Routers ← 6.4. Endpoints + 8. Workflows
- UI Controls ← 7.1. Controls
- UI Styling ← 7.2. Styling
- UI API client ← 6.4. Endpoints + 7.3. API client
- UI Routes ← 7.4. Routes
- UI App ← 7.5. App
- UI Sidebar ← 7.6. Sidebar
- UI Pages ← 7.7. Pages + 8. Workflows

For each layer:

- Read all files in the layer, compare against the relevant SPEC sections, and identify all discrepancies
- A discrepancy is anything that does not match SPEC, including but not limited to:
  - Directory structure or file naming mismatches vs 2. Project structure
  - Files, classes, components, or pages that exist in code but are not declared in SPEC
  - Files, classes, components, or pages declared in SPEC but missing from code
  - Methods, functions, fields, routes, or UI behaviours declared in SPEC but not implemented
  - Incorrect naming of files, classes, functions, components, routes, or fields
  - Public/private method ordering violations (public before private)
  - Incorrectly applied architectural principles (e.g. wrong layer doing wrong job)
  - Field name, type, or shape mismatches between SPEC and code
  - UI copy mismatches: button labels, section headings, field labels, placeholder text, page titles
  - Any other discrepancy, however small

Collect all identified discrepancies and report them together with their fix instructions as a bullet list:

- Layer name (e.g., "API Routers")
  - File/directory name (e.g., "opportunity.py")
    - Discrepancy and fix instruction (e.g., "getOpportunity: unconventional method name; rename to get_opportunity")

If a layer has no discrepancies, record the following and move to the next layer:

- Layer name (e.g., "API Routers"): No changes needed

CRITICAL: Never propose SPEC fixes. Only propose code fixes. If you identify a SPEC inconsistency or gap, you should  **stop immediately** and wait for the user to correct SPEC before continuing.

## Step 3. Execute fixes

If in dry-run mode, **stop immediately**.

If in live mode:

- Execute all fixes collected during the previous step
- Address each layer before moving to the next
- No backtracking: each layer must be addressed in one pass.
