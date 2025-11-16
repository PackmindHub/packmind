export const analyzeRecipeMatchPrompt = `You are analyzing whether a technical decision should update an existing recipe.

Topic:
Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

Existing Recipe:
Name: {recipeName}
Current Content:
{recipeContent}

Task: Determine if this topic should:
1. Add new steps to this recipe
2. Modify existing steps
3. Not affect this recipe (no match)

Return JSON format:
{
  "action": "addSteps" | "updateSteps" | "noMatch",
  "proposedContent": "the new or updated recipe content in markdown",
  "rationale": "brief explanation of why this change is needed",
  "diffOriginal": "the original recipe content (current content for both addSteps and updateSteps)",
  "diffModified": "the proposed new recipe content with additions/changes"
}`;
