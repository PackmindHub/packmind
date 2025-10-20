const prompt = `# Step 3 · Finalize and Add Rule

The user approved the rule draft. Now add it to the standard using the MCP tool.

## Before Calling the Tool

1. Extract from the approved draft:
   - \`standardSlug\`: The slug of the target standard (lowercase with hyphens)
   - \`ruleContent\`: The rule text that starts with a verb
   - \`positiveExample\`: The code showing the correct approach (if applicable)
   - \`negativeExample\`: The code showing what to avoid (if applicable)
   - \`language\`: The programming language for the examples (if applicable)

2. Ensure:
   - The rule is a one-liner (around a dozen words)
   - The rule content starts with a verb
   - Examples are properly formatted code snippets
   - The language is specified correctly

## Final Call

Call \`packmind_add_rule_to_standard\` with:
\`\`\`json
{
  "standardSlug": "...",
  "ruleContent": "...",
  "positiveExample": "...",
  "negativeExample": "...",
  "language": "..."
}
\`\`\`

The tool will:
- Add the rule to the specified standard
- Create a new version of the standard
- Return a confirmation message

## Wrap Up

After the tool succeeds:
1. Confirm to the user that the rule was added successfully
2. Mention the standard name and new version number
3. Remind them the rule is now part of their coding standards`;

export default prompt;
