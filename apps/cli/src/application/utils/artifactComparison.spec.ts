import { ChangeProposalType } from '@packmind/types';

import {
  compareCommandFields,
  compareStandardFields,
} from './artifactComparison';

const PACKMIND_PATH = '.packmind/standards/my-standard.md';

function buildStandard(opts: {
  name?: string;
  description?: string;
  rules?: string[];
}): string {
  const name = opts.name ?? 'My Standard';
  const description = opts.description ?? 'A description';
  const rules = opts.rules ?? ['Rule one', 'Rule two'];
  const rulesSection = rules.length
    ? `\n## Rules\n${rules.map((r) => `- ${r}`).join('\n')}`
    : '';
  return `# ${name}\n\n${description}${rulesSection}\n`;
}

const CLAUDE_PATH = '.claude/rules/packmind/standard-my-standard.md';

function buildClaudeStandard(opts: {
  name?: string;
  fmName?: string;
  description?: string;
  fmDescription?: string;
  scope?: string;
  rules?: string[];
}): string {
  const fmLines: string[] = [];
  if (opts.fmName) fmLines.push(`name: '${opts.fmName}'`);
  if (opts.fmDescription) fmLines.push(`description: '${opts.fmDescription}'`);
  if (opts.scope) fmLines.push(`globs: '${opts.scope}'`);
  const frontmatter = fmLines.length ? `---\n${fmLines.join('\n')}\n---\n` : '';
  const name = opts.name ?? 'My Standard';
  const description = opts.description ?? 'A description';
  const rules = opts.rules ?? ['Rule one', 'Rule two'];
  const rulesSection = rules.length
    ? `\n${rules.map((r) => `- ${r}`).join('\n')}`
    : '';
  return `${frontmatter}## Standard: ${name}\n\n${description} :${rulesSection}\n`;
}

describe('compareStandardFields', () => {
  it('returns empty array when contents are identical', () => {
    const content = buildStandard({});
    expect(compareStandardFields(content, content, PACKMIND_PATH)).toEqual([]);
  });

  it('detects name change', () => {
    const local = buildStandard({ name: 'New Name' });
    const deployed = buildStandard({ name: 'Old Name' });
    const changes = compareStandardFields(local, deployed, PACKMIND_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.updateStandardName,
      payload: { oldValue: 'Old Name', newValue: 'New Name' },
    });
  });

  it('detects frontmatterName change', () => {
    const local = buildClaudeStandard({ fmName: 'New FM Name' });
    const deployed = buildClaudeStandard({ fmName: 'Old FM Name' });
    const changes = compareStandardFields(local, deployed, CLAUDE_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.updateStandardName,
      payload: { oldValue: 'Old FM Name', newValue: 'New FM Name' },
    });
  });

  it('detects description change', () => {
    const local = buildStandard({ description: 'New desc' });
    const deployed = buildStandard({ description: 'Old desc' });
    const changes = compareStandardFields(local, deployed, PACKMIND_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.updateStandardDescription,
      payload: { oldValue: 'Old desc', newValue: 'New desc' },
    });
  });

  it('detects frontmatterDescription change', () => {
    const local = buildClaudeStandard({ fmDescription: 'New FM Desc' });
    const deployed = buildClaudeStandard({ fmDescription: 'Old FM Desc' });
    const changes = compareStandardFields(local, deployed, CLAUDE_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.updateStandardDescription,
      payload: { oldValue: 'Old FM Desc', newValue: 'New FM Desc' },
    });
  });

  it('detects scope change', () => {
    const local = buildClaudeStandard({ scope: '**/*.ts' });
    const deployed = buildClaudeStandard({ scope: '**/*.js' });
    const changes = compareStandardFields(local, deployed, CLAUDE_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.updateStandardScope,
      payload: { oldValue: '**/*.js', newValue: '**/*.ts' },
    });
  });

  it('detects added rules', () => {
    const local = buildStandard({
      rules: ['Rule one', 'Rule two', 'Rule three'],
    });
    const deployed = buildStandard({ rules: ['Rule one', 'Rule two'] });
    const changes = compareStandardFields(local, deployed, PACKMIND_PATH);
    expect(changes).toContainEqual({
      type: ChangeProposalType.addRule,
      payload: { item: { content: 'Rule three' } },
    });
  });

  it('detects deleted rules', () => {
    const local = buildStandard({ rules: ['Rule one'] });
    const deployed = buildStandard({
      rules: ['Rule one', 'Completely unique rule xyz'],
    });
    const changes = compareStandardFields(local, deployed, PACKMIND_PATH);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: ChangeProposalType.deleteRule,
        payload: expect.objectContaining({
          item: expect.objectContaining({
            content: 'Completely unique rule xyz',
          }),
        }),
      }),
    );
  });

  it('detects updated rules via matchUpdatedRules', () => {
    const local = buildStandard({
      rules: ['Use camelCase for all variable names'],
    });
    const deployed = buildStandard({
      rules: ['Use camelCase for variable names'],
    });
    const changes = compareStandardFields(local, deployed, PACKMIND_PATH);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: ChangeProposalType.updateRule,
        payload: expect.objectContaining({
          oldValue: 'Use camelCase for variable names',
          newValue: 'Use camelCase for all variable names',
        }),
      }),
    );
  });

  it('returns empty array when parsing fails', () => {
    const result = compareStandardFields(
      'invalid',
      'invalid',
      'unknown/path.md',
    );
    expect(result).toEqual([]);
  });
});

describe('compareCommandFields', () => {
  const basePath = '.claude/commands/my-command.md';

  it('returns empty array when contents are identical', () => {
    const content = '---\nname: My Command\n---\nDo something useful';
    expect(compareCommandFields(content, content, basePath)).toEqual([]);
  });

  it('detects name change', () => {
    const deployed = '---\nname: Old Command\n---\nBody here';
    const local = '---\nname: New Command\n---\nBody here';
    const changes = compareCommandFields(local, deployed, basePath);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: ChangeProposalType.updateCommandName,
        payload: { oldValue: 'Old Command', newValue: 'New Command' },
      }),
    );
  });

  it('detects content change', () => {
    const deployed = '---\nname: Cmd\n---\nOld body';
    const local = '---\nname: Cmd\n---\nNew body';
    const changes = compareCommandFields(local, deployed, basePath);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: ChangeProposalType.updateCommandDescription,
      }),
    );
  });

  it('returns empty array when local parsing fails', () => {
    expect(compareCommandFields('', 'valid content', basePath)).toEqual([]);
  });

  it('returns empty array when deployed parsing fails', () => {
    expect(
      compareCommandFields('---\nname: Cmd\n---\nBody', '', basePath),
    ).toEqual([]);
  });
});
