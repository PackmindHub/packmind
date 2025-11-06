import { extractCodeFromMarkdown } from './MarkdownCleaner';

describe('MarkdownCleaner', () => {
  describe('extractCodeFromMarkdown', () => {
    it('returns the input code since it does not contain markdown code tags', () => {
      const input = 'console.log';
      const output = 'console.log';

      expect(extractCodeFromMarkdown(input)).toBe(output);
    });

    describe('when it contains triple backticks', () => {
      describe('when it does not contain the language', () => {
        it('returns the input code', () => {
          const input = `\`\`\`
console.log
\`\`\``;
          const output = 'console.log';

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });

        it('returns the input code with triple backquotes and language js before and after', () => {
          const input = `\`\`\`js
console.log
\`\`\``;
          const output = 'console.log';

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });

        it('returns the input code with triple backquotes and language java before and after', () => {
          const input = `\`\`\`java
System.out.println("Hello");
\`\`\``;
          const output = 'System.out.println("Hello");';

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });

        it('extracts multi-line code', () => {
          const input = `\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\``;
          const output = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });

        it('returns empty string for empty code block', () => {
          const input = `\`\`\`

\`\`\``;
          const output = '';

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });

        it('extracts code block with surrounding text', () => {
          const input = `Here is some code:
\`\`\`python
print("Hello")
\`\`\`
And here is more text after.`;
          const output = 'print("Hello")';

          expect(extractCodeFromMarkdown(input)).toBe(output);
        });
      });
    });
  });
});
