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
      });

      expect(result).toEqual(
        expect.stringMatching(
          /# Title[\s\S]*New paragraph(?![\s\S]*Old paragraph)(?![\s\S]*Another paragraph)/,
        ),
      );
    });

    it('rebuilds list markdown preserving structure', () => {
      const oldValue = '- item 1\n- item 2';
      const newValue = '- item 1\n- item 2\n- item 3';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
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
      });

      expect(result).toMatch(/```[\s\S]*const x = 2;[\s\S]*```/);
    });
  });

  describe('diff mode (HTML output)', () => {
    it('generates HTML with inline diff markers', () => {
      const oldValue = 'Old text';
      const newValue = 'New text';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
      });

      expect(result).toMatch(
        /<p>.*<del>Old<\/del>.*<ins>New<\/ins>.*text.*<\/p>/,
      );
    });

    it('renders list items with diff HTML markers', () => {
      const oldValue = '- item 1\n- item 2';
      const newValue = '- item 1\n- item 2\n- item 3';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
      });

      expect(result).toMatch(
        /<ul>[\s\S]*<li>.*item 1.*<\/li>[\s\S]*<li>.*item 2.*<\/li>[\s\S]*<li>.*<ins>item 3<\/ins>.*<\/li>[\s\S]*<\/ul>/,
      );
    });

    it('renders headings with proper HTML structure', () => {
      const oldValue = '# Old Title';
      const newValue = '# New Title';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
      });

      expect(result).toMatch(/<h1>.*<del>Old<\/del>.*<ins>New<\/ins>.*<\/h1>/);
    });

    it('includes deleted blocks in output', () => {
      const oldValue = '# Title\n\nParagraph to delete';
      const newValue = '# Title';

      const blocks = parseAndDiffMarkdown(oldValue, newValue);
      const result = rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
      });

      expect(result).toMatch(/<del>Paragraph to delete<\/del>/);
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
      });

      expect(result).toEqual(
        expect.stringMatching(
          /New content(?![\s\S]*Old content)(?![\s\S]*<ins>)(?![\s\S]*<del>)/,
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
      });

      expect(result).toEqual(
        expect.stringMatching(
          /<h1>My title<\/h1>[\s\S]*<del>There was a line here\.<\/del>[\s\S]*<ul>[\s\S]*<li>/,
        ),
      );
    });
  });
});
