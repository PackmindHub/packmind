/**
 * Shared rule writing guidelines used across all standard/rule creation prompts.
 * This ensures consistent rule formatting guidance throughout the MCP server.
 */
export const RULE_WRITING_GUIDELINES = `## Rule Writing Guidelines

### Format Requirements
- **Concise**: Max ~25 words per rule
- **Imperative form**: Start with a verb (e.g., "Use", "Avoid", "Prefer", "Ensure")

### Inline Examples (Optional)
Inline examples (code, paths, patterns) are **optional**. Only include them when they clarify something not obvious from the rule text.

**Types of useful inline examples:**
- Code syntax: \`const\`, \`async/await\`, \`/** ... */\`
- File paths: \`infra/repositories/\`, \`domain/entities/\`
- Naming patterns: \`.spec.ts\`, \`I{Name}\` prefix

**Rules that benefit from inline examples:**
> Use design token \`full\` instead of literal \`100%\` for width props
> Place repository implementations in \`infra/repositories/\`

**Rules that are clear without inline examples:**
> Name root describe block after the class or function under test
> Run linting before committing changes
> Keep business logic out of controllers

**Avoid redundant examples that restate the obvious:**
> ❌ Name describe block after the class (e.g., \`describe('MyClass', ...)\`)

### Avoid Rationale Phrases
Rules describe **WHAT** to do, not **WHY**. Strip justifications and benefits - let examples demonstrate value.

**Common fluff patterns to remove:**
- "to improve/provide/ensure..." (benefit phrases)
- "while maintaining/preserving..." (secondary concerns)
- "for better/enhanced..." (quality claims)
- "and enable/allow..." (future benefits)

**Bad (includes rationale):**
> Document props with JSDoc comments to provide IDE intellisense and improve developer experience.

**Good (action only):**
> Document component props with JSDoc comments (\`/** ... */\`) describing purpose, expected values, and defaults.

### Rule Splitting
If a rule addresses 2+ distinct concerns, **proactively split** it into separate rules:

**Bad (too broad):**
> Create centralized color constants in dedicated files for consistent palettes, using semantic naming based on purpose rather than specific color values.

**Good (split into focused rules):**
> * Define color constants in \`theme/colors.ts\` using semantic names (e.g., \`primary\`, \`error\`)
> * Use semantic color tokens instead of literal hex values in components

### Situational Rules
For context-specific rules, add qualifiers:
- "(when applicable)" for optional patterns
- "(in tests:)" or "(in production:)" for environment-specific rules
- "(ask user if conflicts with other rules)" for ambiguous cases`;

/**
 * Rule structure requirements - used in onboarding prompts where rule structure
 * needs to be explained in detail.
 */
export const RULE_STRUCTURE_REQUIREMENTS = `### Rule Structure
Each rule must include:
- **content**: Concise sentence (~30 words max) starting with a verb, with inline code if helpful
- **positive**: Code snippet showing correct implementation
- **negative**: Code snippet showing incorrect implementation
- **language**: Programming language used for the code snippets`;

/**
 * Combined guidelines with structure - for onboarding prompts that need both.
 */
export const RULE_WRITING_GUIDELINES_WITH_STRUCTURE = `${RULE_WRITING_GUIDELINES}

${RULE_STRUCTURE_REQUIREMENTS}`;

/**
 * Rule content template placeholder for response structure templates.
 */
export const RULE_CONTENT_TEMPLATE =
  '[Concise sentence (~25 words max) starting with a verb, with inline code if helpful]';
