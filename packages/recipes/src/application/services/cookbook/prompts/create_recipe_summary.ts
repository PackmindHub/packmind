export const createRecipeSummaryPrompt = `You are tasked with creating a one-sentence summary of a coding recipe.

## Requirements:
- Generate EXACTLY one sentence that starts with an action verb
- Include both the recipe's intent (what it does) and its value (why it's useful)
- Be concise but descriptive
- Output ONLY the summary sentence, nothing else (no quotes, no explanations, no additional text)

## Examples of good summaries:
- "Use constructor-injected loggers with stubs in tests to eliminate logging noise while preserving verification capabilities when testing classes that contain logger calls."
- "Create test factories for entities with proper typing and random data generation when adding new data structures or ensuring consistent test data."
- "Create or update new models with TypeORM, including entities, repositories, and schemas when adding new data structures, modifying existing models, or ensuring proper database migration workflows."

## Pattern to follow:**
[ACTION VERB] [WHAT THE RECIPE DOES] [WHY IT'S VALUABLE/USEFUL] [WHEN TO USE IT]

Here is the recipe content below:`;
