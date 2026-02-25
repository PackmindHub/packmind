import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

// Markdown-first workflow - agent drafts in markdown, converts to JSON for CLI
function getCommandCreatorSkillMd(agentName: string): string {
  return `---
name: 'packmind-create-command'
description: 'Guide for creating reusable commands via the Packmind CLI. This skill should be used when users want to create a new command that captures multi-step workflows, recipes, or task automation for distribution to ${agentName}.'
license: 'Complete terms in LICENSE.txt'
---

# Command Creator

This skill provides a complete walkthrough for creating reusable commands via the Packmind CLI.

## About Commands

Commands are structured, multi-step workflows that capture repeatable tasks, recipes, and automation patterns. They help teams standardize common development workflows and enable ${agentName} to execute complex tasks consistently.

### What Commands Provide

1. **Multi-step workflows** - Structured sequences of actions to accomplish a task
2. **Context validation** - Checkpoints to ensure requirements are met before execution
3. **When-to-use guidance** - Clear scenarios describing when the command is applicable
4. **Code snippets** - Optional examples demonstrating each step's implementation

### Command Structure

Every command is drafted as a markdown file with this structure:

\`\`\`
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

\\\`\\\`\\\`typescript
// Optional code example
\\\`\\\`\\\`

### Another Step

Description without code.
\`\`\`

### Naming Guidelines

The \`# Title\` heading is the **display name** shown in indexes and dashboards. The slug is auto-generated from it — never write the slug yourself.

**Format:** Use **Title Case with spaces** — natural language, not a slug.
- Capitalize each significant word
- **Start with an action verb** (e.g., "Create", "Setup", "Configure")
- Use spaces between words, never hyphens or underscores
- Be descriptive and specific (2–5 words)

**Examples:**
- Good: \`"Create API Endpoint"\`, \`"Setup Database Migration"\`, \`"Configure CI Pipeline"\`
- Bad: \`"api-endpoint"\` (slug format — use Title Case with spaces)
- Bad: \`"setup migration"\` (not Title Case)
- Bad: \`"create-api-endpoint"\` (slug format)

### Markdown Structure Requirements

The CLI validates the command after conversion. Ensure the markdown file meets these requirements:

- **\`# Title\`**: Non-empty Title Case string starting with an action verb, descriptive and specific (2–5 words, e.g., "Create API Endpoint")
- **\`## Summary\`**: Non-empty string describing intent, value, and relevance
- **\`## When to Use\`**: At least one bullet item (non-empty strings)
- **\`## Context Validation Checkpoints\`**: At least one bullet item (non-empty strings)
- **\`## Steps\`**: At least one step subsection
- **\`### Step Name\`**: Non-empty string (step title)
- **Step body paragraph**: Non-empty string (implementation details)
- **Step body code block** (optional): Code fenced with language identifier (e.g., \\\`\\\`\\\`typescript)

## Prerequisites

Before creating a command, verify that packmind-cli is available:

Check if packmind-cli is installed:

\`\`\`bash
packmind-cli --version
\`\`\`

If not available, install it:

\`\`\`bash
npm install -g @packmind/cli
\`\`\`

Then login to Packmind:

\`\`\`bash
packmind-cli login
\`\`\`

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

1. Create a draft markdown file in \`.packmind/commands/_drafts/\` (create the folder if missing) using filename \`<slug>.md\` (lowercase with hyphens)
2. Draft structure:
   - \`# <Command Title>\` (Title Case, action-verb prefix, 2–5 words)
   - \`## Summary\` — what the command does, why it's useful, and when it's relevant
   - \`## When to Use\` — bullet list of specific scenarios
   - \`## Context Validation Checkpoints\` — bullet list of validation questions
   - \`## Steps\` — each step as a \`### <step title>\` subsection following the Step Writing Guidelines below
   - For each step that benefits from a code example, add a language-annotated code block

This draft file is the **only** file created during drafting — no separate files are needed.

#### Step Writing Guidelines

1. **Clear name** - Use a concise title (e.g., "Setup Dependencies", "Create Test File")
2. **Actionable description** - Explain what to do and how to implement it
3. **One concept per step** - Focus on a single action
4. **Optional code snippet** - Include when it clarifies the implementation

**Good descriptions:**
- "Create a new file at \\\`src/components/{ComponentName}.tsx\\\` with the basic component structure including props interface and default export"

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

2. **Provide the file path** to the markdown file (\`.packmind/commands/_drafts/<slug>.md\`) so users can open and edit it directly if needed.

3. Ask: **"Here is the command that will be created on Packmind. The draft file is at \\\`<path>\\\` if you want to review or edit it. Do you approve?"**

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
   - \`# heading\` → \`name\`
   - \`## Summary\` content → \`summary\`
   - \`## When to Use\` bullet items → \`whenToUse[]\`
   - \`## Context Validation Checkpoints\` bullet items → \`contextValidationCheckpoints[]\`
   - Each \`### ...\` under \`## Steps\` → step \`name\`, paragraph text → \`description\`, code block → \`codeSnippet\` (wrapped in markdown code fences with language identifier)

6. Pipe the JSON directly to the CLI via stdin using a heredoc (no intermediate file needed):

\`\`\`bash
packmind-cli commands create --origin-skill packmind-create-command <<'EOF'
{"name":"...","summary":"...","whenToUse":[...],"contextValidationCheckpoints":[...],"steps":[...]}
EOF
\`\`\`

Expected output on success:
\`\`\`
packmind-cli Command "Your Command Name" created successfully (ID: <uuid>)
View it in the webapp: <url>
\`\`\`

#### Troubleshooting

**"Not logged in" error:**
\`\`\`bash
packmind-cli login
\`\`\`

**"Failed to resolve global space" error:**
- Verify your API key is valid
- Check network connectivity to Packmind server

**Validation errors:**
- Ensure all required sections are present in the markdown file
- Check that the \`## Steps\` section has at least one \`###\` step subsection
- Verify code blocks have language annotations

### Step 5: Cleanup

After the command is **successfully created**, delete the draft markdown file in \`.packmind/commands/_drafts/\`.

**Only clean up on success** - if the CLI command fails, keep the files so the user can retry.

### Step 6: Offer to Add to Package

After successful creation, check if the command fits an existing package:

1. Run \`packmind-cli install --list\` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created command's name and summary against each package's name and description
4. If a package is a clear semantic fit (the command's domain/technology aligns with the package's purpose):
   - Present to user: "This command seems to fit the \`<package-slug>\` package."
   - Offer three options:
     - Add to \`<package-slug>\`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: \`packmind-cli packages add --to <package-slug> --command <command-slug>\`
   - Ask: "Would you like me to run \`packmind-cli install\` to sync the changes?"
   - If yes, run: \`packmind-cli install\`

## Complete Example

Here's a complete example creating a command for setting up a new API endpoint:

**File: .packmind/commands/_drafts/create-api-endpoint.md**
\`\`\`markdown
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

Create the controller file in the \\\`infra/http/controllers/\\\` directory with the endpoint handler and input validation.

\\\`\\\`\\\`typescript
@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() dto: CreateUserDTO) {
    return this.useCase.execute(dto);
  }
}
\\\`\\\`\\\`

### Create Use Case

Create the use case in the \\\`application/useCases/\\\` directory implementing the business logic.

### Create Tests

Create unit tests for the controller and use case in their respective \\\`.spec.ts\\\` files following the Arrange-Act-Assert pattern.

### Register in Module

Add the controller and use case to the appropriate NestJS module's \\\`controllers\\\` and \\\`providers\\\` arrays.
\`\`\`

**Creating the command (piped via stdin):**
\`\`\`bash
packmind-cli commands create --origin-skill packmind-create-command <<'EOF'
{"name":"Create API Endpoint","summary":"Set up a new REST API endpoint...","whenToUse":[...],"contextValidationCheckpoints":[...],"steps":[...]}
EOF
\`\`\`

## Quick Reference

| Section | Required | Description |
|---|---|---|
| \`# Title\` | Yes | Title Case, action-verb prefix, 2–5 words |
| \`## Summary\` | Yes | What, why, and when (one sentence) |
| \`## When to Use\` | Yes | Bullet list, at least one scenario |
| \`## Context Validation Checkpoints\` | Yes | Bullet list, at least one checkpoint |
| \`## Steps\` | Yes | Contains step subsections |
| \`### Step Name\` | Yes (≥1) | Step title |
| Step body (paragraph) | Yes | Implementation details |
| Step body (code block) | No | Markdown code block with language |
`;
}

const COMMAND_CREATOR_README = `# Command Creator

A skill that guides AI coding agents through the process of creating reusable commands via the Packmind CLI.

## What is a Command?

Commands are structured, multi-step workflows that capture repeatable tasks, recipes, and automation patterns. They enable AI coding agents to execute complex tasks consistently following your team's established workflows.

## How to Use

Ask the AI agent to create a command. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a command for setting up a new API endpoint"
- "Help me build a command that guides creating React components"
- "I want to create a command for our deployment workflow"
- "Create a new command for database migration setup"

The AI agent will:

1. Ask clarifying questions to understand the command's purpose
2. Help you define steps with proper formatting
3. Draft a markdown file for review
4. Get your approval before submission
5. Convert to JSON and run the CLI command to create the command

## Prerequisites

Before using this skill, ensure you have:

- **packmind-cli**: Required for command creation
- **Packmind account**: Login via \`packmind-cli login\`

## License

Apache 2.0 - See LICENSE.txt for details.
`;

const COMMAND_CREATOR_LICENSE = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
`;

export class CreateCommandDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-create-command';
  public readonly minimumVersion = '0.15.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-command`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getCommandCreatorSkillMd(agentName),
        },
        {
          path: `${basePath}/README.md`,
          content: COMMAND_CREATOR_README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: COMMAND_CREATOR_LICENSE,
        },
      ],
      delete: [],
    };
  }
}
