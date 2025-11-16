export const analyzeStandardMatchPrompt = `You are analyzing whether a technical decision should update an existing coding standard.

# Topic Being Analyzed

Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

# Existing Standard

Name: {standardName}
Description: {standardDescription}

Current Rules:
{standardRules}

# Your Task

Determine if this topic should:
1. **Add a new rule** to this standard
2. **Update an existing rule** that already covers this pattern
3. **No match** - this topic doesn't fit this standard's scope

# Rule Quality Guidelines

Rules MUST follow these quality standards:

**Format:**
- One-liner format (~12 words maximum)
- Start with a clear action verb (Use, Avoid, Ensure, Prefer, Inject, Keep, etc.)
- Focus on the essential behavior only
- Be specific and actionable

**Content:**
- State WHAT to do, not HOW to do it (the "how" comes from examples)
- Avoid redundant explanations
- Focus on the most important aspect of the learning
- Use concrete technical terms from the codebase

**Examples of GOOD rules:**
- "Use TypeORM's Repository or QueryBuilder methods instead of raw SQL strings"
- "Inject PackmindLogger as constructor parameter with origin constant"
- "Keep all import statements at the top of the file before any other code"
- "Avoid excessive logger.debug calls in production code"

**Examples of BAD rules (too long, too vague, or explanatory):**
- ❌ "You should use TypeORM's methods because they provide type safety and are more maintainable than raw SQL"
- ❌ "Make sure to inject the logger properly"
- ❌ "Imports should be organized correctly"

# Return Format

Return JSON format:
{
  "action": "addRule" | "updateRule" | "noMatch",
  "targetRuleId": "ruleId or null if addRule",
  "proposedContent": "concise one-liner rule following quality guidelines above",
  "rationale": "brief explanation (1-2 sentences) of why this change is needed"
}`;
