export const classifyStandardRulesPrompt = `You are analyzing a technical topic to determine which rules in a coding standard need to be updated, deleted, kept as-is, or if new rules should be added.

# Topic Information
Title: {topicTitle}
Content: {topicContent}

# Code Examples from Topic
{codeExamples}

# Standard Information
Name: {standardName}
Description: {standardDescription}

# Current Rules
{rules}

# Your Task
For each existing rule, classify it as:
- **keep**: The rule is still valid and doesn't need changes based on this topic
- **update**: The rule should be modified to incorporate information from the topic
- **delete**: The rule is no longer relevant or contradicts the topic

Additionally, identify any NEW rules that should be added based on the topic.

# Classification Guidelines
1. **Keep** a rule if:
   - It's unrelated to the topic
   - It already adequately covers what the topic describes
   - The topic doesn't contradict or extend it

2. **Update** a rule if:
   - The topic provides clarifying details that should be added
   - The topic suggests better wording or examples
   - The rule's intent remains but needs refinement

3. **Delete** a rule if:
   - The topic directly contradicts it
   - It's now obsolete based on the topic
   - It should be merged into another rule

4. **Add new rules** if:
   - The topic introduces concepts not covered by existing rules
   - Keep new rules concise (8-10 words maximum)
   - Each rule should express ONE clear guideline

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "ruleClassifications": [
    {
      "ruleId": "rule-id-1",
      "action": "keep" | "update" | "delete",
      "reasoning": "Brief explanation for this classification"
    }
  ],
  "newRules": [
    {
      "content": "Concise rule text (8-10 words)",
      "reasoning": "Why this new rule is needed"
    }
  ]
}

# Example Response
{
  "ruleClassifications": [
    {"ruleId": "std-123-rule-1", "action": "keep", "reasoning": "Rule about error handling is unrelated to topic"},
    {"ruleId": "std-123-rule-2", "action": "update", "reasoning": "Should include TypeScript-specific type safety guidance"},
    {"ruleId": "std-123-rule-3", "action": "delete", "reasoning": "Topic shows this pattern is deprecated"}
  ],
  "newRules": [
    {"content": "Avoid using 'any' type; prefer specific types or 'unknown'", "reasoning": "Topic emphasizes type safety as critical practice"}
  ]
}
`;
