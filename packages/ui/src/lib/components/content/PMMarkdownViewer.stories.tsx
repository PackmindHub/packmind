import type { Meta, StoryObj } from '@storybook/react';
import { PMMarkdownViewer } from './PMMarkdownViewer';

const meta: Meta<typeof PMMarkdownViewer> = {
  title: 'Content/PMMarkdownViewer',
  component: PMMarkdownViewer,
  argTypes: {
    content: {
      control: 'text',
      defaultValue: '# Hello World\n\nThis is a **markdown** example.',
    },
    sanitize: {
      control: 'boolean',
      defaultValue: true,
    },
  },
};
export default meta;

type Story = StoryObj<typeof PMMarkdownViewer>;

const sampleMarkdown = `# Sample Markdown Document

This is a **bold** text and this is *italic* text.

## Subheading

Here's a list:
- Item 1
- Item 2
  - Nested item
- Item 3

### Code Example

Here's some inline \`code\` and a code block:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Blockquote

> This is a blockquote.
> It can span multiple lines.

### Table

| Name | Age | City |
|------|-----|------|
| Alice | 30 | Paris |
| Bob | 25 | London |

### Links

Check out [Packmind](https://packmind.com) for more information.

---

*That's all folks!*
`;

export const Default: Story = {
  args: {
    content:
      '# Hello World\n\nThis is a **markdown** example with some *italic* text.',
  },
};

export const CompleteExample: Story = {
  args: {
    content: sampleMarkdown,
    style: {
      maxWidth: '800px',
      padding: '1rem',
    },
  },
};

export const SimpleText: Story = {
  args: {
    content: 'Just some **simple** markdown text without fancy features.',
  },
};

export const CodeHighlighting: Story = {
  args: {
    content: `# Code Examples

Here's some inline \`code\` and a JavaScript code block:

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);

function add(a, b) {
  return a + b;
}
\`\`\`

And some TypeScript:

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: 30
};
\`\`\``,
  },
};

export const Lists: Story = {
  args: {
    content: `# Lists Demo

## Unordered List
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

## Ordered List
1. Step one
2. Step two
   1. Sub-step A
   2. Sub-step B
3. Step three

## Mixed List
1. First ordered item
   - Unordered sub-item
   - Another sub-item
2. Second ordered item
`,
  },
};
