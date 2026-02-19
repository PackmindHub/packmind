import * as fs from 'fs/promises';
import { ChangeProposalType } from '@packmind/types';
import { StandardDiffStrategy } from './StandardDiffStrategy';
import { DiffableFile } from './DiffableFile';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';

jest.mock('fs/promises');

describe('StandardDiffStrategy', () => {
  let strategy: StandardDiffStrategy;

  beforeEach(() => {
    strategy = new StandardDiffStrategy();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supports', () => {
    it('returns true for standard artifact type', () => {
      const file = { artifactType: 'standard' } as DiffableFile;

      expect(strategy.supports(file)).toBe(true);
    });

    it('returns false for command artifact type', () => {
      const file = { artifactType: 'command' } as DiffableFile;

      expect(strategy.supports(file)).toBe(false);
    });

    it('returns false for skill artifact type', () => {
      const file = { artifactType: 'skill' } as DiffableFile;

      expect(strategy.supports(file)).toBe(false);
    });
  });

  describe('when standard name differs', () => {
    it('returns updateStandardName diff', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/my-standard.md',
        content: '# Server Name\n\nDescription\n\n## Rules\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '# Local Name\n\nDescription\n\n## Rules\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([
        {
          filePath: '.packmind/standards/my-standard.md',
          type: ChangeProposalType.updateStandardName,
          payload: {
            oldValue: 'Server Name',
            newValue: 'Local Name',
          },
          artifactName: 'My Standard',
          artifactType: 'standard',
          artifactId: 'art-1',
          spaceId: 'spc-1',
        },
      ]);
    });
  });

  describe('when standard description differs', () => {
    it('returns updateStandardDescription diff', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/my-standard.md',
        content: '# Same Name\n\nServer description\n\n## Rules\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '# Same Name\n\nLocal description\n\n## Rules\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([
        {
          filePath: '.packmind/standards/my-standard.md',
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'Server description',
            newValue: 'Local description',
          },
          artifactName: 'My Standard',
          artifactType: 'standard',
          artifactId: 'art-1',
          spaceId: 'spc-1',
        },
      ]);
    });
  });

  describe('when standard scope differs', () => {
    it('returns updateStandardScope diff', async () => {
      const file: DiffableFile = {
        path: '.claude/rules/packmind/standard-my-standard.md',
        content:
          '---\npaths: "**/*.ts"\nalwaysApply: false\n---\n## Standard: Same Name\n\nSame desc :\n\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '---\npaths: "**/*.tsx"\nalwaysApply: false\n---\n## Standard: Same Name\n\nSame desc :\n\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([
        {
          filePath: '.claude/rules/packmind/standard-my-standard.md',
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: '**/*.ts',
            newValue: '**/*.tsx',
          },
          artifactName: 'My Standard',
          artifactType: 'standard',
          artifactId: 'art-1',
          spaceId: 'spc-1',
        },
      ]);
    });
  });

  describe('when name, description, and scope all differ', () => {
    let result: ArtefactDiff[];

    beforeEach(async () => {
      const file: DiffableFile = {
        path: '.claude/rules/packmind/standard-my-standard.md',
        content:
          '---\npaths: "server-scope"\nalwaysApply: false\n---\n## Standard: Server Name\n\nServer desc :\n\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '---\npaths: "local-scope"\nalwaysApply: false\n---\n## Standard: Local Name\n\nLocal desc :\n\n* Rule 1',
      );

      result = await strategy.diff(file, '/test');
    });

    it('returns three diffs', () => {
      expect(result).toHaveLength(3);
    });

    it('includes updateStandardName diff', () => {
      expect(result[0].type).toBe(ChangeProposalType.updateStandardName);
    });

    it('includes updateStandardDescription diff', () => {
      expect(result[1].type).toBe(ChangeProposalType.updateStandardDescription);
    });

    it('includes updateStandardScope diff', () => {
      expect(result[2].type).toBe(ChangeProposalType.updateStandardScope);
    });
  });

  describe('when only body name differs in Claude format', () => {
    it('detects name change from body values', async () => {
      const file: DiffableFile = {
        path: '.claude/rules/packmind/standard-my-standard.md',
        content:
          '---\nname: Same FM\ndescription: Same FM\nalwaysApply: true\n---\n## Standard: Server Body Name\n\nDesc :\n\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '---\nname: Same FM\ndescription: Same FM\nalwaysApply: true\n---\n## Standard: Local Body Name\n\nDesc :\n\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([
        expect.objectContaining({
          type: ChangeProposalType.updateStandardName,
          payload: {
            oldValue: 'Server Body Name',
            newValue: 'Local Body Name',
          },
        }),
      ]);
    });
  });

  describe('when frontmatter name differs in Claude format', () => {
    it('uses frontmatter values over body values', async () => {
      const file: DiffableFile = {
        path: '.claude/rules/packmind/standard-my-standard.md',
        content:
          '---\nname: Server FM Name\ndescription: Desc\nalwaysApply: true\n---\n## Standard: Server Body\n\nDesc :\n\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '---\nname: Local FM Name\ndescription: Desc\nalwaysApply: true\n---\n## Standard: Local Body\n\nDesc :\n\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([
        expect.objectContaining({
          type: ChangeProposalType.updateStandardName,
          payload: {
            oldValue: 'Server FM Name',
            newValue: 'Local FM Name',
          },
        }),
      ]);
    });
  });

  describe('when nothing differs', () => {
    it('returns empty array', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/my-standard.md',
        content: '# Same Name\n\nSame description\n\n## Rules\n* Rule 1',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '# Same Name\n\nSame description\n\n## Rules\n* Rule 1',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([]);
    });
  });

  describe('when local file does not exist', () => {
    it('returns empty array', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/missing.md',
        content: '# My Standard\n\nDescription',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([]);
    });
  });

  describe('when markdown parsing fails', () => {
    it('returns empty array for unparseable server content', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/bad.md',
        content: 'No heading here',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(
        '# Valid Name\n\nDescription',
      );

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([]);
    });

    it('returns empty array for unparseable local content', async () => {
      const file: DiffableFile = {
        path: '.packmind/standards/bad.md',
        content: '# Valid Name\n\nDescription',
        artifactType: 'standard',
        artifactName: 'My Standard',
        artifactId: 'art-1',
        spaceId: 'spc-1',
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue('No heading here');

      const result = await strategy.diff(file, '/test');

      expect(result).toEqual([]);
    });
  });
});
