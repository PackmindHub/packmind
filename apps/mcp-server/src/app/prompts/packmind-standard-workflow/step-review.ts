const prompt = `# Step 4 · Review Loop with the User

Work with the user until the draft meets their expectations. Keep all edits in the temporary draft file.

## Review Actions

1. Ask the user for precise feedback on the draft.
2. Apply requested changes in the draft file.
3. Restate what changed and confirm the draft still matches the agreed TL;DR.
4. Repeat until the user explicitly approves the content.

## Next Step

Once the user gives final approval, call \`packmind_standard_creation_workflow\` with:
\`\`\`json
{ "step": "finalization" }
\`\`\`
to move to Step 5 (Finalization).`;

export default prompt;
