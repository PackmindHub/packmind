import type { Meta, StoryObj } from '@storybook/react';
import {
  UnifiedMarkdownViewer,
  UnifiedMarkdownViewerProps,
} from './UnifiedMarkdownViewer';

const MultiViewer: React.FunctionComponent<
  Omit<UnifiedMarkdownViewerProps, 'displayMode'>
> = (props) => {
  return (
    <>
      <h1>Unified view</h1>
      <UnifiedMarkdownViewer {...props} displayMode={'unified'} />

      <h1>Diff view</h1>
      <UnifiedMarkdownViewer {...props} displayMode={'diff'} />

      <h1>Plain view</h1>
      <UnifiedMarkdownViewer {...props} displayMode={'plain'} />
    </>
  );
};

const meta: Meta<typeof MultiViewer> = {
  title: 'ChangeProposals/UnifiedMarkdownViewer',
  component: MultiViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MarkdownFormatting: Story = {
  args: {
    oldValue: `# My title

This was my content

There was a line here.

## My sub-heading

My list:
 - one item
 - another item
 
# Code example

\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\` 
`,
    newValue: `# My title

This is my updated content

## My sub-heading

My list:
 - first item
 - a new item
 - another item
 
 # Example

\`\`\`javascript
function hello() {
  console.log('Hello, ' + name);
}
\`\`\``,
    proposalNumbers: [1],
  },
};

export const TagChanges: Story = {
  args: {
    oldValue: '# My title\n\nThis was my content',
    newValue: '## My title\n\nThis is my **content**',
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
