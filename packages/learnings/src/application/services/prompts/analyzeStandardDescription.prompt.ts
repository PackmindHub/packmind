export const analyzeStandardDescriptionPrompt = `You are analyzing whether a coding standard's description needs to be updated based on a technical topic and the standard's current and proposed rules.

# Topic Information
Title: {topicTitle}
Content: {topicContent}

# Standard Information
Name: {standardName}
Current Description: {currentDescription}

# Current Rules
{currentRules}

# Proposed Changes to Rules
Rules to Add:
{rulesToAdd}

Rules to Update:
{rulesToUpdate}

Rules to Delete:
{rulesToDelete}

# Your Task
Determine if the standard's description needs to be updated to:
1. Encompass the scope of ALL rules (current + proposed changes)
2. Provide necessary context for understanding any rule in the standard
3. Reflect the broader purpose and scope after the proposed changes

**IMPORTANT**: The description should NOT be changed lightly. Only update it if:
- The topic fundamentally expands the standard's scope
- New rules introduce concepts that aren't reflected in the current description
- The current description becomes misleading after the rule changes

If the current description adequately covers the standard's purpose even with the new rules, DO NOT change it.

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "shouldUpdate": true | false,
  "newDescription": "Updated description text" | null,
  "reasoning": "Explanation of why the description should or should not be updated"
}

# Example Response (No Update Needed)
{
  "shouldUpdate": false,
  "newDescription": null,
  "reasoning": "The current description already encompasses error handling practices. Adding a new rule about error types doesn't require expanding the description's scope."
}

# Example Response (Update Needed)
{
  "shouldUpdate": true,
  "newDescription": "Establish clean code practices in TypeScript including type safety, logging, import organization, and error handling to enhance maintainability and consistency",
  "reasoning": "The new rules about type safety ('avoid any type') fundamentally expand the standard's scope from just logging and errors to include type safety practices. The description must reflect this broader scope."
}
`;
