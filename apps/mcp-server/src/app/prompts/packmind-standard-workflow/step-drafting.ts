const prompt = `# Step 3 · Draft and Iterate with the User

Now that the context is locked in, create the draft standard and iterate with the user in two phases. Keep all reasoning local—no backend completions.

## Phase 1: Draft and Validate Rules Only

### Draft Creation (Rules Only)

1. Create the draft in \`.packmind/standards/_drafts\` (create the folder if missing) using the filename \`<slug>-draft.md\` (lowercase with hyphens).
2. Initial draft structure:
   - \`# <Standard Title>\`
   - Context paragraph explaining when/why to apply the standard in this codebase.
   - Optional **Key References** list citing files or authoritative sources.
   - \`## Rules\` as bullet points, each starting with a verb and stating the required behavior.
   - **DO NOT include examples yet** - examples will be added in Phase 2 after rules are validated.
3. After the file is saved, tell the user the file path and flag anything that needs special attention.

### TL;DR and Review Loop (Rules)

1. Write a concise TL;DR that captures:
   - One sentence summarizing the standard's purpose.
   - A bullet list of all rules added in the new standard (keep each rule summary very short and concise—8-10 words max).
   - **Do not add any additional explanatory paragraphs or duplicate content after the TL;DR.**
2. Share the TL;DR with the user only after the draft file exists so they can confirm the plan.
3. Ask for precise feedback on the rules and apply requested changes in the draft file while keeping the TL;DR aligned.
4. Restate what changed after each iteration and confirm the draft remains accurate.
5. Repeat until the user explicitly approves the rules.
6. **Only after rules are approved**, inform the user you will now proceed to Phase 2 to add examples.

## Phase 2: Draft and Validate Examples

### Examples Creation

1. Open the existing draft file and add illustrative examples to each rule:
   - \`### Positive Example\` showing the compliant approach.
   - \`### Negative Example\` highlighting the anti-pattern to avoid.
   - Annotate every code block with its language (e.g., \`typescript\`, \`sql\`, \`javascript\`).
   - Keep examples concise and focused on demonstrating the specific rule.
2. After updating the file, tell the user what examples were added.

### Examples Guidelines

- Examples should be realistic and directly relevant to this codebase.
- Each example should clearly demonstrate why the rule matters.
- Keep code snippets minimal—only include what's necessary to illustrate the point.
- If a rule doesn't benefit from code examples (e.g., process or organizational rules), explain this and skip examples for that rule.

### Review Loop (Examples)

1. Share a summary of the examples added for each rule.
2. Ask for feedback on the examples.
3. Apply requested changes and iterate until the user approves.
4. Restate what changed after each iteration.

## Next Step

Once the user approves both rules AND examples, call \`packmind_create_standard_workflow\` with:
\`\`\`json
{ "step": "finalization" }
\`\`\`
to move to Step 4 (Finalization Prep).`;

export default prompt;
