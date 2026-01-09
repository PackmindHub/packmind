---
name: decision-capture
description: Silently capture implicit technical decisions made by AI agents during coding work. This skill logs specific implementation choices, architectural patterns, and design decisions that were not explicitly requested by the user or documented in project context. Use this proactively after completing tasks to track "what technical choices I made and why."
---

# Decision Capture Skill

This skill helps AI agents create a transparent log of implicit technical decisions made during implementation. The goal is to capture specific, non-obvious choices that could be valuable for later review and potential standardization.

## Purpose

AI agents constantly make technical decisions during implementation:

- "I'll use the compound component pattern here"
- "I'll handle errors with custom exception classes"
- "I'll organize tests with factory functions"
- "I'll structure the API with repository pattern"
- "I'll implement caching at the service layer"

These decisions:

1. Were NOT explicitly requested by the user
2. Were NOT documented in CLAUDE.md or standards
3. Reflect specific architectural/design choices
4. Could become patterns worth standardizing

By capturing them, developers can:

1. **Review what patterns emerged** during implementation
2. **Validate AI decisions** and provide feedback
3. **Identify candidates for standards** that should be formalized
4. **Understand the rationale** behind implementation choices
5. **Track consistency** of patterns across the codebase

## When to Use This Skill

Use this skill **proactively and silently** after completing coding tasks when you made:

1. **Architectural Decisions**
   - Component structure or composition patterns
   - Module organization or layering
   - Data flow or state management approach
   - API design patterns

2. **Design Pattern Choices**
   - Factory, Builder, Strategy, etc.
   - Functional vs OOP approaches
   - Composition vs inheritance
   - Dependency injection patterns

3. **Implementation Strategies**
   - Error handling approach
   - Validation logic placement
   - Caching strategies
   - Performance optimizations

4. **Testing Approaches**
   - Test data creation methods
   - Mock vs real dependencies
   - Test organization patterns
   - Assertion strategies

5. **Code Organization**
   - File/folder structure decisions
   - Naming conventions not documented
   - Import/export patterns
   - Code grouping logic

## When NOT to Use

Don't capture:

- **Trivial syntax choices** (const vs let, quote style)
- **Standard language/framework conventions** (React hooks basics, TypeScript standard patterns)
- **User-specified requirements** (user explicitly asked for this approach)
- **Documented patterns** (already in CLAUDE.md or .packmind/standards)
- **Generic best practices** ("write clean code" - too vague)
- **Obvious only-choice decisions** (using the only available library)

## Workflow

### Step 1: Complete Your Task

Implement the feature/fix as requested by the user.

### Step 2: Reflect on Decisions (Silent)

After completing the task, mentally review:

- What technical decisions did I make?
- Were any of these NOT explicitly requested?
- Are these non-obvious choices?
- Could these be valuable patterns?

### Step 3: Silent Logging

**Silently** append significant decisions to `.claude/decisions.yaml`:

```yaml
- timestamp: 2026-01-09T10:30:00Z
  file: src/components/UserProfile.tsx
  context: 'Implementing user profile component'
  category: 'architecture' # architecture|patterns|naming|testing|error-handling|performance|security|styling|dependencies
  decision: 'Use compound component pattern with Profile.Header, Profile.Content, Profile.Actions'
  reasoning: 'Provides composition flexibility while maintaining encapsulation. Follows Chakra UI pattern seen in codebase.'
  alternatives:
    - 'Single monolithic component with section props'
    - 'Separate independent components'
  impact: 'module' # local|module|global
  confidence: 'medium' # low|medium|high
  source: 'pattern-matching' # ai-agent|inference|pattern-matching
  tags:
    - 'react'
    - 'component-architecture'
    - 'compound-components'
```

### Step 4: File Management

**Location:** Always use `.claude/decisions.yaml` at the repository root.

**Structure:** Array of decision entries, most recent last.

**Format Rules:**

- `timestamp`: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- `file`: Relative path from repo root where decision was applied
- `context`: Brief description of what you were implementing
- `category`: One of: architecture, patterns, naming, testing, error-handling, performance, security, styling, dependencies
- `decision`: The technical decision made (verb-first, imperative like "Use X pattern", "Structure Y as Z")
- `reasoning`: Why you chose this approach (reference similar patterns if found)
- `alternatives`: List of other valid options you considered (optional but recommended)
- `impact`: Scope of the decision
  - `local`: Affects only this file/component
  - `module`: Could affect this package/folder
  - `global`: Could be project-wide pattern
- `confidence`: low (experimental) | medium (reasonable) | high (confident)
- `source`: How you arrived at this decision
  - `ai-agent`: Based on your general AI knowledge
  - `inference`: Inferred from codebase patterns
  - `pattern-matching`: Following similar code you found
- `tags`: Relevant keywords for filtering/searching

**CRITICAL:** This is a silent operation. Do NOT:

- Ask the user if you should log it
- Confirm to the user that you logged it
- Interrupt your workflow to announce it
- Make it visible in your response

Logging happens seamlessly after completing tasks.

### Step 5: User Review (Later)

Users can review `.claude/decisions.yaml` at any time to:

- Understand what technical choices were made
- Validate or question specific decisions
- Identify patterns that should become standards
- Provide feedback for future implementations
- Use signal-capture to formalize good patterns

## Example Scenarios

### Example 1: Component Architecture

```yaml
- timestamp: 2026-01-09T09:15:00Z
  file: src/features/dashboard/Dashboard.tsx
  context: 'Creating dashboard feature with multiple widgets'
  category: 'architecture'
  decision: 'Use container/presenter pattern with DashboardContainer fetching data and Dashboard handling presentation'
  reasoning: 'Separates data fetching concerns from UI logic. Saw this pattern in features/analytics folder.'
  alternatives:
    - 'All-in-one component with hooks'
    - 'Use React Query in presentational component'
  impact: 'module'
  confidence: 'high'
  source: 'inference'
  tags:
    - 'react'
    - 'container-presenter'
    - 'separation-of-concerns'
```

### Example 2: Error Handling Strategy

```yaml
- timestamp: 2026-01-09T10:45:00Z
  file: src/services/payment/PaymentService.ts
  context: 'Implementing payment processing service'
  category: 'error-handling'
  decision: 'Use Result<T, E> type instead of throwing exceptions for expected errors (insufficient funds, invalid card)'
  reasoning: 'Makes error handling explicit and type-safe. Allows callers to handle errors functionally without try-catch.'
  alternatives:
    - 'Throw custom exception classes'
    - 'Return null with separate error channel'
  impact: 'global'
  confidence: 'medium'
  source: 'ai-agent'
  tags:
    - 'error-handling'
    - 'functional-programming'
    - 'type-safety'
```

### Example 3: Test Organization

```yaml
- timestamp: 2026-01-09T11:30:00Z
  file: src/domain/user/User.spec.ts
  context: 'Writing domain model tests'
  category: 'testing'
  decision: 'Create test fixtures using factory functions (createTestUser, createTestOrganization) in __fixtures__ folder'
  reasoning: 'Reduces test data duplication, provides consistent defaults, easier to maintain. Saw similar pattern in auth tests.'
  alternatives:
    - 'Inline test data in each test'
    - 'Shared constants file with test objects'
    - 'Use testing library like factory.ts'
  impact: 'module'
  confidence: 'high'
  source: 'pattern-matching'
  tags:
    - 'testing'
    - 'test-data'
    - 'fixtures'
    - 'maintainability'
```

### Example 4: API Design

```yaml
- timestamp: 2026-01-09T14:00:00Z
  file: src/api/users/users.controller.ts
  context: 'Creating user management API endpoints'
  category: 'patterns'
  decision: 'Use command/query separation with dedicated command and query objects instead of request DTOs'
  reasoning: 'Clearly separates write operations from reads, enables command/query handlers. Aligns with CQRS principles I see in codebase.'
  alternatives:
    - 'Traditional REST with DTOs'
    - 'GraphQL mutations/queries'
  impact: 'global'
  confidence: 'medium'
  source: 'inference'
  tags:
    - 'cqrs'
    - 'api-design'
    - 'commands'
    - 'architecture'
```

### Example 5: Performance Optimization

```yaml
- timestamp: 2026-01-09T15:20:00Z
  file: src/components/DataTable.tsx
  context: 'Implementing large data table with pagination'
  category: 'performance'
  decision: 'Use React.memo with custom comparison function on table rows instead of virtualizing'
  reasoning: 'Table has max 50 rows per page, virtualization overhead not worth it. Memo prevents unnecessary row re-renders on pagination.'
  alternatives:
    - 'Virtual scrolling with react-window'
    - 'No optimization (let React handle it)'
  impact: 'local'
  confidence: 'high'
  source: 'ai-agent'
  tags:
    - 'performance'
    - 'react'
    - 'memoization'
    - 'optimization'
```

### Example 6: Dependency Management

```yaml
- timestamp: 2026-01-09T16:10:00Z
  file: src/utils/date.ts
  context: 'Adding date formatting utilities'
  category: 'dependencies'
  decision: 'Use date-fns instead of moment.js or dayjs'
  reasoning: 'date-fns already in package.json dependencies. Tree-shakeable and modern. No need for additional library.'
  alternatives:
    - 'dayjs (smaller bundle)'
    - 'native Intl.DateTimeFormat (no dependency)'
    - 'moment.js (legacy, larger bundle)'
  impact: 'global'
  confidence: 'high'
  source: 'inference'
  tags:
    - 'dependencies'
    - 'date-formatting'
    - 'bundle-size'
```

## Integration Pattern

### During Task Completion

After implementing a feature:

1. Complete the implementation
2. Reflect on technical decisions (mentally)
3. Identify non-trivial, implicit choices
4. Silently log to decisions.yaml
5. Continue to next task or respond to user

### Example Flow

```
User: "Add a search feature to the products page"

[AI implements search with debouncing, case-insensitive matching, highlighting]

[AI thinking: "I decided to debounce at 300ms - not specified by user"]
[AI thinking: "I chose case-insensitive search - non-obvious choice"]
[AI thinking: "I added result highlighting - enhancement decision"]

[AI silently logs these decisions to .claude/decisions.yaml]

AI: "I've added the search feature with debounced input (300ms delay),
     case-insensitive matching, and result highlighting."
```

User sees the implementation. Later, they can review `.claude/decisions.yaml` to see WHY these choices were made.

## Benefits

1. **Transparency**: Developers see the AI's technical decision-making process
2. **Pattern Discovery**: Reveals emerging patterns that should be standardized
3. **Knowledge Capture**: Documents implementation rationale for future reference
4. **Quality Assurance**: Enables review of AI decisions before they become habits
5. **Standard Creation**: Provides source material for formalizing practices
6. **Onboarding**: New team members see examples of project patterns
7. **Continuous Improvement**: Feedback loop for improving AI coding decisions

## Important Guidelines

1. **Be specific**: Decisions should be concrete and actionable, not vague
2. **Be honest**: Log real decisions you made, not theoretical ones
3. **Be selective**: Only log non-trivial, project-specific choices
4. **Be silent**: Never interrupt workflow with logging notifications
5. **Be contextual**: Include enough information to understand the situation later
6. **Reference patterns**: When you followed existing code, mention it
7. **Consider impact**: Tag global decisions for higher-priority review
8. **Track confidence**: Low confidence = needs earlier review
9. **Source attribution**: Distinguish between your AI knowledge vs codebase patterns

## Decisions YAML Schema

```yaml
# .claude/decisions.yaml
- timestamp: string         # ISO 8601: "2026-01-09T10:30:00Z"
  file: string             # Relative path: "src/api/users.ts"
  context: string          # Brief: "Adding user authentication"
  category: string         # architecture|patterns|naming|testing|error-handling|performance|security|styling|dependencies
  decision: string         # Imperative: "Use factory pattern for object creation"
  reasoning: string        # Why: "Encapsulates creation logic, saw pattern in auth module"
  alternatives: array      # Optional: Other options considered
    - string
  impact: string          # local|module|global
  confidence: string      # low|medium|high
  source: string          # ai-agent|inference|pattern-matching
  tags: array            # Keywords
    - string
```

## Future Use

Once `.claude/decisions.yaml` accumulates entries, developers can:

1. **Review by impact** - Check global decisions first
2. **Review by confidence** - Validate low-confidence choices
3. **Identify patterns** - Group by category to see trends
4. **Create standards** - Use signal-capture to formalize good patterns
5. **Provide feedback** - Add clarifications to CLAUDE.md
6. **Audit consistency** - Ensure similar problems have similar solutions
7. **Generate documentation** - Extract patterns for onboarding docs

## Integration with Other Skills

- **signal-capture**: When user reviews decisions and wants to formalize a pattern

  ```
  User: "I like this compound component pattern, let's make it our standard"
  → Use signal-capture to add to standards
  ```

- **uncertainty-capture**: Sometimes overlaps, but:
  - Uncertainty = "I wondered about X" (question-focused)
  - Decision = "I chose X" (decision-focused)
  - If both uncertain AND decided, log to both files

- **Standard creation**: Decisions file provides source material for new standards

## Review Workflow

Periodic review process:

1. **Weekly Review**: Scan new decisions
2. **Filter by impact**: Review global decisions first
3. **Filter by confidence**: Check low-confidence decisions
4. **Identify patterns**: Look for repeated similar decisions
5. **Formalize**: Use signal-capture to add patterns to standards
6. **Clarify**: Add guidelines to CLAUDE.md for future AI agents
7. **Clean up**: Archive reviewed decisions or mark as "reviewed"

---

**Remember:** This skill should be used proactively and silently after completing coding tasks. It's not about asking permission - it's about creating a transparent technical decision log for later review and pattern discovery.
