const prompt = `# Step 5 · Finalization Prep

The user approved the draft with rules and examples. Package the content so Packmind can register the new standard.

## Before Calling the Tool

1. Extract from the draft file:
   - \`name\`: Final title.
   - \`description\`: Single paragraph of context (no code examples).
   - Optional \`summary\`: One-sentence reminder of when to apply the rules.
   - \`rules\`: Each rule starts with a verb and, when useful, includes positive/negative examples with their programming language.
2. Ensure the rules still align with the TL;DR agreed earlier.
3. Keep the draft handy until the standard is created; remove or archive it afterward.

## Package Selection (Optional)

After extracting the standard content, you MAY suggest adding this standard to relevant packages:

1. Call \`packmind_list_packages\` to see available packages
2. Analyze the standard's scope and topic (e.g., "frontend", "backend", "testing", "TypeScript", etc.)
3. Suggest 2-3 relevant packages based on keyword matching between:
   - Standard name/description/scope
   - Package names/descriptions
4. Ask the user: "Would you like to add this standard to any packages? Here are some suggestions based on the standard's topic: [suggestions]. You can also choose from all available packages: [list]"
5. If user selects packages, include their slugs in the \`packageSlugs\` parameter

**Note:** Package selection is optional. You can skip this step if:
- No packages are available
- The standard doesn't clearly match any existing packages
- The user prefers to add it to packages later

## Final Call

When ready, call \`packmind_create_standard\` with:
\`\`\`json
{
  "name": "...",
  "description": "...",
  "summary": "...",
  "rules": [
    {
      "content": "...",
      "examples": [
        {
          "positive": "...",
          "negative": "...",
          "language": "..."
        }
      ]
    }
  ],
  "packageSlugs": ["package-slug-1", "package-slug-2"]  // Optional
}
\`\`\`

If the user wants to add the standard to packages later, they can use the \`packmind_add_standard_to_packages\` tool.

The tool will create the standard and respond with wrap-up guidance for your final message.`;

export default prompt;
