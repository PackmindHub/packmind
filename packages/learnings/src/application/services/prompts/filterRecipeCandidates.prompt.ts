export const filterRecipeCandidatesPrompt = `You are analyzing a technical decision/learning to identify which existing recipes might be relevant.

Topic Title: {topicTitle}
Topic Content: {topicContent}

Available Recipes:
{recipesList}

Task: Return a JSON array of recipe IDs that are relevant to this topic. Consider:
- Does the topic provide a new implementation approach?
- Does the topic improve or modify an existing recipe's steps?
- Is there overlap in the problem domain?

Return format: ["recipeId1", "recipeId2", ...]
Maximum 3 most relevant recipes.
If no recipes are relevant, return an empty array: []`;
