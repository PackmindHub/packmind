---
name: 'packmind-create-command'
description: 'Guide for creating reusable commands via the Packmind CLI. This skill should be used when users want to create a new command that captures multi-step workflows, recipes, or task automation for distribution to Claude.'
license: 'Complete terms in LICENSE.txt'
metadata:
 packmind-cli-version: "< 0.25.0"
---

# Command Creator

This skill provides a complete walkthrough for creating reusable commands via the Packmind CLI.

## About Commands

Commands are structured, multi-step workflows that capture repeatable tasks, recipes, and automation patterns. They help teams standardize common development workflows and enable Claude to execute complex tasks consistently.

### What Commands Provide

1. **Multi-step workflows** - Structured sequences of actions to accomplish a task
2. **Context validation** - Checkpoints to ensure requirements are met before execution
3. **When-to-use guidance** - Clear scenarios describing when the command is applicable
4. **Code snippets** - Optional examples demonstrating each step's implementation

### Command Structure

Every command is drafted as a markdown file with this structure:

```
# Command Name

## Summary

What the command does, why it's useful, and when it's relevant.

## When to Use

- Scenario 1 when this command applies
- Scenario 2 when this command applies

## Context Validation Checkpoints

- Question 1 to validate before proceeding?
- Question 2 to ensure context is clear?

## Steps

### Step Name

What this step does and how to implement it.

\`\`\`typescript
// Optional code example
\`\`\`

### Another Step

Description without code.
```

### Naming Guidelines

The `# Title` heading is the **display name** shown in indexes and dashboards. The slug is auto-generated from it — never write the slug yourself.

**Format:** Use **Title Case with spaces** — natural language, not a slug.
- Capitalize each significant word
- **Start with an action verb** (e.g., "Create", "Setup", "Configure")
- Use spaces between words, never hyphens or underscores
- Be descriptive and specific (2–5 words)

**Examples:**
- Good: `"Create API Endpoint"`, `"Setup Database Migration"`, `"Configure CI Pipeline"`
- Bad: `"api-endpoint"` (slug format — use Title Case with spaces)
- Bad: `"setup migration"` (not Title Case)
- Bad: `"create-api-endpoint"` (slug format)

### Markdown Structure Requirements

The CLI validates the command after conversion. Ensure the markdown file meets these requirements:

- **`# Title`**: Non-empty Title Case string starting with an action verb, descriptive and specific (2–5 words, e.g., "Create API Endpoint")
- **`## Summary`**: Non-empty string describing intent, value, and relevance
- **`## When to Use`**: At least one bullet item (non-empty strings)
- **`## Context Validation Checkpoints`**: At least one bullet item (non-empty strings)
- **`## Steps`**: At least one step subsection
- **`### Step Name`**: Non-empty string (step title)
- **Step body paragraph**: Non-empty string (implementation details)
- **Step body code block** (optional): Code fenced with language identifier (e.g., \`\`\`typescript)

## Prerequisites

Before creating a command, verify that packmind-cli is available:

Check if packmind-cli is installed:

```bash
packmind-cli --version
```

If not available, install it:

```bash
npm install -g @packmind/cli
```

Then login to Packmind:

```bash
packmind-cli login
```

## Command Creation Process

### Step 1: Understanding the Command's Purpose

Skip this step only when the command's workflow and steps are already clearly defined.

To create an effective command, clearly understand:

1. **What workflow does this command automate?**
   - Example: "Setting up a new API endpoint with tests"
   - Example: "Creating a new React component with proper structure"

2. **When should this command be triggered?**
   - Specific scenarios (e.g., "When adding a new feature")
   - Specific contexts (e.g., "After creating a domain entity")

Example clarifying questions:

- "What multi-step workflow do you want to automate?"
- "What scenarios should trigger this command?"
- "What context needs to be validated before running this workflow?"

### Step 2: Design Command in Markdown

Transform the understanding from Step 1 into a complete markdown draft with steps and validation checkpoints.

#### Draft Creation

1. Create a draft markdown file in `.packmind/commands/_drafts/` (create the folder if missing) using filename `<slug>.md` (lowercase with hyphens)
2. Draft structure:
   - `# <Command Title>` (Title Case, action-verb prefix, 2–5 words)
   - `## Summary` — what the command does, why it's useful, and when it's relevant
   - `## When to Use` — bullet list of specific scenarios
   - `## Context Validation Checkpoints` — bullet list of validation questions
   - `## Steps` — each step as a `### <step title>` subsection following the Step Writing Guidelines below
   - For each step that benefits from a code example, add a language-annotated code block

This draft file is the **only** file created during drafting — no separate files are needed.

#### Step Writing Guidelines

1. **Clear name** - Use a concise title (e.g., "Setup Dependencies", "Create Test File")
2. **Actionable description** - Explain what to do and how to implement it
3. **One concept per step** - Focus on a single action
4. **Optional code snippet** - Include when it clarifies the implementation

**Good descriptions:**
- "Create a new file at \`src/components/{ComponentName}.tsx\` with the basic component structure including props interface and default export"

**Bad descriptions:**
- "Create file" (too vague)

#### Context Validation Checkpoints

Questions that verify requirements before execution:

**Good checkpoints:**
- "Is the component name and location specified?"
- "Are the API endpoint requirements (method, path, payload) defined?"

**Bad checkpoints:**
- "Ready to start?" (doesn't validate anything)

#### When-To-Use Scenarios

Define specific, actionable scenarios:

**Good scenarios:**
- "When adding a new REST endpoint to the API"
- "After creating a new domain entity that needs persistence"

**Bad scenarios:**
- "When coding" (too broad)

### Step 3: Review Before Submission

**Before running the CLI command**, you MUST get explicit user approval:

1. Show the user the complete command content in a formatted preview:
   - Name
   - Summary
   - When to use scenarios
   - Context validation checkpoints
   - Each step with name, description, and code snippet (if any)

2. **Provide the file path** to the markdown file (`.packmind/commands/_drafts/<slug>.md`) so users can open and edit it directly if needed.

3. Ask: **"Here is the command that will be created on Packmind. The draft file is at \`<path>\` if you want to review or edit it. Do you approve?"**

4. **Wait for explicit user confirmation** before proceeding to Step 4.

5. If the user requests changes, go back to earlier steps to make adjustments.

### Step 4: Confirm and Submit

1. **Re-read the markdown file** from disk to capture any user edits.

2. **Compare with the original content** you created in Step 2.

3. **If changes were detected**:
   - Display the formatted preview again (same format as Step 3)
   - Ask: **"The file was modified. Here is the updated content that will be sent. Do you confirm?"**
   - **Wait for explicit confirmation** before proceeding.

4. **If no changes**: Proceed directly to submission.

5. **Convert the markdown to JSON** using these conversion rules:
   - `# heading` → `name`
   - `## Summary` content → `summary`
   - `## When to Use` bullet items → `whenToUse[]`
   - `## Context Validation Checkpoints` bullet items → `contextValidationCheckpoints[]`
   - Each `### ...` under `## Steps` → step `name`, paragraph text → `description`, code block → `codeSnippet` (wrapped in markdown code fences with language identifier)

6. Pipe the JSON directly to the CLI via stdin using a heredoc (no intermediate file needed):

```bash
packmind-cli commands create --origin-skill packmind-create-command <<'EOF'
{"name":"...","summary":"...","whenToUse":[...],"contextValidationCheckpoints":[...],"steps":[...]}
EOF
```

Expected output on success:
```
packmind-cli Command "Your Command Name" created successfully (ID: <uuid>)
View it in the webapp: <url>
```

#### Troubleshooting

**"Not logged in" error:**
```bash
packmind-cli login
```

**"Failed to resolve global space" error:**
- Verify your API key is valid
- Check network connectivity to Packmind server

**Validation errors:**
- Ensure all required sections are present in the markdown file
- Check that the `## Steps` section has at least one `###` step subsection
- Verify code blocks have language annotations

### Step 5: Cleanup

After the command is **successfully created**, delete the draft markdown file in `.packmind/commands/_drafts/`.

**Only clean up on success** - if the CLI command fails, keep the files so the user can retry.

### Step 6: Offer to Add to Package

After successful creation, check if the command fits an existing package:

1. Run `packmind-cli install --list` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created command's name and summary against each package's name and description
4. If a package is a clear semantic fit (the command's domain/technology aligns with the package's purpose):
   - Present to user: "This command seems to fit the `<package-slug>` package."
   - Offer three options:
     - Add to `<package-slug>`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: `packmind-cli packages add --to <package-slug> --command <command-slug>`
   - Ask: "Would you like me to run `packmind-cli install` to sync the changes?"
   - If yes, run: `packmind-cli install`

## Complete Example

Here's a complete example creating a command for setting up a new API endpoint:

**File: .packmind/commands/_drafts/create-api-endpoint.md**
```markdown
# Create API Endpoint

## Summary

Set up a new REST API endpoint with controller, service, and tests following the hexagonal architecture pattern.

## When to Use

- When adding a new REST endpoint to the API
- When implementing a new backend feature that exposes HTTP endpoints

## Context Validation Checkpoints

- Is the HTTP method and path defined (e.g., POST /users)?
- Is the request/response payload structure specified?
- Is the associated use case or business logic identified?

## Steps

### Create Controller

Create the controller file in the \`infra/http/controllers/\` directory with the endpoint handler and input validation.

\`\`\`typescript
@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() dto: CreateUserDTO) {
    return this.useCase.execute(dto);
  }
}
\`\`\`

### Create Use Case

Create the use case in the \`application/useCases/\` directory implementing the business logic.

### Create Tests

Create unit tests for the controller and use case in their respective \`.spec.ts\` files following the Arrange-Act-Assert pattern.

### Register in Module

Add the controller and use case to the appropriate NestJS module's \`controllers\` and \`providers\` arrays.
```

**Creating the command (piped via stdin):**
```bash
packmind-cli commands create --origin-skill packmind-create-command <<'EOF'
{"name":"Create API Endpoint","summary":"Set up a new REST API endpoint...","whenToUse":[...],"contextValidationCheckpoints":[...],"steps":[...]}
EOF
```

## Quick Reference

| Section | Required | Description |
|---|---|---|
| `# Title` | Yes | Title Case, action-verb prefix, 2–5 words |
| `## Summary` | Yes | What, why, and when (one sentence) |
| `## When to Use` | Yes | Bullet list, at least one scenario |
| `## Context Validation Checkpoints` | Yes | Bullet list, at least one checkpoint |
| `## Steps` | Yes | Contains step subsections |
| `### Step Name` | Yes (≥1) | Step title |
| Step body (paragraph) | Yes | Implementation details |
| Step body (code block) | No | Markdown code block with language |

