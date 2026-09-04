import { packageDescriptionPreview } from './packageDescriptionPreview';

describe('packageDescriptionPreview', () => {
  describe('when the description is plain prose', () => {
    it('returns it unchanged', () => {
      expect(
        packageDescriptionPreview('The commands that cut a version.'),
      ).toBe('The commands that cut a version.');
    });
  });

  describe('when it opens with a heading', () => {
    it('keeps the words and drops the hashes', () => {
      expect(
        packageDescriptionPreview('## What this carries\n\nThe playbook.'),
      ).toBe('What this carries The playbook.');
    });
  });

  describe('when it carries a fenced code block', () => {
    it('leaves the code out', () => {
      const description = 'Before.\n\n```ts\nconst a = 1;\n```\n\nAfter.';

      expect(packageDescriptionPreview(description)).toBe('Before. After.');
    });
  });

  describe('when a fence is never closed', () => {
    it('still leaves it out', () => {
      expect(packageDescriptionPreview('Before.\n\n```ts\nconst a = 1;')).toBe(
        'Before.',
      );
    });
  });

  describe('when it carries a table', () => {
    it('leaves the rows out', () => {
      const description =
        'Destinations.\n\n| Repo | Branch |\n| --- | --- |\n| web | main |\n\nEnd.';

      expect(packageDescriptionPreview(description)).toBe('Destinations. End.');
    });
  });

  describe('when it carries a list', () => {
    it('runs the items together as prose', () => {
      expect(packageDescriptionPreview('- One\n- Two\n- Three')).toBe(
        'One Two Three',
      );
    });
  });

  describe('when it carries a numbered list', () => {
    it('drops the ordinals', () => {
      expect(packageDescriptionPreview('1. One\n2. Two')).toBe('One Two');
    });
  });

  describe('when it carries emphasis', () => {
    it('keeps the emphasised words', () => {
      expect(packageDescriptionPreview('Use **bold** and *italic* here.')).toBe(
        'Use bold and italic here.',
      );
    });
  });

  describe('when it carries inline code', () => {
    it('keeps what the backticks wrapped', () => {
      expect(packageDescriptionPreview('Run `nx test frontend` first.')).toBe(
        'Run nx test frontend first.',
      );
    });
  });

  describe('when it carries a link', () => {
    it('keeps the text and drops the address', () => {
      expect(
        packageDescriptionPreview('See [the guide](https://example.com).'),
      ).toBe('See the guide.');
    });
  });

  describe('when it carries an image', () => {
    it('leaves nothing of it', () => {
      expect(packageDescriptionPreview('![diagram](a.png)Done.')).toBe('Done.');
    });
  });

  describe('when it carries a blockquote', () => {
    it('drops the caret', () => {
      expect(packageDescriptionPreview('> Quoted line.')).toBe('Quoted line.');
    });
  });

  describe('when a word contains an underscore', () => {
    it('leaves the word alone', () => {
      expect(packageDescriptionPreview('Set the_flag before running.')).toBe(
        'Set the_flag before running.',
      );
    });
  });

  describe('when it is a setext heading', () => {
    it('keeps the title and drops the underline', () => {
      expect(packageDescriptionPreview('Frontend\n===\n\nThe playbook.')).toBe(
        'Frontend The playbook.',
      );
    });
  });

  describe('when it is empty', () => {
    it('returns nothing', () => {
      expect(packageDescriptionPreview('   \n\n  ')).toBe('');
    });
  });
});
