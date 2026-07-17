import { reconcileMarkdownForSave } from './reconcileMarkdownForSave';

describe('reconcileMarkdownForSave', () => {
  describe('with no changes at all', () => {
    it('returns the original content unchanged', () => {
      const oldValue = '# Title\n\nFirst paragraph.\n\nSecond paragraph.\n';
      const newValueFromEditor =
        '# Title\n\nFirst paragraph.\n\nSecond paragraph.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with a heading reformatted but not semantically edited', () => {
    it('keeps the original heading raw text, not the reformatted one', () => {
      const oldValue = '# Title\n\nSome text.\n';
      const newValueFromEditor = '#  Title\n\nSome text.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('# Title');
      expect(result).not.toContain('#  Title');
    });
  });

  describe('with a single edited paragraph among several', () => {
    it('replaces only the edited paragraph, keeping the others verbatim', () => {
      const oldValue =
        '# Skill\n\nLine one.\n\nLine two.\n\nLine three.\n\nLine four.\n';
      const newValueFromEditor =
        '# Skill\n\nLine one EDITED.\n\nLine two.\n\nLine three.\n\nLine four.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      const oldLines = oldValue.split('\n');
      const resultLines = result.split('\n');
      const differingLines = oldLines.filter(
        (line, index) => line !== resultLines[index],
      );

      expect(differingLines).toEqual(['Line one.']);
      expect(result).toContain('Line one EDITED.');
      expect(result).toContain('Line two.');
      expect(result).toContain('Line three.');
      expect(result).toContain('Line four.');
    });
  });

  describe('with a bullet list where only the first item is edited', () => {
    const oldValue =
      '# Skill\n\n* First item.\n* Second item.\n* Third item.\n* Fourth item.\n';
    // Simulates Milkdown re-serializing the whole list with "-" bullets,
    // even though only the first item's text actually changed.
    const newValueFromEditor =
      '# Skill\n\n- First item EDITED.\n- Second item.\n- Third item.\n- Fourth item.\n';

    it('preserves the original bullet marker and text for untouched items', () => {
      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('* Second item.');
      expect(result).toContain('* Third item.');
      expect(result).toContain('* Fourth item.');
      expect(result).toContain('First item EDITED.');
    });

    it('changes exactly one line relative to the original', () => {
      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      const oldLines = oldValue.split('\n');
      const resultLines = result.split('\n');
      expect(resultLines).toHaveLength(oldLines.length);

      const differingLines = oldLines.filter(
        (line, index) => line !== resultLines[index],
      );
      expect(differingLines).toEqual(['* First item.']);
    });
  });

  describe('with a new bullet item added to the list', () => {
    it('keeps the untouched items verbatim and adds the new one', () => {
      const oldValue = '# Skill\n\n* First item.\n* Second item.\n';
      const newValueFromEditor =
        '# Skill\n\n- First item.\n- Second item.\n- Third item.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('* First item.');
      expect(result).toContain('* Second item.');
      expect(result).toContain('Third item.');
    });
  });

  describe('with a paragraph removed', () => {
    it('drops the removed paragraph and keeps the rest verbatim', () => {
      const oldValue = '# Skill\n\nKeep me.\n\nRemove me.\n\nKeep me too.\n';
      const newValueFromEditor = '# Skill\n\nKeep me.\n\nKeep me too.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('Keep me.');
      expect(result).toContain('Keep me too.');
      expect(result).not.toContain('Remove me.');
    });
  });

  describe('with the last bullet item removed', () => {
    it('does not add a trailing newline that the original document did not have', () => {
      const oldValue =
        '# Skill\n\n* First item.\n* Second item.\n* Third item.\n* Fourth item.';
      const newValueFromEditor =
        '# Skill\n\n- First item.\n- Second item.\n- Third item.';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(
        '# Skill\n\n* First item.\n* Second item.\n* Third item.',
      );
    });
  });

  describe('with a middle bullet item removed', () => {
    it('drops only the removed item, keeping the rest byte-identical', () => {
      const oldValue =
        '# Skill\n\n* First item.\n* Second item.\n* Third item.\n* Fourth item.';
      const newValueFromEditor =
        '# Skill\n\n- First item.\n- Third item.\n- Fourth item.';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue.replace('* Second item.\n', ''));
    });
  });

  describe('with the file emptied entirely', () => {
    it('returns an empty string', () => {
      const result = reconcileMarkdownForSave('# Title\n\nBody.\n', '');

      expect(result).toBe('');
    });
  });

  describe('with an ordered list where one item is edited', () => {
    it('preserves the untouched items verbatim', () => {
      const oldValue =
        '# Skill\n\n1. First item.\n2. Second item.\n3. Third item.\n';
      const newValueFromEditor =
        '# Skill\n\n1. First item EDITED.\n2. Second item.\n3. Third item.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('First item EDITED.');
      expect(result).toContain('2. Second item.');
      expect(result).toContain('3. Third item.');
    });
  });

  describe('with the editor changing only blank-line counts between blocks', () => {
    it('keeps the original spacing byte-for-byte', () => {
      const oldValue = '# Title\n\nBody one.\n\nBody two.\n';
      const newValueFromEditor = '# Title\n\nBody one.\n\n\nBody two.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with unchanged content but a trailing newline added by the editor', () => {
    it('returns the original content byte-for-byte, without a trailing newline', () => {
      const oldValue =
        '# test-skill\n\n* First item.\n* Second item.\n* Third item.\n* Fourth item.';
      const newValueFromEditor =
        '# test-skill\n\n- First item.\n- Second item.\n- Third item.\n- Fourth item.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with a list item edited and no trailing newline in the original', () => {
    it('changes exactly one line and keeps the same line count', () => {
      const oldValue =
        '# test-skill\n\n* First item.\n* Second item.\n* Third item.\n* Fourth item.';
      const newValueFromEditor =
        '# test-skill\n\n- First item EDITED.\n- Second item.\n- Third item.\n- Fourth item.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      const oldLines = oldValue.split('\n');
      const resultLines = result.split('\n');
      expect(resultLines).toHaveLength(oldLines.length);

      const differingLines = oldLines.filter(
        (line, index) => line !== resultLines[index],
      );
      expect(differingLines).toEqual(['* First item.']);
      expect(result).toContain('First item EDITED.');
    });
  });

  describe('with serializer escaping and padding noise in an unchanged table', () => {
    it('keeps the original table bytes', () => {
      const oldValue =
        '# Skill\n\n| Option | Directories |\n|--------|-------------|\n| Packages (packages/*) | `packages/*/src/**` |\n';
      const newValueFromEditor =
        '# Skill\n\n| Option                 | Directories          |\n| ---------------------- | -------------------- |\n| Packages (packages/\\*) | `packages/*/src/**`  |\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with bold re-serialized as split emphasis runs around inline code', () => {
    it('keeps the original paragraph bytes', () => {
      const oldValue =
        '# Skill\n\nGrep terms, **scoped to the `{target_domains}` directories only**. Then stop.\n';
      const newValueFromEditor =
        '# Skill\n\nGrep terms, **scoped to the** **`{target_domains}`** **directories only**. Then stop.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with a tight nested list re-serialized as loose with different markers', () => {
    it('keeps the original nested list bytes', () => {
      const oldValue =
        '# Skill\n\n1. **Rules** — each rule block:\n   - Rule number and title\n   - Each `## Example N` with its narrative\n2. Other point.\n';
      const newValueFromEditor =
        '# Skill\n\n1. **Rules** — each rule block:\n\n   * Rule number and title\n\n   * Each `## Example N` with its narrative\n\n2. Other point.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with two headings edited far apart plus spacing noise', () => {
    it('changes exactly the two heading lines and nothing else', () => {
      const oldValue =
        '## Reference\n\nIntro paragraph.\n\n## 1. Parse the EM Spec\n\nLaunch an agent. Replace:\n- `{summary}` with the summary\n- `{domains}` with the domains\n\nClosing paragraph.\n- The report file path\n';
      // Milkdown: edits both headings, inserts a blank line between the
      // paragraph and its contiguous list, changes bullet markers, and adds
      // trailing blank lines at EOF.
      const newValueFromEditor =
        '## References\n\nIntro paragraph.\n\n## 1. Parse the EM Specs\n\nLaunch an agent. Replace:\n\n* `{summary}` with the summary\n\n* `{domains}` with the domains\n\nClosing paragraph.\n\n* The report file path\n\n\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(
        oldValue
          .replace('## Reference\n', '## References\n')
          .replace('## 1. Parse the EM Spec\n', '## 1. Parse the EM Specs\n'),
      );
    });
  });

  describe('with a genuine spacing edit inside an inline code span', () => {
    it('uses the edited version, not the old bytes', () => {
      const oldValue = '# Skill\n\nRun `foo  --bar` now.\n';
      const newValueFromEditor = '# Skill\n\nRun `foo --bar` now.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('`foo --bar`');
      expect(result).not.toContain('`foo  --bar`');
    });
  });

  describe('with emphasis genuinely replaced by an escaped literal', () => {
    it('detects star emphasis turned into literal stars', () => {
      const oldValue = '# Skill\n\nRate it *star* please.\n';
      const newValueFromEditor = '# Skill\n\nRate it \\*star\\* please.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('\\*star\\*');
    });

    it('detects a literal backtick turned into a code span', () => {
      const oldValue = '# Skill\n\nType \\`x\\` here.\n';
      const newValueFromEditor = '# Skill\n\nType `x` here.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('Type `x` here.');
    });
  });

  describe('with an ordered list renumbered to a different start', () => {
    it('uses the new numbering', () => {
      const oldValue = '# Skill\n\n1. alpha\n2. beta\n';
      const newValueFromEditor = '# Skill\n\n5. alpha\n6. beta\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('5. alpha');
    });
  });

  describe('with leading blank lines in the original document', () => {
    it('preserves them when an edit exists elsewhere', () => {
      const oldValue = '\n\n# Skill\n\nParagraph.\n';
      const newValueFromEditor = '# Skills\n\nParagraph.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe('\n\n# Skills\n\nParagraph.\n');
    });
  });

  describe('with a genuine hard break added by the user', () => {
    it('detects the hard break and uses the edited version', () => {
      const oldValue = '# Skill\n\nline one line two\n';
      const newValueFromEditor = '# Skill\n\nline one\\\nline two\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('line one\\\nline two');
    });
  });

  describe('with a soft-wrapped paragraph joined by the editor', () => {
    it('keeps the original wrapping as noise', () => {
      const oldValue = '# Skill\n\nline one\nline two\n';
      const newValueFromEditor = '# Skill\n\nline one line two\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toBe(oldValue);
    });
  });

  describe('with an untouched hard break alongside an edit elsewhere', () => {
    it('keeps the original hard-break bytes', () => {
      const oldValue = '# Skill\n\nline one\\\nline two\n\nOther paragraph.\n';
      const newValueFromEditor =
        '# Skill\n\nline one\\\nline two\n\nOther paragraph EDITED.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('line one\\\nline two');
      expect(result).toContain('Other paragraph EDITED.');
      expect(result).not.toContain('Other paragraph.\n');
    });
  });

  describe('with a genuine user edit adding bold to one word', () => {
    it('detects the change and uses the edited version', () => {
      const oldValue = '# Skill\n\nThis point is important to remember.\n';
      const newValueFromEditor =
        '# Skill\n\nThis point is **important** to remember.\n';

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain('**important**');
      expect(result).not.toContain('is important to');
    });
  });

  describe('with a fenced code block containing internal blank lines', () => {
    it('preserves the code block exactly, untouched, alongside an edited paragraph', () => {
      const codeBlock = '```ts\nfunction a() {\n\n  return 1;\n}\n```';
      const oldValue = `# Skill\n\nIntro text.\n\n${codeBlock}\n`;
      const newValueFromEditor = `# Skill\n\nIntro text EDITED.\n\n${codeBlock}\n`;

      const result = reconcileMarkdownForSave(oldValue, newValueFromEditor);

      expect(result).toContain(codeBlock);
      expect(result).toContain('Intro text EDITED.');
    });
  });
});
