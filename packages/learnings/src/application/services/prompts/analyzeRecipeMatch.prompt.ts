export const analyzeRecipeMatchPrompt = `You are analyzing whether a technical decision should update an existing recipe.

# Topic Being Analyzed

Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

# Existing Recipe

Name: {recipeName}

Current Content:
{recipeContent}

# Your Task

Determine if this topic should:
1. **Add new steps** to this recipe (extends the existing implementation)
2. **Update existing steps** (modifies or clarifies current steps)
3. **No match** - this topic doesn't fit this recipe's scope

# Recipe Quality Guidelines

When proposing recipe updates, follow these quality standards:

**Structure:**
- Maintain the existing recipe format (Summary, When to Use, Implementation Steps)
- Keep implementation steps numbered (5-8 steps maximum)
- Each step should have a clear, action-oriented title (5-8 words max)

**Content:**
- Be concise and to the point
- Use minimal code examples that show only the essential pattern (5-15 lines max)
- Avoid boilerplate or repetitive explanations
- Focus on "what" and "why", keep "how" minimal
- Use concrete technical terms from the codebase

**For Adding New Steps:**
- Ensure the new step logically follows the existing flow
- Give it a clear step number and title
- Include a brief description (1-2 sentences)
- Add a focused code snippet if helpful (optional)

**For Updating Existing Steps:**
- Preserve the step structure and numbering
- Only modify what needs to change
- Keep the same level of conciseness
- Ensure consistency with other steps

# Return Format

Return JSON format:
{
  "action": "addSteps" | "updateSteps" | "noMatch",
  "proposedContent": "the complete updated recipe content in markdown following quality guidelines",
  "rationale": "brief explanation (1-2 sentences) of what changed and why"
}`;
