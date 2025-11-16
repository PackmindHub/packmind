export const determineNewArtifactPrompt = `You are analyzing a technical decision to determine if it should become a new coding standard or recipe.

Topic:
Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

Context:
- No existing standards or recipes matched this topic closely enough for updates
- We need to determine if this warrants creating new knowledge artifacts

Task: Determine if this topic should:
1. Become a new coding standard (establishes rules/guidelines)
2. Become a new recipe (provides step-by-step implementation)
3. Not warrant a new artifact (insufficient content)

Return JSON format:
{
  "createStandard": true/false,
  "createRecipe": true/false,
  "standardProposal": {
    "name": "proposed standard name",
    "description": "what this standard covers",
    "rules": ["rule 1", "rule 2"],
    "scope": "what this applies to"
  } or null,
  "recipeProposal": {
    "name": "proposed recipe name",
    "description": "what problem this solves",
    "content": "markdown formatted recipe with steps"
  } or null,
  "rationale": "explanation of the recommendation"
}`;
