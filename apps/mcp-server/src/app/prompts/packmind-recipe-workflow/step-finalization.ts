const prompt = `# Step 3 · Finalization Prep

The user approved the draft. Package the content so Packmind can register the new command.

## Before Calling the Tool

1. Extract from the draft file:
   - \`name\`: Final title.
   - \`summary\`: Single concise sentence (max 2 lines) describing the command's intent, value, and when to use it.
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
4. Keep the draft handy until the command is created; remove or archive it afterward.

## Package Selection

After extracting the command content, determine if this command should be added to any packages:

1. Call \`packmind_list_packages\` to see available packages
2. Analyze the command's scope and topic (e.g., "frontend", "backend", "testing", "TypeScript", etc.)
3. **If matching packages are found:**
   - Suggest 2-3 relevant packages based on keyword matching between:
     - command name/summary/steps
     - Package names/descriptions
   - Ask the user: "Would you like to add this command to any packages? Here are some suggestions based on the command's topic: [suggestions]. You can also choose from all available packages: [list]"
4. **If packages exist but none match well:**
   - Ask the user: "Would you like to add this command to any of the existing packages? Available packages: [list]"
5. **If no packages exist at all:**
   - Skip package selection entirely (no need to prompt the user)
6. If user selects packages, include their slugs in the \`packageSlugs\` parameter

## Final Call

When ready, call \`packmind_save_command\` with:
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

The tool will create the command and respond with wrap-up guidance for your final message.`;

export default prompt;
