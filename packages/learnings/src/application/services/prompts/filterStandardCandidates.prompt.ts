export const filterStandardCandidatesPrompt = `You are analyzing a technical decision/learning to identify which existing coding standards might be relevant.

Topic Title: {topicTitle}
Topic Content: {topicContent}

Available Standards:
{standardsList}

Task: Return a JSON array of standard IDs that are relevant to this topic. Consider:
- Does the topic introduce a new rule that fits this standard?
- Does the topic contradict or refine an existing rule?
- Is the topic's scope aligned with the standard's scope?

Return format: ["standardId1", "standardId2", ...]
Maximum 5 most relevant standards.
If no standards are relevant, return an empty array: []`;
