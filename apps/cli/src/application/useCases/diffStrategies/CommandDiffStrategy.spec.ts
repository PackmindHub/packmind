import * as fs from 'fs/promises';
import { ChangeProposalType } from '@packmind/types';
import { CommandDiffStrategy } from './CommandDiffStrategy';
import { DiffableFile } from './DiffableFile';

jest.mock('fs/promises');

const baseFile: DiffableFile = {
  path: '.opencode/commands/my-cmd.md',
  content:
    '---\ndescription: "Do the thing"\nagent: build\nmodel: default\nsubtask: false\n---\nThe body content',
  artifactType: 'command',
  artifactName: 'My Cmd',
  artifactId: 'art-1',
  spaceId: 'spc-1',
};

describe('CommandDiffStrategy', () => {
  let strategy: CommandDiffStrategy;

  beforeEach(() => {
    strategy = new CommandDiffStrategy();
    jest.clearAllMocks();
  });

  describe('supports', () => {
    it('returns true for command artifact type', () => {
      expect(strategy.supports({ ...baseFile, artifactType: 'command' })).toBe(
        true,
      );
    });

    it('returns false for non-command artifact type', () => {
      expect(strategy.supports({ ...baseFile, artifactType: 'skill' })).toBe(
        false,
      );
    });
  });

  describe('diff', () => {
    describe('when local file is identical to server content', () => {
      beforeEach(() => {
        (fs.readFile as jest.Mock).mockResolvedValue(baseFile.content);
      });

      it('returns no diffs', async () => {
        const result = await strategy.diff(baseFile, '/base');
        expect(result).toHaveLength(0);
      });
    });

    describe('when only the body differs', () => {
      const localContent =
        '---\ndescription: "Do the thing"\nagent: build\nmodel: default\nsubtask: false\n---\nUpdated body';

      beforeEach(() => {
        (fs.readFile as jest.Mock).mockResolvedValue(localContent);
      });

      it('returns one diff', async () => {
        const result = await strategy.diff(baseFile, '/base');
        expect(result).toHaveLength(1);
      });

      it('uses updateCommandDescription change type', async () => {
        const [diff] = await strategy.diff(baseFile, '/base');
        expect(diff.type).toBe(ChangeProposalType.updateCommandDescription);
      });

      it('sets oldValue to full server content', async () => {
        const [diff] = await strategy.diff(baseFile, '/base');
        expect(diff.payload.oldValue).toBe(baseFile.content);
      });

      it('sets newValue to full local content', async () => {
        const [diff] = await strategy.diff(baseFile, '/base');
        expect(diff.payload.newValue).toBe(localContent);
      });
    });

    describe('when only frontmatter differs', () => {
      const localContent =
        '---\ndescription: "Updated description"\nagent: build\nmodel: default\nsubtask: false\n---\nThe body content';

      beforeEach(() => {
        (fs.readFile as jest.Mock).mockResolvedValue(localContent);
      });

      it('returns one diff', async () => {
        const result = await strategy.diff(baseFile, '/base');
        expect(result).toHaveLength(1);
      });

      it('uses updateCommandDescription change type', async () => {
        const [diff] = await strategy.diff(baseFile, '/base');
        expect(diff.type).toBe(ChangeProposalType.updateCommandDescription);
      });
    });

    describe('when local file has no frontmatter and content matches server body', () => {
      const serverNoFrontmatter: DiffableFile = {
        ...baseFile,
        path: '.cursor/commands/my-cmd.md',
        content: 'The body content',
      };

      beforeEach(() => {
        (fs.readFile as jest.Mock).mockResolvedValue('The body content');
      });

      it('returns no diffs', async () => {
        const result = await strategy.diff(serverNoFrontmatter, '/base');
        expect(result).toHaveLength(0);
      });
    });

    describe('when local file does not exist', () => {
      beforeEach(() => {
        (fs.readFile as jest.Mock).mockRejectedValue(
          new Error('ENOENT: no such file'),
        );
      });

      it('returns no diffs', async () => {
        const result = await strategy.diff(baseFile, '/base');
        expect(result).toHaveLength(0);
      });
    });
  });
});
