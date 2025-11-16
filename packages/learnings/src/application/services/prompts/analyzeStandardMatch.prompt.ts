export const analyzeStandardMatchPrompt = `You are analyzing whether a technical decision should update an existing coding standard.

Topic:
Title: {topicTitle}
Content: {topicContent}
Code Examples: {codeExamples}

Existing Standard:
Name: {standardName}
Description: {standardDescription}
Current Rules:
{standardRules}

Task: Determine if this topic should:
1. Add a new rule to this standard
2. Modify an existing rule
3. Not affect this standard (no match)

Return JSON format:
{
  "action": "addRule" | "updateRule" | "noMatch",
  "targetRuleId": "ruleId or null if addRule",
  "proposedContent": "the new or updated rule text",
  "rationale": "brief explanation of why this change is needed"
}`;
