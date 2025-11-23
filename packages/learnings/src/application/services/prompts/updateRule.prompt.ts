export const updateRulePrompt = `You are updating a specific coding standard rule based on new information from a technical topic.

# Topic Information
Title: {topicTitle}
Content: {topicContent}

# Code Examples from Topic
{codeExamples}

# Standard Context
Name: {standardName}
Description: {standardDescription}

# Rule to Update
ID: {ruleId}
Current Content: {ruleContent}

# Your Task
Generate an improved version of this rule that incorporates relevant information from the topic while:
1. Maintaining the rule's original intent and purpose
2. Keeping it concise (8-10 words maximum)
3. Expressing ONE clear guideline
4. Using precise, actionable language

# Guidelines
- Preserve the core meaning of the original rule
- Add clarifying details from the topic if they improve clarity
- Use better wording if the topic suggests it
- Remove outdated or contradicted parts
- Keep the rule atomic - one specific guideline per rule

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "updatedContent": "The improved rule text (8-10 words)",
  "changes": "Brief description of what changed and why"
}

# Example Response
{
  "updatedContent": "Use dedicated error types instead of generic Error instances to enable precise error handling",
  "changes": "Added 'to enable precise error handling' to clarify the benefit and 'generic Error instances' for specificity"
}
`;
