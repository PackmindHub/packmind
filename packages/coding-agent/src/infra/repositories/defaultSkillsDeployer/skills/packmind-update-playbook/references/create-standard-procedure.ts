export const CREATE_STANDARD_PROCEDURE = `# Create Standard Procedure

Write a new standard file locally at \`.packmind/standards/<slug>.md\`.

## Slug Derivation

Derive the slug from the standard title: lowercase, replace spaces with hyphens, remove special characters.

**Example**: "TypeScript Testing Conventions" → \`typescript-testing-conventions\`

**Write path**: \`.packmind/standards/<slug>.md\`

**Directory check**: If \`.packmind/standards/\` does not exist, create it before writing the file.

## File Format

The parser expects this exact structure:

\`\`\`markdown
# Standard Name

Description text here. Explain what this standard covers and why it matters.

## Scope

**/*.ts, **/*.tsx

## Rules

* Rule 1
* Rule 2
* Rule 3
\`\`\`

### Critical Format Constraints

- **No YAML frontmatter** — the file is pure markdown
- **Only \`* \` or \`- \` bullet rules are parsed** — \`### Rule\` subsections are NOT supported by the parser
- **Must have at least one real rule** — the parser rejects empty rules and silently filters out the placeholder text "No rules defined yet."
- The \`## Rules\` heading is recommended for clarity but technically optional — the parser finds rules from the first \`* \`/\`- \` bullet even without it
- Any other \`## \` sub-heading is not a section: it stays part of the description

## Scope Writing Guidelines

\`## Scope\` holds the **glob patterns** the standard applies to, so coding agents load it only for matching files. Omit the section when the standard applies everywhere.

- Write **globs, not prose**: \`**/*.spec.ts\`, never "TypeScript test files"
- Separate several patterns with commas on one line, or write one \`- \` bullet per pattern — both are stored as a comma-separated list
- Keep patterns anchored on the repository root, as \`**/\` prefixes rather than absolute paths

\`\`\`markdown
## Scope

**/*.spec.ts, **/*.test.ts
\`\`\`

## Rule Writing Guidelines

Each rule should:
- **Start with a verb** (imperative mood): "Use", "Prefer", "Avoid", "Return", "Define", "Extract"
- **Express one concept per rule** — split compound rules into separate bullets
- **Be concise** (~25 words max) — no rationale phrases like "because..." or "to ensure..."
- **Be actionable** — the developer should know exactly what to do
- **Avoid vague terms** — replace "appropriate", "properly", "correctly" with specifics

### Good Rules

\`\`\`markdown
* Use \`readonly\` for properties that should not be reassigned after initialization
* Prefer named exports over default exports for better refactoring support
* Return early from functions to avoid deep nesting
\`\`\`

### Bad Rules

\`\`\`markdown
* Make sure to properly handle errors (vague, no verb-first)
* Use TypeScript because it's safer and better (contains rationale)
* Functions should be small, well-named, and follow single responsibility (multiple concepts)
\`\`\`
`;
