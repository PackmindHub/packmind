import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedMarkdownViewer } from './UnifiedMarkdownViewer';

const meta: Meta<typeof UnifiedMarkdownViewer> = {
  title: 'ChangeProposals/UnifiedMarkdownViewer',
  component: UnifiedMarkdownViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    displayMode: {
      control: 'radio',
      options: ['unified', 'diff', 'plain'],
      description: 'Display mode for the markdown viewer',
      value: 'unified',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleTextChange: Story = {
  args: {
    oldValue: 'This was my content',
    newValue: 'This is my updated content',
    proposalNumbers: [1],
  },
};

export const MultipleProposals: Story = {
  args: {
    oldValue: 'This is my content',
    newValue: 'This is my updated content',
    proposalNumbers: [1, 2, 3],
  },
};

export const MarkdownFormatting: Story = {
  args: {
    oldValue: `# My title

This was my content

There was a line here.

## My sub-heading

My list:
 - one item
 - another item`,
    newValue: `# My title

This is my updated content

## My sub-heading

My list:
 - first item
 - a new item
 - another item`,
    proposalNumbers: [1],
  },
};

export const CodeBlock: Story = {
  args: {
    oldValue: `# Example

\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\``,
    newValue: `# Example

\`\`\`javascript
function hello(name) {
  console.log('Hello, ' + name);
}
\`\`\``,
    proposalNumbers: [1],
  },
};

export const ListChanges: Story = {
  args: {
    oldValue: `# Todo List

- Item 1
- Item 2
- Item 3`,
    newValue: `# Todo List

- Item 1
- Updated Item 2
- Item 3
- Item 4`,
    proposalNumbers: [1],
  },
};

export const ComplexChanges: Story = {
  args: {
    oldValue: `# My title

This was my content

There was a line here.

## My sub-heading

My list:
 - one item
 - another item`,
    newValue: `# My title

This is my updated content

## My sub-heading

My list:
 - first item
 - a new item
 - another item`,
    proposalNumbers: [1, 2],
  },
};
