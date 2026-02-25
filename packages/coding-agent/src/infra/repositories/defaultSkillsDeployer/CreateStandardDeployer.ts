import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

// Markdown-first workflow - agent drafts in markdown, converts to JSON for CLI
function getStandardCreatorSkillMd(agentName: string): string {
  return `---
name: 'packmind-create-standard'
description: 'Guide for creating coding standards via the Packmind CLI. This skill should be used when users want to create a new coding standard (or add rules to an existing standard) that captures team conventions, best practices, or coding guidelines for distribution to ${agentName}.'
license: 'Complete terms in LICENSE.txt'
---

# Standard Creator

This skill provides a complete walkthrough for creating coding standards via the Packmind CLI.

## About Coding Standards

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They help maintain consistency across codebases and enable ${agentName} to follow your team's specific practices.

### What Standards Provide

1. **Consistent code style** - Rules that enforce naming conventions, formatting, and structure
2. **Best practices** - Guidelines for error handling, testing, security, and performance
3. **Domain knowledge** - Company-specific patterns, architectural decisions, and business logic
4. **Code examples** - Positive/negative examples that demonstrate correct vs incorrect usage

### Standard Structure

Every standard is drafted as a markdown file with this structure:

\`\`\`
# Standard Name

## Description

What the standard covers and why.

## Scope

Where/when the standard applies (e.g., "TypeScript files", "React components").

## Rules

### Rule description starting with action verb

#### Positive Example

\\\`\\\`\\\`typescript
// Valid code example
\\\`\\\`\\\`

#### Negative Example

\\\`\\\`\\\`typescript
// Invalid code example
\\\`\\\`\\\`

### Another rule without examples
\`\`\`

### Naming Guidelines

The \`# Title\` heading is the **display name** shown in indexes and dashboards. The slug is auto-generated from it — never write the slug yourself.

**Format:** Use **Title Case with spaces** — natural language, not a slug.
- Capitalize each significant word
- Use spaces between words, never hyphens or underscores
- Be descriptive and specific (2–5 words) — indicate the domain/technology and the aspect covered

**Examples:**
- ✅ \`"TypeScript Testing Conventions"\`, \`"React Component File Organization"\`, \`"Backend Error Handling"\`
- ❌ \`"typescript-testing-conventions"\` (slug format — use Title Case with spaces)
- ❌ \`"testing"\` (too generic)
- ❌ \`"good-practices"\` (slug format and too vague)
- ❌ \`"Standards for Code"\` (describes meta-concept, not the actual domain)

**Note**: The Packmind CLI currently requires the \`scope\` field. The \`summary\` field is used in other workflows (like MCP) but not yet supported by the CLI.

#### Understanding \`scope\` vs \`summary\`

- **\`scope\`** (required by CLI): **WHERE** the standard applies - file patterns, technologies, specific locations
  - Examples: \`"TypeScript test files (*.spec.ts, *.test.ts)"\`, \`"React functional components"\`
- **\`summary\`** (optional, not yet CLI-supported): **WHEN/WHY** to apply - high-level purpose and trigger condition
  - Examples: \`"Apply when writing tests to ensure consistency"\`, \`"Use when handling user data for privacy compliance"\`

## Prerequisites

Before creating a standard, verify that packmind-cli is available:

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

## Standard Creation Process

To create a standard, follow this process in order, skipping steps only if there is a clear reason why they are not applicable.

### Step 1: Clarify the Request

Gather essential information before drafting the standard.

#### Clarification Flow

Study the user's request and identify critical gaps. The number of questions should match the request clarity:
- **1-2 questions** when the request is well-defined (clear scope, specific examples, detailed context)
- **3-5 questions** when the context is unclear or the request is vague

**Examples of focused questions:**
- "Which service or file shows the expected pattern?"
- "Is there an existing doc or rule we must stay aligned with?"
- "What specific aspect matters most (mocking guidelines, naming conventions, assertion style)?"

Introduce questions with a simple phrase about needing clarification, then list as bullet points—no numbering, no category headers.

#### Repository Access Guardrail

**Do not open or scan repository files unless the user explicitly points to them** (provides file paths or requests project-wide review). If source references are needed, ask the user to supply them.

#### What to Capture

Take brief notes on:
- Title or slug (if mentioned)
- Scope guardrails
- Key references
- Expected outcomes

Keep notes concise—just enough to unlock drafting.

### Step 2: Draft Standard in Markdown

Transform the understanding into a complete markdown draft with rules and examples.

#### Draft Creation

1. Create a draft markdown file in \`.packmind/standards/_drafts/\` (create the folder if missing) using filename \`<slug>.md\` (lowercase with hyphens)
2. Draft structure:
   - \`# <Standard Title>\` (Title Case, 2–5 words)
   - \`## Description\` — what the standard covers and why it exists
   - \`## Scope\` — where/when the standard applies (file patterns, technologies)
   - \`## Rules\` — each rule as a \`### <rule text>\` subsection following the Rule Writing Guidelines below
   - For each rule that benefits from code examples, add:
     - \`#### Positive Example\` with a language-annotated code block showing the compliant approach
     - \`#### Negative Example\` with a language-annotated code block showing the anti-pattern
   - If a rule doesn't benefit from code examples (e.g., process or organizational rules), skip examples for that rule

This draft file is the **only** file created during drafting — no separate files are needed.

#### Rule Writing Guidelines

Each rule should follow these format requirements:

1. **Start with an action verb** - Use imperative form (e.g., "Use", "Avoid", "Prefer", "Include")
2. **Be concise** - Max ~25 words per rule
3. **Be specific and actionable** - Avoid vague guidance
4. **Focus on one concept** - One rule per convention

##### Avoid Rationale Phrases

Rules describe **WHAT** to do, not **WHY**. Strip justifications and benefits—let examples demonstrate value.

**Common fluff patterns to remove:**
- "to improve/provide/ensure..." (benefit phrases)
- "while maintaining/preserving..." (secondary concerns)
- "for better/enhanced..." (quality claims)
- "and enable/allow..." (future benefits)

**Bad (includes rationale):**
> Document props with JSDoc comments to provide IDE intellisense and improve developer experience.

**Good (action only):**
> Document component props with JSDoc comments (\`/** ... */\`) describing purpose, expected values, and defaults.

##### Rule Splitting

If a rule addresses 2+ distinct concerns, **proactively split** it into separate rules:

**Bad (too broad):**
> Create centralized color constants in dedicated files for consistent palettes, using semantic naming based on purpose rather than specific color values.

**Good (split into focused rules):**
- Define color constants in \`theme/colors.ts\` using semantic names (e.g., \`primary\`, \`error\`)
- Use semantic color tokens instead of literal hex values in components

##### Inline Examples in Rules

Inline examples (code, paths, patterns) within the rule content are **optional**. Only include them when they clarify something not obvious from the rule text.

**Types of useful inline examples:**
- Code syntax: \`const\`, \`async/await\`, \`/** ... */\`
- File paths: \`infra/repositories/\`, \`domain/entities/\`
- Naming patterns: \`.spec.ts\`, \`I{Name}\` prefix

**Good rules with inline examples:**
- "Use const instead of let for variables that are never reassigned"
- "Prefix interface names with I (e.g., \`IUserService\`)"
- "Place repository implementations in \`infra/repositories/\`"

**Good rules without inline examples:**
- "Name root describe block after the class or function under test"
- "Run linting before committing changes"
- "Keep business logic out of controllers"

**Bad rules:**
- "Write good code" (too vague)
- "Use const and prefix interfaces with I" (multiple concepts)
- "Don't use var" (no positive guidance)

#### Examples Guidelines

- Examples should be realistic and directly relevant to this codebase
- Each example should clearly demonstrate why the rule matters
- Keep code snippets minimal—only include what's necessary to illustrate the point
- Annotate every code block with its language (e.g., \`typescript\`, \`sql\`, \`javascript\`)

Valid language values for code blocks:
- TYPESCRIPT, TYPESCRIPT_TSX
- JAVASCRIPT, JAVASCRIPT_JSX
- PYTHON, JAVA, GO, RUST, CSHARP
- PHP, RUBY, KOTLIN, SWIFT, SQL
- HTML, CSS, SCSS, YAML, JSON
- MARKDOWN, BASH, GENERIC

#### Draft Summary

After saving the draft file, write a concise summary that captures:
- One sentence summarizing the standard's purpose
- A bullet list of all rules (each rule ~22 words max, imperative form, with inline code if helpful)

Then proceed directly to Step 3.

### Step 3: Review Before Submission

**Before running the CLI command**, you MUST get explicit user approval:

1. **Display a formatted recap** of the standard content:

\`\`\`
---
Name: <standard name>

Description: <description>

Scope: <scope>

Rules:

1. <rule content>
   - ✅ <positive example>
   - ❌ <negative example>
2. <rule content>
   - ✅ <positive example>
   - ❌ <negative example>
...
---
\`\`\`

2. **Provide the file path** to the markdown file so users can open and edit it directly if needed.

3. Ask: **"Here is the standard that will be created on Packmind. The draft file is at \`<path>\` if you want to review or edit it. Do you approve?"**

4. **Wait for explicit user confirmation** before proceeding to Step 4.

5. If the user requests changes, go back to earlier steps to make adjustments.

### Step 4: Confirm and Submit

1. **Re-read the markdown file** from disk to capture any user edits.

2. **Compare with the original content** you created in Step 2.

3. **If changes were detected**:
   - Display the formatted recap again (same format as Step 3)
   - Ask: **"The file was modified. Here is the updated content that will be sent. Do you confirm?"**
   - **Wait for explicit confirmation** before proceeding.

4. **If no changes**: Proceed directly to submission.

5. **Convert the markdown to JSON** using these conversion rules:
   - \`# heading\` → \`name\`
   - \`## Description\` content → \`description\`
   - \`## Scope\` content → \`scope\`
   - Each \`### ...\` under \`## Rules\` → rule \`content\`
   - \`#### Positive Example\` code block → \`examples.positive\`
   - \`#### Negative Example\` code block → \`examples.negative\`
   - Code fence language identifier → \`examples.language\` (UPPERCASED)

   **Important:** \`examples\` is a **single object** (not an array) — one positive/negative pair per rule. It is **optional** — omit entirely for rules without code examples. When present, all three fields (\`positive\`, \`negative\`, \`language\`) are required.

   **Expected JSON format:**
   \`\`\`json
   {
     "name": "Standard Name",
     "description": "What the standard covers and why.",
     "scope": "Where/when the standard applies.",
     "rules": [
       {
         "content": "Rule description starting with action verb",
         "examples": {
           "positive": "// valid code",
           "negative": "// invalid code",
           "language": "TYPESCRIPT"
         }
       },
       {
         "content": "Rule without examples"
       }
     ]
   }
   \`\`\`

6. Pipe the JSON directly to the CLI via stdin using a heredoc (no intermediate file needed):

\`\`\`bash
packmind-cli standards create --origin-skill packmind-create-standard <<'EOF'
{"name":"...","description":"...","scope":"...","rules":[...]}
EOF
\`\`\`

Expected output on success:
\`\`\`
packmind-cli Standard "Your Standard Name" created successfully (ID: <uuid>)
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
- Check that the \`## Rules\` section has at least one \`###\` rule subsection
- Verify code blocks have language annotations

**"expected object, received array" error on examples:**
- The \`examples\` field must be a single object \`{positive, negative, language}\`, not an array
- Each rule supports at most one example pair

### Step 5: Cleanup

After the standard is **successfully created**, delete the draft markdown file in \`.packmind/standards/_drafts/\`.

**Only clean up on success** - if the CLI command fails, keep the files so the user can retry.

### Step 6: Offer to Add to Package

After successful creation, check if the standard fits an existing package:

1. Run \`packmind-cli install --list\` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created standard's name, description, and scope against each package's name and description
4. If a package is a clear semantic fit (the standard's domain/technology aligns with the package's purpose):
   - Present to user: "This standard seems to fit the \`<package-slug>\` package."
   - Offer three options:
     - Add to \`<package-slug>\`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: \`packmind-cli packages add --to <package-slug> --standard <standard-slug>\`
   - Ask: "Would you like me to run \`packmind-cli install\` to sync the changes?"
   - If yes, run: \`packmind-cli install\`

## Complete Example

Here's a complete example creating a TypeScript testing standard:

**File: .packmind/standards/_drafts/testing-conventions.md**
\`\`\`markdown
# TypeScript Testing Conventions

## Description

Enforce consistent testing patterns in TypeScript test files to improve readability, maintainability, and reliability of the test suite.

## Scope

TypeScript test files (*.spec.ts, *.test.ts)

## Rules

### Use descriptive test names that explain the expected behavior

#### Positive Example

\\\`\\\`\\\`typescript
it('returns empty array when no items match filter')
\\\`\\\`\\\`

#### Negative Example

\\\`\\\`\\\`typescript
it('test filter')
\\\`\\\`\\\`

### Follow Arrange-Act-Assert pattern in test structure

#### Positive Example

\\\`\\\`\\\`typescript
const input = createInput();
const result = processInput(input);
expect(result).toEqual(expected);
\\\`\\\`\\\`

#### Negative Example

\\\`\\\`\\\`typescript
expect(processInput(createInput())).toEqual(expected);
\\\`\\\`\\\`

### Use one assertion per test for better error isolation

#### Positive Example

\\\`\\\`\\\`typescript
it('validates name', () => { expect(result.name).toBe('test'); });
it('validates age', () => { expect(result.age).toBe(25); });
\\\`\\\`\\\`

#### Negative Example

\\\`\\\`\\\`typescript
it('validates user', () => { expect(result.name).toBe('test'); expect(result.age).toBe(25); });
\\\`\\\`\\\`

### Avoid using 'should' at the start of test names - use assertive verb-first naming
\`\`\`

**Creating the standard (piped via stdin):**
\`\`\`bash
packmind-cli standards create --origin-skill packmind-create-standard <<'EOF'
{"name":"TypeScript Testing Conventions","description":"Enforce consistent testing patterns...","scope":"TypeScript test files (*.spec.ts, *.test.ts)","rules":[...]}
EOF
\`\`\`

## Quick Reference

| Section | Required | Description |
|---|---|---|
| \`# Title\` | Yes | Title Case, descriptive, 2–5 words |
| \`## Description\` | Yes | What and why |
| \`## Scope\` | Yes (CLI) | Where it applies |
| \`## Rules\` | Yes | Contains rule subsections |
| \`### Rule text\` | Yes (≥1) | Rule text (verb-first, max ~25 words) |
| \`#### Positive Example\` | No | Valid code in fenced block |
| \`#### Negative Example\` | No | Invalid code in fenced block |
`;
}

const STANDARD_CREATOR_README = `# Standard Creator

A skill that guides AI coding agents through the process of creating coding standards via the Packmind CLI.

## What is a Coding Standard?

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They enable AI coding agents to follow your team's specific practices.

## How to Use

Ask the AI agent to create a coding standard. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a standard for TypeScript naming conventions"
- "Help me build a coding standard for our React components"
- "I want to create a standard for error handling in our API"
- "Create a new standard for test file conventions"

The AI agent will:

1. Ask clarifying questions to understand the standard's purpose
2. Help you define rules with proper formatting
3. Draft a markdown file for review
4. Get your approval before submission
5. Convert to JSON and run the CLI command to create the standard

## Prerequisites

Before using this skill, ensure you have:

- **packmind-cli**: Required for standard creation
- **Packmind account**: Login via \`packmind-cli login\`

## License

Apache 2.0 - See LICENSE.txt for details.
`;

const STANDARD_CREATOR_LICENSE = `
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

export class CreateStandardDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-create-standard';
  public readonly minimumVersion = '0.14.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-standard`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getStandardCreatorSkillMd(agentName),
        },
        {
          path: `${basePath}/README.md`,
          content: STANDARD_CREATOR_README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: STANDARD_CREATOR_LICENSE,
        },
      ],
      delete: [],
    };
  }
}
