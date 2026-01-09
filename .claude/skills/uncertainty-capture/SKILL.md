---
name: uncertainty-capture
description: Silently capture questions, uncertainties, and implicit decisions made by AI agents during coding work. This skill logs decision points where the agent chose an approach without asking the user, enabling later review and context enrichment. Use this proactively during any coding task to track "what I wondered but didn't ask."
---

# Uncertainty Capture Skill

This skill helps AI agents track their internal questions, uncertainties, and decision-making process during coding work. The goal is to create a transparent log of "what the AI wondered about" so developers can review these decision points and provide better context for future work.

## Purpose

AI agents often make decisions during implementation without asking the user:

- "Should I use async/await or Promises?"
- "Is this the right design pattern for this context?"
- "Should tests use mocks or real implementations?"
- "What's the naming convention for this type of file?"
- "How should errors be handled here?"

These questions reflect gaps in context. By capturing them, developers can:

1. Review what assumptions were made
2. Create explicit guidelines in CLAUDE.md
3. Add standards to Packmind
4. Improve future AI agent performance

## When to Use This Skill

Use this skill **proactively and silently** during any coding work when you (the AI agent):

1. **Make a design decision** without explicit guidance
   - Choose between multiple valid approaches
   - Pick a pattern or architecture
   - Decide on naming conventions
   - Select a library or tool

2. **Encounter ambiguity** in requirements
   - User's instructions could be interpreted multiple ways
   - Best practices are unclear for this context
   - No existing examples to follow

3. **Apply implicit knowledge** from general training
   - Use "common practices" that may not match this codebase
   - Make assumptions about code style
   - Infer patterns from limited examples

4. **Feel uncertain** about your choice
   - Low confidence in the approach
   - Multiple alternatives seem equally valid
   - Unusual or edge case scenario

## When NOT to Use

- Don't capture trivial syntax decisions (e.g., "const vs let")
- Don't capture well-established patterns already documented
- Don't capture decisions the user explicitly made
- Don't use for clarification questions - ask the user instead

## Workflow

### Step 1: Silent Capture (During Work)

When you make a decision during coding, **silently** append it to `.claude/questions.yaml` without interrupting the user or your workflow:

```yaml
- timestamp: 2026-01-09T10:30:00Z
  file: src/components/UserProfile.tsx
  context: 'Implementing user profile component'
  category: 'architecture' # or: testing, naming, error-handling, patterns, dependencies
  question: 'Should the component fetch its own data or receive it via props?'
  decision_made: 'Made it a container component that fetches its own data'
  reasoning: 'Other components in /src/components/ seem to follow this pattern'
  alternatives:
    - 'Pass data via props (presentational component)'
    - 'Use React Query for data fetching'
  confidence: 'medium' # low, medium, high
  tags:
    - 'react'
    - 'data-fetching'
    - 'component-architecture'
```

### Step 2: File Management

**Location:** Always use `.claude/questions.yaml` at the repository root.

**Structure:** Array of question entries, most recent last.

**Format rules:**

- `timestamp`: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- `file`: Relative path from repo root
- `context`: Brief description of what you were doing
- `category`: One of: architecture, testing, naming, error-handling, patterns, dependencies, styling, performance, security
- `question`: The actual question/uncertainty you had
- `decision_made`: What you actually implemented
- `reasoning`: Why you made this choice
- `alternatives`: List of other options you considered
- `confidence`: low (uncertain, needs review) | medium (reasonable choice) | high (confident but worth documenting)
- `tags`: Relevant keywords for filtering/searching

**IMPORTANT:** This is a silent operation. Do NOT:

- Ask the user if you should log it
- Confirm to the user that you logged it
- Interrupt your workflow to announce it
- Make it visible in your output

The logging should happen seamlessly in the background as you work.

### Step 3: User Review (Later)

Users can review `.claude/questions.yaml` at any time to:

- Understand what decisions were made
- Identify patterns in uncertainties
- Create explicit guidelines
- Add standards to Packmind
- Update CLAUDE.md with clearer instructions

## Example Scenarios

### Example 1: Testing Approach

```yaml
- timestamp: 2026-01-09T14:22:00Z
  file: src/services/auth.spec.ts
  context: 'Writing unit tests for authentication service'
  category: 'testing'
  question: 'Should I mock the database or use an in-memory test database?'
  decision_made: 'Used mocks for the database layer'
  reasoning: 'Tests run faster with mocks and other test files in the codebase use this approach'
  alternatives:
    - 'Use in-memory SQLite for integration testing'
    - 'Use test containers with real database'
  confidence: 'medium'
  tags:
    - 'testing'
    - 'mocking'
    - 'database'
```

### Example 2: Error Handling

```yaml
- timestamp: 2026-01-09T15:45:00Z
  file: src/api/users.ts
  context: 'Adding error handling to user API endpoints'
  category: 'error-handling'
  question: 'Should API errors throw exceptions or return Result<T, Error> types?'
  decision_made: 'Threw exceptions and let the global error handler catch them'
  reasoning: 'Express.js convention is to use next(err) middleware pattern'
  alternatives:
    - 'Return Result<T, Error> types for explicit error handling'
    - 'Use Either monad pattern'
    - 'Return null with separate error channel'
  confidence: 'low'
  tags:
    - 'error-handling'
    - 'api'
    - 'typescript'
```

### Example 3: Naming Convention

```yaml
- timestamp: 2026-01-09T16:10:00Z
  file: src/hooks/useUserData.ts
  context: 'Creating custom React hook for user data'
  category: 'naming'
  question: 'Should custom hooks be in /hooks or co-located with components?'
  decision_made: 'Placed in /src/hooks/ directory'
  reasoning: 'Found other custom hooks in this directory'
  alternatives:
    - 'Co-locate with the component that uses it'
    - 'Create /src/lib/hooks for reusable hooks'
  confidence: 'high'
  tags:
    - 'react'
    - 'hooks'
    - 'project-structure'
```

### Example 4: Dependency Choice

```yaml
- timestamp: 2026-01-09T16:55:00Z
  file: src/utils/date.ts
  context: 'Adding date formatting utility'
  category: 'dependencies'
  question: 'Should I use date-fns, dayjs, or native Intl for date formatting?'
  decision_made: 'Used date-fns because it was already in package.json'
  reasoning: 'Avoiding adding new dependencies, date-fns already installed'
  alternatives:
    - 'Use dayjs (smaller bundle size)'
    - 'Use native Intl.DateTimeFormat (no dependencies)'
  confidence: 'high'
  tags:
    - 'dependencies'
    - 'date-formatting'
    - 'utilities'
```

## Integration Pattern

### During Normal Work

When implementing a feature:

1. Write code as normal
2. When you make a decision without explicit guidance, silently append to questions.yaml
3. Continue working without interruption
4. Multiple decisions can be logged during a single task

### Example Flow

```
User: "Add a search feature to the user list"

[AI Agent thinking: "Should search be debounced? How long? No guidance provided..."]
[AI Agent silently logs to questions.yaml]
[AI Agent implements with 300ms debounce]

[AI Agent thinking: "Should search be case-sensitive? No examples to follow..."]
[AI Agent silently logs to questions.yaml]
[AI Agent implements case-insensitive search]

AI Agent: "I've added the search feature with debounced input (300ms) and case-insensitive matching."
```

User sees the implementation but can later review questions.yaml to see what decisions were made and why.

## Benefits

1. **Transparency**: Developers can see the AI's decision-making process
2. **Context improvement**: Identify gaps in project guidelines
3. **Standard creation**: Questions reveal patterns that should be documented
4. **Trust building**: Users understand what assumptions were made
5. **Continuous improvement**: Each project improves context for future work

## Important Guidelines

1. **Be honest**: Log real uncertainties, not imagined ones
2. **Be specific**: Include enough context to understand the situation later
3. **Be concise**: Keep entries focused and scannable
4. **Be silent**: Never interrupt the user with logging notifications
5. **Be selective**: Only log meaningful decisions, not trivial choices
6. **Use categories**: Proper categorization helps with review and analysis
7. **Track confidence**: Low-confidence decisions need review more urgently

## Questions YAML Schema

```yaml
# .claude/questions.yaml
- timestamp: string # ISO 8601: "2026-01-09T10:30:00Z"
  file: string # Relative path: "src/api/users.ts"
  context: string # Brief description: "Adding user search endpoint"
  category: string # architecture|testing|naming|error-handling|patterns|dependencies|styling|performance|security
  question: string # The uncertainty: "Should validation be done in middleware or controller?"
  decision_made: string # What was implemented: "Added validation middleware"
  reasoning: string # Why this choice: "Other endpoints use middleware pattern"
  alternatives: # Other options considered
    - string # "Validate in controller"
    - string # "Use class-validator decorators"
  confidence: string # low|medium|high
  tags: # Keywords for filtering
    - string # "validation"
    - string # "middleware"
```

## Future Use

Once `.claude/questions.yaml` accumulates entries, developers can:

1. **Review patterns** - Group by category to see common uncertainties
2. **Create guidelines** - Add rules to CLAUDE.md for recurring questions
3. **Add standards** - Use signal-capture skill to formalize patterns
4. **Onboard new AI contexts** - Show examples of past decisions
5. **Audit decisions** - Review low-confidence choices first

## Integration with Other Skills

- **signal-capture**: When user reviews questions and wants to formalize a pattern
- **Standard creation**: Questions reveal gaps that need documentation
- **Code review**: Questions file serves as supplementary context

---

**Remember:** This skill should be used proactively and silently during ALL coding work. It's not about asking permission - it's about creating a transparent log for later review.
