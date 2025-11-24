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

## Package Selection

After extracting the standard content, determine if this standard should be added to any packages:

1. Call \`packmind_list_packages\` to see available packages
2. Analyze the standard's scope and topic (e.g., "frontend", "backend", "testing", "TypeScript", etc.)
3. **If matching packages are found:**
   - Suggest 2-3 relevant packages based on keyword matching between:
     - Standard name/description/scope
     - Package names/descriptions
   - Ask the user: "Would you like to add this standard to any packages? Here are some suggestions based on the standard's topic: [suggestions]. You can also choose from all available packages: [list]"
4. **If packages exist but none match well:**
   - Ask the user: "Would you like to add this standard to any of the existing packages? Available packages: [list]"
5. **If no packages exist at all:**
   - Skip package selection entirely (no need to prompt the user)
6. If user selects packages, include their slugs in the \`packageSlugs\` parameter

## Final Call

When ready, call \`packmind_save_standard\` with:
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

The tool will create the standard and respond with wrap-up guidance for your final message.`;

export default prompt;
