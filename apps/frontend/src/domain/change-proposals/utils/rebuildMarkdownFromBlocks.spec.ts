import { rebuildMarkdownFromBlocks } from './rebuildMarkdownFromBlocks';
import { parseAndDiffMarkdown } from './markdownBlockDiff';

describe('rebuildMarkdownFromBlocks', () => {
  describe('unified mode (markdown output)', () => {
    it('rebuilds markdown with clean content, excluding deleted blocks', () => {
      const oldValue = '# Title\n\nOld paragraph\n\nAnother paragraph';
      const newValue = '# Title\n\nNew paragraph';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toEqual(
        expect.stringMatching(
          /# Title[\s\S]*New paragraph(?![\s\S]*Old paragraph)(?![\s\S]*Another paragraph)/,
        ),
      );
    });

    it('adds "Show code changes" trigger for updated code blocks', () => {
      const oldValue = `\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\``;

      const newValue = `\`\`\`javascript
function hello(name) {
  console.log('Hello, ' + name);
}
\`\`\``;

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toContain('Show code changes');
    });

    it('rebuilds list markdown preserving structure', () => {
      const oldValue = '- item 1\n- item 2';
      const newValue = '- item 1\n- item 2\n- item 3';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toMatch(/- item 1[\s\S]*- item 2[\s\S]*- item 3/);
    });

    it('excludes deleted list items from output', () => {
      const oldValue = '- item 1\n- item 2\n- item 3';
      const newValue = '- item 1\n- item 3';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toEqual(
        expect.stringMatching(/- item 1[\s\S]*- item 3(?![\s\S]*- item 2)/),
      );
    });

    it('preserves code block formatting', () => {
      const oldValue = '```js\nconst x = 1;\n```';
      const newValue = '```js\nconst x = 2;\n```';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toMatch(/```js[\s\S]*const x = 2;[\s\S]*```/);
    });
  });

  describe('diff mode (markdown output with diff tags)', () => {
    it('generates markdown with inline diff markers', () => {
      const oldValue = 'Old text';
      const newValue = 'New text';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toMatch(
        /--Old--[\s\S]*\+\+New\+\+[\s\S]*text(?![\s\S]*<p>)/,
      );
    });

    it('renders list items with diff markdown markers', () => {
      const oldValue = '- item 1\n- item 2';
      const newValue = '- item 1\n- item 2\n- item 3';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toMatch(
        /- item 1[\s\S]*- item 2[\s\S]*- \+\+item 3\+\+(?![\s\S]*<ul>)(?![\s\S]*<li>)/,
      );
    });

    it('renders headings with markdown syntax', () => {
      const oldValue = '# Old Title';
      const newValue = '# New Title';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toMatch(/# .*--Old--.*\+\+New\+\+(?![\s\S]*<h1>)/);
    });

    it('renders heading level changes without duplicating level markers', () => {
      const oldValue = '# My title';
      const newValue = '## My title';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toBe('# --My title--\n## ++My title++\n');
    });

    it('includes deleted blocks in output', () => {
      const oldValue = '# Title\n\nParagraph to delete';
      const newValue = '# Title';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toMatch(/--Paragraph to delete--(?![\s\S]*<p>)/);
    });

    it('renders code blocks with line-level diff syntax', () => {
      const oldValue = `\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\``;

      const newValue = `\`\`\`javascript
function hello(name) {
  console.log('Hello, ' + name);
}
\`\`\``;

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toContain('```diff');
    });
  });

  describe('plain mode', () => {
    it('produces clean markdown without diff markers', () => {
      const oldValue = 'Old content';
      const newValue = 'New content';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'plain',
      });

      expect(result).toEqual(
        expect.stringMatching(
          /New content(?![\s\S]*Old content)(?![\s\S]*\+\+)(?![\s\S]*--)/,
        ),
      );
    });
  });

  describe('complex scenarios', () => {
    it('handles the user story example in unified mode', () => {
      const oldValue = `# My title

This was my content

There was a line here.

## My sub-heading

My list:
 - one item
 - another item`;

      const newValue = `# My title

This is my updated content

## My sub-heading

My list:
 - first item
 - a new item
 - another item`;

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });

      expect(result).toEqual(
        expect.stringMatching(
          /# My title[\s\S]*This is my updated content[\s\S]*## My sub-heading[\s\S]*- another item(?![\s\S]*There was a line here)/,
        ),
      );
    });

    it('handles the user story example in diff mode', () => {
      const oldValue = `# My title

This was my content

There was a line here.

## My sub-heading

My list:
 - one item
 - another item`;

      const newValue = `# My title

This is my updated content

## My sub-heading

My list:
 - first item
 - a new item
 - another item`;

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
        mode: 'diff',
      });

      expect(result).toMatch(
        /# My title[\s\S]*--There was a line here\.--[\s\S]*- (?![\s\S]*<h1>)(?![\s\S]*<ul>)(?![\s\S]*<li>)/,
      );
    });
  });
});
