/**
 * Prompt template for generating sample coding standards.
 * Used by the generateSamples.ts script to create standards for different technologies.
 *
 * This prompt follows the guidelines from .claude/skills/packmind-create-standard/SKILL.md
 */

type SampleType = 'language' | 'framework';

function buildExclusionSection(excludeTopics: string[]): string {
  if (excludeTopics.length === 0) {
    return '';
  }

  return `
## ⚠️ EXCLUSIONS - DO NOT INCLUDE
The following topics have dedicated standards and MUST NOT be covered in this standard:
${excludeTopics.map((t) => `- ${t}`).join('\n')}

Do NOT generate rules about these frameworks or their specific patterns.
Focus only on core language features and patterns.

`;
}

export function generateStandardSamplePrompt(
  displayName: string,
  type: SampleType,
  excludeTopics: string[] = [],
): string {
  const typeLabel = type === 'language' ? 'programming language' : 'framework';
  const exclusionSection = buildExclusionSection(excludeTopics);

  return `You are a principal software engineer creating an ADVANCED coding standard for ${displayName} (${typeLabel}).
${exclusionSection}
TARGET AUDIENCE: Experienced developers who already know the basics.

## CRITICAL: Rule Selection Criteria

### ❌ AVOID These Types of Rules (NO VALUE):
- **Beginner-level**: Naming conventions, basic syntax, simple formatting
- **Too common**: Patterns everyone already follows (e.g., "use try-catch", "close resources")
- **Too niche**: Rules that only apply to rare edge cases or specific architectures
- **Obvious**: Things any experienced developer does naturally

### ✅ FOCUS On Rules That Are:
- **Broadly applicable**: Most ${displayName} developers encounter these situations regularly
- **Non-obvious pitfalls**: Common mistakes even experienced developers make
- **High-impact**: Mistakes here cause real production issues (bugs, performance, security)
- **Actionable**: Clear guidance that developers can apply immediately

### Good Rule Characteristics:
- Addresses a scenario 70%+ of ${displayName} developers will face
- Prevents a mistake that causes real-world problems
- Not so common that everyone already does it
- Not so rare that few developers will ever need it

### Examples of GOOD vs BAD Rule Topics:
- ✅ "Handle timeouts on HTTP clients" (common scenario, often forgotten)
- ❌ "Use camelCase for variables" (too basic, everyone knows)
- ❌ "Implement custom class loaders" (too niche, rare use case)
- ✅ "Validate user input at API boundaries" (common, high-impact, often incomplete)
- ❌ "Use async/await" (too common, everyone already does it)

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

## Examples of Well-Written Rules (Broadly Applicable)

- "Set explicit timeouts on all HTTP client calls including connect and read timeouts"
- "Validate and sanitize all user inputs at controller/handler boundaries"
- "Use parameterized queries instead of string concatenation for database operations"
- "Close database connections in finally blocks or use connection pooling"
- "Log exception stack traces with context, not just error messages"
- "Return defensive copies of mutable collections from public methods"
- "Use dependency injection for external services instead of static instances"
- "Isolate unit tests from external dependencies using mocks or stubs"

## Topics to Cover (Broadly Applicable)
Generate rules that MOST ${displayName} developers will benefit from:
- Resource management (connections, streams, handles) - everyone deals with this
- Error handling beyond happy path - common source of production bugs
- Input validation and sanitization - security basics often done wrong
- Timeout and retry patterns - critical for any networked application
- Thread safety for shared state - common pitfall in real applications
- Test isolation and reliability - most projects have flaky tests
- Logging that helps debugging - everyone needs this in production
- Configuration management - every app needs external config
- Dependency injection patterns - standard in modern ${displayName}
- Common framework pitfalls specific to ${displayName}

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
