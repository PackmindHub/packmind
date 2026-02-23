import { buildDiffHtml } from './markdownDiff';

describe('buildDiffHtml', () => {
  describe('with unchanged content', () => {
    const content = '## Heading\n\nSome paragraph.';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(content, content);
    });

    it('renders the heading', () => {
      expect(result).toContain('<h2>Heading</h2>');
    });

    it('renders the paragraph', () => {
      expect(result).toContain('<p>Some paragraph.</p>');
    });

    it('does not contain del tags', () => {
      expect(result).not.toContain('<del>');
    });

    it('does not contain ins tags', () => {
      expect(result).not.toContain('<ins>');
    });
  });

  describe('with deleted list items', () => {
    const oldValue = [
      '## When to Use',
      '',
      '* When adding a new service',
      '* When refactoring existing code',
      '* When reviewing code',
    ].join('\n');
    const newValue = '## When to Use';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('wraps first deleted list item in del inside li', () => {
      expect(result).toContain('<li><del>When adding a new service</del></li>');
    });

    it('wraps second deleted list item in del inside li', () => {
      expect(result).toContain(
        '<li><del>When refactoring existing code</del></li>',
      );
    });

    it('wraps third deleted list item in del inside li', () => {
      expect(result).toContain('<li><del>When reviewing code</del></li>');
    });

    describe('when list is fully replaced', () => {
      const replacedOldValue = '* Item one\n* Item two\n* Item three';
      const replacedNewValue = 'Replaced with paragraph.';
      let replacedResult: string;

      beforeEach(() => {
        replacedResult = buildDiffHtml(replacedOldValue, replacedNewValue);
      });

      it('does not produce del tags spanning into li', () => {
        expect(replacedResult).not.toMatch(/<del>[^<]*<li>/);
      });

      it('does not produce del tags spanning across li boundaries', () => {
        expect(replacedResult).not.toMatch(/<del>[^<]*<\/li>[^<]*<li>/);
      });
    });
  });

  describe('with added list items', () => {
    const oldValue = '## Section';
    const newValue = [
      '## Section',
      '',
      '* New item one',
      '* New item two',
    ].join('\n');
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('wraps first added list item in ins inside li', () => {
      expect(result).toContain('<li><ins>New item one</ins></li>');
    });

    it('wraps second added list item in ins inside li', () => {
      expect(result).toContain('<li><ins>New item two</ins></li>');
    });
  });

  describe('with mixed list changes', () => {
    const oldValue = '* Keep this\n* Remove this\n* Also keep';
    const newValue = '* Keep this\n* Added new\n* Also keep';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('keeps unchanged items without markers', () => {
      expect(result).toContain('<li>Keep this</li>');
    });

    it('keeps second unchanged item without markers', () => {
      expect(result).toContain('<li>Also keep</li>');
    });

    it('marks removed items with del', () => {
      expect(result).toContain('<li><del>Remove this</del></li>');
    });

    it('marks added items with ins', () => {
      expect(result).toContain('<li><ins>Added new</ins></li>');
    });
  });

  describe('with paragraph text changes', () => {
    const oldValue = 'The quick brown fox';
    const newValue = 'The slow brown cat';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('contains del tags for removed words', () => {
      expect(result).toContain('<del>');
    });

    it('contains ins tags for added words', () => {
      expect(result).toContain('<ins>');
    });

    it('preserves unchanged words', () => {
      expect(result).toContain('brown');
    });
  });

  describe('with heading changes', () => {
    const oldValue = '## Old Title';
    const newValue = '## New Title';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('renders as h2 element', () => {
      expect(result).toContain('<h2>');
    });

    it('contains del tags for removed text', () => {
      expect(result).toContain('<del>');
    });

    it('contains ins tags for added text', () => {
      expect(result).toContain('<ins>');
    });
  });

  describe('with code blocks', () => {
    describe('when unchanged', () => {
      const content = '```js\nconst x = 1;\n```';
      let result: string;

      beforeEach(() => {
        result = buildDiffHtml(content, content);
      });

      it('renders code element', () => {
        expect(result).toContain('<code');
      });

      it('does not contain diff markers', () => {
        expect(result).not.toContain('diff-del');
        expect(result).not.toContain('diff-ins');
      });
    });

    describe('when modified', () => {
      const oldValue = '```js\nconst x = 1;\n```';
      const newValue = '```js\nconst x = 2;\n```';
      let result: string;

      beforeEach(() => {
        result = buildDiffHtml(oldValue, newValue);
      });

      it('renders a single pre element', () => {
        const preCount = (result.match(/<pre>/g) || []).length;
        expect(preCount).toBe(1);
      });

      it('uses span with diff-del class for removed code', () => {
        expect(result).toContain('<span class="diff-del">');
      });

      it('uses span with diff-ins class for added code', () => {
        expect(result).toContain('<span class="diff-ins">');
      });

      it('includes language class', () => {
        expect(result).toContain('class="language-js"');
      });
    });

    describe('when lines are added', () => {
      const oldValue = '```ts\nconst a = 1;\nconst b = 2;\n```';
      const newValue = '```ts\nconst a = 1;\n// new line\nconst b = 2;\n```';
      let result: string;

      beforeEach(() => {
        result = buildDiffHtml(oldValue, newValue);
      });

      it('uses span with diff-ins class for added lines', () => {
        expect(result).toContain('<span class="diff-ins">');
      });

      it('does not use raw ins tags inside code block', () => {
        expect(result).not.toMatch(/<code[^>]*>[\s\S]*<ins>/);
      });
    });

    describe('when containing HTML special characters', () => {
      const oldValue = '```\nconst a = x < y && z > 0;\n```';
      const newValue = '```\nconst a = x < y || z > 0;\n```';
      let result: string;

      beforeEach(() => {
        result = buildDiffHtml(oldValue, newValue);
      });

      it('escapes less-than signs', () => {
        expect(result).toContain('&lt;');
      });

      it('escapes greater-than signs', () => {
        expect(result).toContain('&gt;');
      });

      it('escapes ampersands', () => {
        expect(result).toContain('&amp;');
      });

      it('does not contain unescaped HTML in code blocks', () => {
        expect(result).not.toMatch(/<code[^>]*>.*[^&]<[^/dis]/);
      });
    });
  });

  describe('with task list items', () => {
    const oldValue = '* [ ] Unchecked task\n* [x] Checked task';
    const newValue = '';
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('wraps deleted task list items in del', () => {
      expect(result).toContain('<del>');
    });

    it('includes checkbox for task list items', () => {
      expect(result).toContain('checkbox');
    });
  });

  describe('with complex mixed content', () => {
    const oldValue = [
      '## When to Use',
      '',
      '* When adding a new service, controller, or API endpoint',
      '* When refactoring existing try/catch blocks',
      '* When reviewing code that lacks structured error responses',
    ].join('\n');
    const newValue = [
      '## When to Use',
      '',
      'Use this pattern in all new code.',
    ].join('\n');
    let result: string;

    beforeEach(() => {
      result = buildDiffHtml(oldValue, newValue);
    });

    it('preserves unchanged heading', () => {
      expect(result).toContain('<h2>When to Use</h2>');
    });

    it('contains del tags for removed content', () => {
      expect(result).toContain('<del>');
    });

    it('contains ins tags for added content', () => {
      expect(result).toContain('<ins>');
    });

    it('includes first deleted list item text', () => {
      expect(result).toContain(
        'When adding a new service, controller, or API endpoint',
      );
    });

    it('includes second deleted list item text', () => {
      expect(result).toContain('When refactoring existing try/catch blocks');
    });

    it('includes third deleted list item text', () => {
      expect(result).toContain(
        'When reviewing code that lacks structured error responses',
      );
    });
  });
});
