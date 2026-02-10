import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMIcon,
  PMPortal,
} from '@packmind/ui';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { LuBook } from 'react-icons/lu';

interface RecipeExample {
  title: string;
  buttonLabel: string;
  content: string;
}

const CONVENTIONAL_COMMIT_EXAMPLE: RecipeExample = {
  title: 'Write a conventional commit message',
  buttonLabel: 'Conventional commit',
  content: `### Instructions


This file contains a prompt template for generating conventional commit messages. It provides instructions, examples, and formatting guidelines to help users write standardized, descriptive commit messages in accordance with the Conventional Commits specification.

### Workflow

**Follow these steps:**

1. Run \`git status\` to review changed files.
2. Run \`git diff\` or \`git diff --cached\` to inspect changes.
3. Stage your changes with \`git add <file>\`.
4. Construct your commit message using the following XML structure.
5. After generating your commit message, your coding assistant will automatically run the following command in your integrated terminal (no confirmation needed):

\`\`\`bash
git commit -m "type(scope): description"
\`\`\`

6. Just execute this prompt and your coding assistant will handle the commit for you in the terminal.

### Commit Message Structure

\`\`\`xml
<commit-message>
	<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert</type>
	<scope>()</scope>
	<description>A short, imperative summary of the change</description>
	<body>(optional: more detailed explanation)</body>
	<footer>(optional: e.g. BREAKING CHANGE: details, or issue references)</footer>
</commit-message>
\`\`\`

### Examples

\`\`\`xml
<examples>
	<example>feat(parser): add ability to parse arrays</example>
	<example>fix(ui): correct button alignment</example>
	<example>docs: update README with usage instructions</example>
	<example>refactor: improve performance of data processing</example>
	<example>chore: update dependencies</example>
	<example>feat!: send email on registration (BREAKING CHANGE: email service required)</example>
</examples>
\`\`\`

### Validation

\`\`\`xml
<validation>
	<type>Must be one of the allowed types. See <reference>https://www.conventionalcommits.org/en/v1.0.0/#specification</reference></type>
	<scope>Optional, but recommended for clarity.</scope>
	<description>Required. Use the imperative mood (e.g., "add", not "added").</description>
	<body>Optional. Use for additional context.</body>
	<footer>Use for breaking changes or issue references.</footer>
</validation>
\`\`\`

### Final Step

\`\`\`xml
<final-step>
	<cmd>git commit -m "type(scope): description"</cmd>
	<note>Replace with your constructed message. Include body and footer if needed.</note>
</final-step>
\`\`\`
`,
};

const GENERATE_PLAYWRIGHT_TEST_EXAMPLE: RecipeExample = {
  title: 'Generate a Playwright test',
  buttonLabel: 'Generate Playwright test',
  content: `Your goal is to generate a Playwright test based on the provided scenario after completing all prescribed steps.

## Specific Instructions

- You are given a scenario, and you need to generate a playwright test for it. If the user does not provide a scenario, you will ask them to provide one.
- DO NOT generate test code prematurely or based solely on the scenario without completing all prescribed steps.
- DO run steps one by one using the tools provided by the Playwright MCP.
- Only after all steps are completed, emit a Playwright TypeScript test that uses \`@playwright/test\` based on message history
- Save generated test file in the tests directory
- Execute the test file and iterate until the test passes
`,
};

const RECIPE_EXAMPLES = [
  CONVENTIONAL_COMMIT_EXAMPLE,
  GENERATE_PLAYWRIGHT_TEST_EXAMPLE,
];

interface RecipesExampleDialogButtonProps {
  example: RecipeExample;
}

const RecipesExampleDialogButton = ({
  example,
}: RecipesExampleDialogButtonProps) => {
  return (
    <PMDialog.Root
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary" w="fit-content">
          <PMIcon>
            <LuBook />
          </PMIcon>{' '}
          Example: {example.buttonLabel}
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Command Example: {example.title}</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={example.content}
                  readOnly
                  paddingVariant="none"
                />
              </MarkdownEditorProvider>
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

export const RecipesExampleDialog = () => {
  return (
    <PMHStack mt={4} gap={2}>
      {RECIPE_EXAMPLES.map((example) => (
        <RecipesExampleDialogButton key={example.title} example={example} />
      ))}
    </PMHStack>
  );
};
