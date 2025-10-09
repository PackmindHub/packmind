const prompt = `# Step 3 · Create TL;DR and Draft

Now that the context is locked in, produce a concise TL;DR and immediately turn it into a draft standard. Do all reasoning locally—no backend completions.

## TL;DR + Drafting Checklist

1. Write a TL;DR that captures:
   - The standard's purpose and desired outcome.
   - Scope (folders, layers, domains).
   - Key references (files, docs, industry sources).
   - The main risks/issues it prevents.
2. Share the TL;DR with the user so they have an at-a-glance confirmation of the plan.
3. Create the draft in \`.packmind/standards/_drafts\` (create the folder if missing) using the filename \`<slug>-draft.md\` (lowercase with hyphens).
4. Recommended draft structure:
   - \`# <Standard Title>\`
   - Context paragraph explaining when/why to apply the standard in this codebase.
   - Optional **Key References** list citing files or authoritative sources.
   - \`## Rules\` as bullet points, each starting with a verb and stating the required behavior.
   - For rules that benefit from code samples, add:
     - \`### Positive Example\`
     - \`### Negative Example\`
     - Annotate every code block with its language (e.g., \`typescript\`, \`sql\`).
5. After drafting, tell the user the file path, restate the TL;DR, and highlight anything that needs special attention.

## Next Step

When the draft is ready, call \`packmind_standard_creation_workflow\` with:
\`\`\`json
{ "step": "review" }
\`\`\`
to enter Step 4 (Review Loop).`;

export default prompt;
