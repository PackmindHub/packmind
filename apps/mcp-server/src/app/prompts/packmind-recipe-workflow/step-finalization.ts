const prompt = `# Step 3 · Finalization Prep

The user approved the draft. Package the content so Packmind can register the new recipe.

## Before Calling the Tool

1. Extract from the draft file:
   - \`name\`: Final title.
   - \`summary\`: Single concise sentence (max 2 lines) describing the recipe's intent, value, and when to use it.
   - \`whenToUse\`: Array of 3-5 brief, specific scenarios (one line each).
   - \`contextValidationCheckpoints\`: Array of 3-5 focused questions (one line each).
   - \`steps\`: Array of implementation steps (5-8 steps max), each containing:
     - \`name\`: Clear, action-oriented step title (5-8 words max)
     - \`description\`: 1-2 sentences describing intent and implementation (Markdown formatted)
     - \`codeSnippet\` (optional): Minimal, focused code example (5-15 lines max, no boilerplate, Markdown formatted with \`\`\` including the language)
2. **Ensure conciseness**:
   - Trim verbose descriptions to essential information only
   - Keep code snippets minimal and focused on the key pattern
   - Remove any repetitive or redundant content
3. Ensure the steps still align with the TL;DR agreed earlier.
4. Keep the draft handy until the recipe is created; remove or archive it afterward.

## Package Selection (Optional)

After extracting the recipe content, you MAY suggest adding this recipe to relevant packages:

1. Call \`packmind_list_packages\` to see available packages
2. Analyze the recipe's scope and topic (e.g., "frontend", "backend", "testing", "TypeScript", etc.)
3. Suggest 2-3 relevant packages based on keyword matching between:
   - Recipe name/summary/steps
   - Package names/descriptions
4. Ask the user: "Would you like to add this recipe to any packages? Here are some suggestions based on the recipe's topic: [suggestions]. You can also choose from all available packages: [list]"
5. If user selects packages, include their slugs in the \`packageSlugs\` parameter

**Note:** Package selection is optional. You can skip this step if:
- No packages are available
- The recipe doesn't clearly match any existing packages
- The user prefers to add it to packages later

## Final Call

When ready, call \`packmind_create_recipe\` with:
\`\`\`json
{
  "name": "...",
  "summary": "...",
  "whenToUse": ["...", "..."],
  "contextValidationCheckpoints": ["...", "..."],
  "steps": [
    {
      "name": "...",
      "description": "...",
      "codeSnippet": "..." // optional
    }
  ],
  "packageSlugs": ["package-slug-1", "package-slug-2"]  // Optional
}
\`\`\`

If the user wants to add the recipe to packages later, they can use the \`packmind_add_recipe_to_packages\` tool.

The tool will create the recipe and respond with wrap-up guidance for your final message.`;

export default prompt;
