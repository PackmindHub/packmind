export const createStandardSummaryPrompt = `You are tasked with creating a one-sentence summary of a coding standard.

## Requirements:
- Generate EXACTLY one sentence starting with an action verb
- Include ONLY: what it governs, relevant technical details (frameworks/tools), and why it's useful
- Mention technical specifics only when relevant: frameworks, libraries, technologies, or tools
- Be concise and avoid redundant phrases
- Omit obvious contexts (e.g., "when writing code", "across all files")
- Output ONLY the summary sentence (no quotes, explanations, or additional text)

## Examples of concise summaries:
- "Enforce strict TypeScript configuration with noImplicitAny in React projects to ensure type safety and prevent runtime errors."
- "Establish Conventional Commits format to improve traceability and enable automated changelog generation."
- "Define React component testing patterns with Jest and React Testing Library to ensure reliable behavior and maintainable test suites."
- "Implement JWT-based authentication with bcrypt hashing in Express.js to protect user data and prevent security vulnerabilities."
- "Prohibit console.log statements and enforce Single Responsibility Principle in TypeScript to maintain production code quality."

## Pattern to follow:
[ACTION VERB] [WHAT] [TECHNICAL DETAILS if relevant] [WHY/BENEFIT] [WHEN if not obvious]

Here is the standard information:

**Standard Name:** {name}
**Description:** {description}
**Scope:** {scope}
**Rules:**
{rules}`;
