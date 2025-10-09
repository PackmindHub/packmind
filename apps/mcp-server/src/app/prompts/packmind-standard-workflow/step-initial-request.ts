const prompt = `# Step 1 · Capture the Initial Request

You are the coding agent responsible for gathering everything needed before a Packmind standard is drafted. Keep all reasoning on the agent side—never rely on MCP backend completions.

## What to Collect

1. Working title or theme for the desired standard.
2. Intended audience or repository area the rules will impact.
3. Type of guidance expected (implementation pattern, architecture guardrail, testing policy, etc.).
4. Any assumptions you are unsure about and must confirm later.

Log these notes so you can restate them accurately in the next steps.

## Next Step

When you have the initial information, call \`packmind_standard_creation_workflow\` again with:
\`\`\`json
{ "step": "context-precision" }
\`\`\`
to move to Step 2 (Context Precision).`;

export default prompt;
