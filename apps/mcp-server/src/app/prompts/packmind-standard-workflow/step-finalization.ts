const prompt = `# Step 5 · Finalization Prep

The user approved the draft. Package the content so Packmind can register the new standard.

## Before Calling the Tool

1. Extract from the draft file:
   - \`name\`: Final title.
   - \`description\`: Single paragraph of context (no code examples).
   - Optional \`summary\`: One-sentence reminder of when to apply the rules.
   - \`rules\`: Each rule starts with a verb and, when useful, includes positive/negative examples with their programming language.
2. Ensure the rules still align with the TL;DR agreed earlier.
3. Keep the draft handy until the standard is created; remove or archive it afterward.

## Final Call

When ready, call \`packmind_create_standard\` with:
\`\`\`json
{
  "name": "…",
  "description": "…",
  "summary": "…",
  "rules": [
    {
      "content": "…",
      "examples": [
        {
          "positive": "…",
          "negative": "…",
          "language": "typescript"
        }
      ]
    }
  ]
}
\`\`\`
The tool will create the standard and respond with wrap-up guidance for your final message.`;

export default prompt;
