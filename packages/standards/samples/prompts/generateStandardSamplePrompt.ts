/**
 * Prompt template for generating sample coding standards.
 * Used by the generateSamples.ts script to create standards for different technologies.
 *
 * This prompt follows the guidelines from .claude/skills/packmind-create-standard/SKILL.md
 */

type SampleType = 'language' | 'framework';

export function generateStandardSamplePrompt(
  displayName: string,
  type: SampleType,
): string {
  const typeLabel = type === 'language' ? 'programming language' : 'framework';

  return `You are an expert software engineer creating a coding standard for ${displayName} (${typeLabel}).

Generate a JSON coding standard following these STRICT requirements:

## Output Format
Return ONLY valid JSON with this exact structure (no markdown, no backticks, no explanation):
{
  "name": "${displayName} Best Practices",
  "description": "A clear description of what this standard covers and what problems it solves.",
  "scope": "${displayName} source files",
  "rules": [
    {
      "content": "Rule text starting with action verb (max ~25 words)",
      "examples": {
        "positive": "Code example showing correct usage",
        "negative": "Code example showing incorrect usage",
        "language": "LANGUAGE_CODE"
      }
    }
  ]
}

## CRITICAL: Rule Writing Guidelines

Generate exactly **10 rules** following these requirements:

### 1. Start with an Action Verb
Use imperative form: Use, Avoid, Prefer, Include, Define, Place, Name, Keep, Follow, Apply, etc.

### 2. Be Concise
Maximum ~25 words per rule. Strip unnecessary words.

### 3. Be Specific and Actionable
Avoid vague guidance like "Write good code" or "Follow best practices".

### 4. One Concept Per Rule
If a rule addresses 2+ distinct concerns, it should be split. Each rule focuses on ONE thing.

### 5. AVOID RATIONALE PHRASES - THIS IS CRITICAL
Rules describe WHAT to do, NOT WHY. Strip ALL justifications and benefits.

**Fluff patterns to REMOVE:**
- "to improve/provide/ensure..." (benefit phrases)
- "while maintaining/preserving..." (secondary concerns)
- "for better/enhanced..." (quality claims)
- "and enable/allow..." (future benefits)
- "which helps/makes..." (explanations)

**BAD (includes rationale):**
"Use dependency injection to improve testability and enable loose coupling."

**GOOD (action only):**
"Use dependency injection for external dependencies like databases and HTTP clients."

**BAD (includes rationale):**
"Document public methods with JSDoc to provide IDE intellisense."

**GOOD (action only):**
"Document public methods with JSDoc comments describing parameters and return values."

### 6. Provide Positive Guidance
Don't just say what NOT to do. Tell what TO do instead.

**BAD:** "Don't use var"
**GOOD:** "Use const for variables that are never reassigned, let for reassigned variables"

## Examples of Well-Written Rules

- "Use const instead of let for variables that are never reassigned"
- "Prefix interface names with I (e.g., \`IUserService\`)"
- "Place repository implementations in \`infra/repositories/\`"
- "Name test files with \`.spec.ts\` suffix matching the source file name"
- "Handle errors at service boundaries using try-catch with specific error types"
- "Follow Arrange-Act-Assert pattern in test structure"
- "Use async/await instead of Promise chains for asynchronous operations"

## Example Topics to Cover
Generate rules covering a mix of these areas relevant to ${displayName}:
- Naming conventions (files, classes, functions, variables)
- Code organization and structure
- Error handling patterns
- Type safety (if applicable)
- Common idioms and patterns specific to ${displayName}
- Testing patterns
- Documentation requirements

## Language for Code Examples
Choose the appropriate programming language based on ${displayName}:
- Java → JAVA
- Spring → JAVA
- TypeScript → TYPESCRIPT
- React → TYPESCRIPT_TSX
- Python → PYTHON
- Go → GO
- Rust → RUST
- Kotlin → KOTLIN
- Swift → SWIFT
- C# → CSHARP
- PHP → PHP
- Ruby → RUBY

## Valid Language Codes
TYPESCRIPT, TYPESCRIPT_TSX, JAVASCRIPT, JAVASCRIPT_JSX, PYTHON, JAVA, GO, RUST, CSHARP, PHP, RUBY, KOTLIN, SWIFT, SQL, HTML, CSS, SCSS, YAML, JSON, MARKDOWN, BASH, GENERIC

## Final Checklist Before Generating
- [ ] Exactly 10 rules
- [ ] Each rule starts with action verb
- [ ] Each rule is max ~25 words
- [ ] NO rationale phrases (to improve, for better, to ensure, etc.)
- [ ] Each rule focuses on ONE concept
- [ ] Each rule has positive and negative examples
- [ ] Examples use the correct language code

Generate the JSON now:`;
}
