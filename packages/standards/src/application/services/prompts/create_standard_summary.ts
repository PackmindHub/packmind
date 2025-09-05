export const createStandardSummaryPrompt = `You are tasked with creating a one-sentence summary of a coding standard.

## Requirements:
- Generate EXACTLY one sentence that starts with an action verb
- Include the standard's purpose (what it governs) and its value (why it's useful)
- Mention relevant technical information such as:
  - Frameworks (React, Vue, Angular, Express, etc.)
  - Libraries and dependencies (Jest, TypeORM, Prisma, etc.)
  - Technologies (TypeScript, JavaScript, Node.js, etc.)
  - Tools (ESLint, Prettier, Webpack, Vite, etc.)
  - Testing frameworks (Jest, Cypress, Vitest, etc.)
  - Infrastructure (Docker, Kubernetes, AWS, etc.)
- Be concise but descriptive and technically informative
- Output ONLY the summary sentence, nothing else (no quotes, no explanations, no additional text)

## Examples of good summaries with technical information:
- "Enforce consistent TypeScript configuration with strict mode and noImplicitAny across React projects to maintain code quality and ensure proper type checking when developing new features or maintaining existing codebases."
- "Establish Git commit message conventions with semantic versioning structure using Conventional Commits when creating commits to improve traceability and enable automated changelog generation with tools like semantic-release."
- "Define React component testing patterns with Jest, React Testing Library, and proper mocking strategies when writing unit tests to ensure reliable component behavior and maintainable test suites in TypeScript projects."
- "Implement secure authentication flows using JWT tokens and bcrypt password hashing with Express.js middleware when building user management systems to protect sensitive user data and prevent security vulnerabilities."
- "Configure ESLint and Prettier rules for consistent code formatting across TypeScript and React codebases when setting up development environments to maintain code readability and enforce coding standards automatically."

## Pattern to follow:
[ACTION VERB] [WHAT THE STANDARD GOVERNS] [TECHNICAL DETAILS/FRAMEWORKS] [WHY IT'S VALUABLE/USEFUL] [WHEN TO APPLY IT]

Here is the standard information:

**Standard Name:** {name}
**Description:** {description}
**Scope:** {scope}
**Rules:**
{rules}`;
