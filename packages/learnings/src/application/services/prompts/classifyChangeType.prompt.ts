export const classifyChangeTypePrompt = `You are analyzing a technical topic to determine what type of change, if any, should be made to an existing knowledge artifact (standard or recipe).

# Topic Information
Title: {topicTitle}
Content: {topicContent}

# Artifact Information
Type: {artifactType}
Name: {artifactName}
Content: {artifactContent}

# Your Task
Classify what type of change should be made to this artifact based on the topic. Choose ONE of these classifications:

- **edit_{artifactType}**: The topic contains information that should be integrated into this existing artifact (add, update, or remove content)
- **no_change**: The topic is not relevant to this artifact, or the artifact already covers the topic adequately

# Classification Rules
1. Choose "edit_{artifactType}" if:
   - The topic provides new information that should be added to the artifact
   - The topic suggests improvements or corrections to existing content
   - The topic indicates content that should be removed or deprecated
   - The artifact is clearly related but needs updates to align with the topic

2. Choose "no_change" if:
   - The topic is completely unrelated to the artifact
   - The artifact already fully covers what the topic describes
   - The topic contradicts the artifact's purpose or scope

# Response Format
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "classification": "edit_{artifactType}" | "no_change",
  "reasoning": "Brief explanation of why you chose this classification"
}

# Example Response
{"classification": "edit_standard", "reasoning": "The topic provides a new rule about error handling that should be added to this standard"}
`;
