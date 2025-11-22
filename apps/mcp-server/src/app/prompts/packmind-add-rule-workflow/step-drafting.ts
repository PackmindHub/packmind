const prompt = `# Step 2 · Draft the Rule

Now that you have the context, create a draft of the rule and iterate with the user until they approve.

## Rule Drafting

1. **Write the rule content**:
   - **One-liner format**: Keep it to a single sentence of around a dozen words
   - Start with a clear verb (e.g., "Use", "Avoid", "Ensure", "Prefer")
   - Focus on the essential behavior only
   - Avoid redundant explanations—let the examples provide the details

2. **Create examples** (if applicable):
   - **Positive Example**: Show the correct way to apply the rule
     - Use real code that demonstrates the compliant approach
     - Annotate with the programming language
   - **Negative Example**: Show what to avoid
     - Demonstrate the anti-pattern
     - Make it clear why this is problematic

3. **Present the draft**:
   - Show the rule content clearly
   - If examples exist, display both positive and negative examples
   - Explain the programming language used

## Review and Iteration

1. Ask the user for feedback on:
   - Rule clarity and completeness
   - Example relevance and correctness
   - Whether it aligns with their intent

2. Apply requested changes and restate what was modified

3. Repeat until the user explicitly approves the rule

## Next Step

Once the user approves the draft, call \`packmind_packmind_save_standard_rule_workflow\` with:
\`\`\`json
{ "step": "finalization" }
\`\`\`
to proceed to Step 3 (Finalization).`;

export default prompt;
