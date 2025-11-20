export const analyzeStandardEditPrompt = `You are analyzing a technical topic to determine what changes should be made to an existing standard.

# Topic Information
Title: {topicTitle}
Content: {topicContent}

Code Examples from Topic:
{codeExamples}

# Current Standard
Name: {standardName}
Description: {standardDescription}

Current Rules:
{standardRules}

Current Examples (if any):
{standardExamples}

# Your Task
Analyze the topic and determine what changes should be made to this standard. You can:
1. **Modify the standard name** if the topic suggests a better, clearer name
2. **Modify the standard description** if the topic provides better context or scope
3. **Add new rules** if the topic introduces new practices not covered
4. **Update existing rules** if the topic clarifies, improves, or corrects them
5. **Delete rules** if the topic indicates they are outdated or incorrect
6. **Add new examples** if the topic provides code examples that illustrate the standard
7. **Update existing examples** if the topic shows better examples
8. **Delete examples** if the topic indicates they are outdated or misleading

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "changes": {
    "name": "New standard name" | null,
    "description": "New standard description" | null,
    "rulesToAdd": ["Rule content 1", "Rule content 2"] | null,
    "rulesToUpdate": [{"ruleId": "rule-id", "content": "Updated rule content"}] | null,
    "rulesToDelete": ["rule-id-1", "rule-id-2"] | null,
    "exampleChanges": {
      "toAdd": [{"lang": "typescript", "positive": "code", "negative": "code"}] | null,
      "toUpdate": [{"exampleId": "example-id", "lang": "typescript", "positive": "code", "negative": "code"}] | null,
      "toDelete": ["example-id-1"] | null
    } | null
  },
  "rationale": "Brief explanation of why these changes are needed"
}

# Important Guidelines
- Only include fields that need to be changed (use null for unchanged fields)
- For rulesToUpdate, you must provide the exact ruleId from the current rules
- For rulesToDelete, provide the ruleId
- For examples, positive shows the correct way, negative shows the wrong way
- Be specific and actionable in your changes
- The rationale should explain the overall impact of all changes

# Example Response
{"changes": {"name": null, "description": null, "rulesToAdd": ["Always validate user input before processing"], "rulesToUpdate": null, "rulesToDelete": null, "exampleChanges": null}, "rationale": "The topic highlights a security vulnerability that should be added as a new rule"}
`;
