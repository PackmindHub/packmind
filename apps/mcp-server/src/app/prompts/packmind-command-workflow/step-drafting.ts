const prompt = `# Step 2 · Draft and Iterate with the User

Now that the context is locked in, create the draft command and iterate with the user until they approve. Keep all reasoning local—no backend completions.

## Draft Creation

1. Create the draft in \`.packmind/commands/_drafts\` (create the folder if missing) using the filename \`<slug>-draft.md\` (lowercase with hyphens).
2. Recommended draft structure:
   - \`# <Command Title>\`
   - **Summary**: Single concise sentence (max 2 lines) explaining the intent and value.
   - \`## When to Use\` section with 3-5 brief, specific scenarios (one line each).
   - \`## Context Validation Checkpoints\` section with 3-5 focused questions (one line each).
   - \`## Implementation Steps\` section with numbered steps (5-8 steps max), each containing:
     - **Step name/title**: Clear, action-oriented (5-8 words max)
     - **Description**: 1-2 sentences describing intent and implementation
     - **Code snippet** (optional): Minimal, focused example (5-15 lines max, no boilerplate)
3. **Conciseness Guidelines**:
   - Keep all text brief and to the point
   - Use minimal code examples that show only the essential pattern
   - Avoid repetitive explanations or over-documentation
   - Focus on "what" and "why", keep "how" minimal
4. After the file is saved, tell the user the file path and flag anything that needs special attention.

## TL;DR and Review Loop

1. After saving the draft file, write a concise TL;DR that includes:
   - A bullet point list summarizing each implementation step from the command (keep each step summary very short and concise—8-10 words max).
   - Then ask: "**Would you like me to adjust:**"
   - "* anything in the draft? OR"
   - "* finalize the command and add it to Packmind?"
2. If the user requests changes, apply them to the draft file and repeat the TL;DR asking what to do next.
3. Keep iterating until the user explicitly chooses to finalize.

## Next Step

Once the user approves the draft, call \`packmind_save_command\` with:
\`\`\`json
{ "step": "finalization" }
\`\`\`
to move to Step 3 (Finalization Prep).`;

export default prompt;
