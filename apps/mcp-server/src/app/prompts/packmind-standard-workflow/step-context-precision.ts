const prompt = `# Step 2 · Context Precision Loop

Validate that the request is specific enough to write enforceable rules. Stay collaborative and keep narrowing the focus until you can describe the standard without guessing.

## Required Clarifications

1. **Scope** – Which files, domain layer, or feature set should this standard control?
2. **Reference Material** – Which code files, docs, specs, or industry sources illustrate the desired outcome?
3. **Motivation** – What problem must this standard prevent or what result must it guarantee?

Ask targeted follow-up questions if any pillar is missing (e.g., “Which service shows the expected pattern?” or “Which best-practice document are we matching?”). Repeat this loop until each pillar is explicit.

Capture crisp notes covering:
- Title or slug candidates.
- Targeted scope (folders, layers, domains).
- References (file paths, docs, industry sources).
- Motivation or outcome the rules must enforce.

## Next Step

Once the context is crystal clear, call \`packmind_standard_creation_workflow\` with:
\`\`\`json
{ "step": "drafting" }
\`\`\`
to proceed to Step 3 (Drafting with TL;DR).`;

export default prompt;
