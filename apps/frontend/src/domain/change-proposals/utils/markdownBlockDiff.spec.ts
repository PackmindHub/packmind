import { parseAndDiffMarkdown } from './markdownBlockDiff';

describe('markdownBlockDiff', () => {
  describe('parseAndDiffMarkdown', () => {
    it('parses and diffs a simple text change', () => {
      const oldValue = 'This was my content';
      const newValue = 'This is my updated content';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'paragraph',
          content: 'This is my updated content',
          status: 'updated',
          diffContent: expect.stringMatching(
            /This --was--\+\+is\+\+ my \+\+updated \+\+content/,
          ),
        }),
      ]);
    });

    it('handles heading blocks with level tracking', () => {
      const oldValue = '# My title';
      const newValue = '# My updated title';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'heading',
          level: '#',
          content: 'My updated title',
          status: 'updated',
          diffContent: expect.stringContaining('++updated ++'),
        }),
      ]);
    });

    it('preserves unchanged blocks', () => {
      const markdown = '# My title\n\nSome content that stays the same';

      const result = parseAndDiffMarkdown(markdown, markdown);

      expect(result).toEqual([
        expect.objectContaining({ status: 'unchanged' }),
        expect.objectContaining({ status: 'unchanged' }),
      ]);
    });

    it('marks added blocks correctly', () => {
      const oldValue = '# Title';
      const newValue = '# Title\n\nNew paragraph';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heading',
            status: 'unchanged',
          }),
          expect.objectContaining({
            type: 'paragraph',
            content: 'New paragraph',
            status: 'added',
            diffContent: '++New paragraph++',
          }),
        ]),
      );
    });

    it('marks deleted blocks correctly', () => {
      const oldValue = '# Title\n\nParagraph to delete';
      const newValue = '# Title';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heading',
            status: 'unchanged',
          }),
          expect.objectContaining({
            type: 'paragraph',
            content: 'Paragraph to delete',
            status: 'deleted',
            diffContent: '--Paragraph to delete--',
          }),
        ]),
      );
    });

    it('handles the complex user story example correctly', () => {
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

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heading',
            level: '#',
            content: 'My title',
            status: 'unchanged',
          }),
          expect.objectContaining({
            type: 'heading',
            level: '##',
            content: 'My sub-heading',
            status: 'unchanged',
          }),
          expect.objectContaining({
            type: 'paragraph',
            content: 'This is my updated content',
            status: 'updated',
            diffContent: expect.stringMatching(/--was--.*\+\+is\+\+/),
          }),
          expect.objectContaining({
            type: 'paragraph',
            content: 'There was a line here.',
            status: 'deleted',
            diffContent: '--There was a line here.--',
          }),
          expect.objectContaining({
            type: 'list',
            status: 'updated',
            items: expect.arrayContaining([
              expect.objectContaining({
                content: 'one item',
                status: 'deleted',
              }),
              expect.objectContaining({
                content: 'first item',
                status: 'added',
              }),
              expect.objectContaining({
                content: 'a new item',
                status: 'added',
              }),
              expect.objectContaining({
                content: 'another item',
                status: 'unchanged',
              }),
            ]),
          }),
        ]),
      );
    });

    it('handles multiple heading levels', () => {
      const oldValue = '# H1\n## H2\n### H3';
      const newValue = '# H1\n## Updated H2\n### H3';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'heading',
          level: '#',
          status: 'unchanged',
        }),
        expect.objectContaining({
          type: 'heading',
          level: '##',
          content: 'Updated H2',
          status: 'updated',
        }),
        expect.objectContaining({
          type: 'heading',
          level: '###',
          status: 'unchanged',
        }),
      ]);
    });

    it('computes word-level diffs for code blocks', () => {
      const oldValue = '```js\nconst x = 1;\n```';
      const newValue = '```js\nconst x = 2;\n```';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'code',
          status: 'updated',
          language: 'js',
          diffContent: expect.stringMatching(/--1--.*\+\+2\+\+/),
          lineDiff: expect.stringContaining('-const x = 1;'),
        }),
      ]);
    });

    it('includes additions in line diff for code blocks', () => {
      const oldValue = '```js\nconst x = 1;\n```';
      const newValue = '```js\nconst x = 2;\n```';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result[0].lineDiff).toContain('+const x = 2;');
    });

    it('computes line-level diffs for multi-line code blocks', () => {
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

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'code',
          status: 'updated',
          language: 'javascript',
          lineDiff: expect.stringContaining('-function hello() {'),
        }),
      ]);
    });

    it('tracks list item additions', () => {
      const oldValue = '- item 1\n- item 2';
      const newValue = '- item 1\n- item 2\n- item 3';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'list',
          status: 'updated',
          items: [
            expect.objectContaining({ status: 'unchanged' }),
            expect.objectContaining({ status: 'unchanged' }),
            expect.objectContaining({
              status: 'added',
              diffContent: '++item 3++',
            }),
          ],
        }),
      ]);
    });

    it('tracks list item deletions', () => {
      const oldValue = '- item 1\n- item 2\n- item 3';
      const newValue = '- item 1\n- item 3';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'list',
          status: 'updated',
          items: [
            expect.objectContaining({ status: 'unchanged' }),
            expect.objectContaining({
              status: 'deleted',
              diffContent: '--item 2--',
            }),
            expect.objectContaining({ status: 'unchanged' }),
          ],
        }),
      ]);
    });

    it('returns empty array for empty markdown', () => {
      const result = parseAndDiffMarkdown('', '');

      expect(result).toEqual([]);
    });

    it('handles transition from empty to content', () => {
      const result = parseAndDiffMarkdown('', '# New heading');

      expect(result).toEqual([
        expect.objectContaining({
          type: 'heading',
          status: 'added',
        }),
      ]);
    });

    it('escapes HTML to prevent XSS', () => {
      const oldValue = 'Content with <script>alert("xss")</script>';
      const newValue = 'Content with <div>safe</div>';

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result[0].diffContent).toEqual(
        expect.not.stringContaining('<script>'),
      );
    });

    it('matches similar paragraphs by content for word-level diffing', () => {
      const oldValue = `This was my content

There was a line here.`;
      const newValue = `This is my updated content`;

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'paragraph',
            content: 'This is my updated content',
            status: 'updated',
            diffContent: expect.stringMatching(
              /--was--.*\+\+is\+\+.*\+\+updated \+\+/,
            ),
          }),
          expect.objectContaining({
            type: 'paragraph',
            content: 'There was a line here.',
            status: 'deleted',
          }),
        ]),
      );
    });

    it('handles complex markdown with mixed changes', () => {
      const oldValue = `# Title

Paragraph 1

Paragraph 2

- List item 1
- List item 2`;

      const newValue = `# Title

Paragraph 1 updated

New paragraph

- List item 1
- List item 2 updated
- List item 3`;

      const result = parseAndDiffMarkdown(oldValue, newValue);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heading',
            status: 'unchanged',
          }),
          expect.objectContaining({
            type: 'paragraph',
            status: expect.not.stringMatching('unchanged'),
          }),
          expect.objectContaining({
            type: 'list',
            status: expect.not.stringMatching('unchanged'),
          }),
        ]),
      );
    });
  });
});
