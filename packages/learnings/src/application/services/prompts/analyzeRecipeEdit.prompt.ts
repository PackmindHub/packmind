export const analyzeRecipeEditPrompt = `You are analyzing a technical topic to determine what changes should be made to an existing recipe.

# Topic Information
Title: {topicTitle}
Content: {topicContent}

Code Examples from Topic:
{codeExamples}

# Current Recipe
Name: {recipeName}
Content:
{recipeContent}

# Your Task
Analyze the topic and determine what changes should be made to this recipe. You can:
1. **Modify the recipe name** if the topic suggests a better, clearer name
2. **Modify the recipe content** (the full markdown content including steps, examples, etc.)
3. **Add new code examples** if the topic provides examples that illustrate the recipe
4. **Update existing code examples** if the topic shows better examples
5. **Delete code examples** if the topic indicates they are outdated or misleading

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "changes": {
    "name": "New recipe name" | null,
    "content": "Full updated recipe content in markdown" | null,
    "exampleChanges": {
      "toAdd": [{"lang": "typescript", "code": "example code", "description": "what this shows"}] | null,
      "toUpdate": [{"exampleId": "example-id", "lang": "typescript", "code": "updated code", "description": "what this shows"}] | null,
      "toDelete": ["example-id-1"] | null
    } | null
  },
  "rationale": "Brief explanation of why these changes are needed"
}

# Important Guidelines
- Only include fields that need to be changed (use null for unchanged fields)
- If modifying content, provide the FULL updated markdown content, not just the changed parts
- For exampleChanges, only include if you're modifying code examples specifically (not content)
- Be specific and actionable in your changes
- The rationale should explain the overall impact of all changes

# Example Response
{"changes": {"name": null, "content": "# How to Handle User Input\\n\\n## Goal\\nSafely process user input...\\n\\n## Steps\\n1. Validate input\\n2. Sanitize data\\n3. Process", "exampleChanges": null}, "rationale": "Updated recipe to include input validation as a critical first step based on security concerns in the topic"}
`;
