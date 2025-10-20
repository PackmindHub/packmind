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
  ]
}
\`\`\`
The tool will create the recipe and respond with wrap-up guidance for your final message.`;

export default prompt;
