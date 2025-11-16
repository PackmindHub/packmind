export const determineNewArtifactPrompt = `You are analyzing a technical decision to determine if it should become a new coding standard or recipe.

# Topic Being Analyzed

Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

# Context

- No existing standards or recipes matched this topic closely enough for updates
- We need to determine if this warrants creating new knowledge artifacts

# Your Task

Determine if this topic should:
1. **Become a new coding standard** (establishes rules/guidelines for consistent code patterns)
2. **Become a new recipe** (provides step-by-step implementation guide)
3. **Not warrant a new artifact** (insufficient content, too specific, or not reusable)

# Quality Guidelines

## For Standards

**When to create a standard:**
- The topic establishes repeatable code patterns or guidelines
- It applies broadly across the codebase (not just one specific case)
- It prevents common mistakes or enforces best practices

**Structure:**
- **Name**: Clear, descriptive title (e.g., "Back-end TypeScript", "Frontend Error Management")
- **Description**: Context paragraph (2-3 sentences) explaining when/why to apply this standard
- **Rules**: 3-5 concise rules (one-liners, ~12 words each)
  - Start with action verbs (Use, Avoid, Ensure, Prefer, etc.)
  - State WHAT to do, not HOW (examples show the "how")
  - Be specific and actionable
- **Scope**: What this applies to (e.g., "TypeScript back-end services", "React components")

**Examples of GOOD rules:**
- "Use TypeORM's Repository or QueryBuilder methods instead of raw SQL strings"
- "Inject PackmindLogger as constructor parameter with origin constant"
- "Avoid excessive logger.debug calls in production code"

## For Recipes

**When to create a recipe:**
- The topic provides a clear implementation process
- It solves a specific, recurring problem
- It has distinct steps that developers can follow

**Structure:**
- **Name**: Action-oriented title of what to accomplish (e.g., "Create UseCase Test Class Template")
- **Description**: Single sentence (max 2 lines) explaining intent and value
- **Content**: Markdown with these sections:
  - **Summary**: Concise one-liner of what this recipe does
  - **When to Use**: 3-5 brief, specific scenarios (one line each)
  - **Implementation Steps**: 5-8 numbered steps maximum
    - Each step has action-oriented title (5-8 words)
    - Brief description (1-2 sentences)
    - Optional focused code snippet (5-15 lines, no boilerplate)

**Focus on:**
- Conciseness - no redundant explanations
- Minimal code examples showing essential patterns only
- "What" and "why", not detailed "how"

# Return Format

Return JSON format:
{
  "createStandard": true/false,
  "createRecipe": true/false,
  "standardProposal": {
    "name": "Clear, descriptive standard name",
    "description": "2-3 sentence context paragraph explaining when/why this applies",
    "rules": ["One-liner rule 1", "One-liner rule 2", "One-liner rule 3"],
    "scope": "What this standard applies to (e.g., 'TypeScript services', 'React components')"
  } or null,
  "recipeProposal": {
    "name": "Action-oriented recipe name",
    "description": "Single concise sentence explaining intent and value",
    "content": "Complete markdown content following the recipe structure above"
  } or null,
  "rationale": "Brief explanation (2-3 sentences) of why this recommendation makes sense"
}`;
