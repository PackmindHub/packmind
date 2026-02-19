import * as fs from 'fs/promises';
import { ChangeProposalType, createSkillFileId } from '@packmind/types';
import { SkillDiffStrategy } from './SkillDiffStrategy';
import { DiffableFile } from './DiffableFile';

jest.mock('fs/promises');
jest.mock('../../../infra/utils/binaryDetection', () => ({
  isBinaryFile: jest.fn(),
}));

import { isBinaryFile } from '../../../infra/utils/binaryDetection';

const mockedIsBinaryFile = isBinaryFile as jest.MockedFunction<
  typeof isBinaryFile
>;

describe('SkillDiffStrategy', () => {
  let strategy: SkillDiffStrategy;

  beforeEach(() => {
    strategy = new SkillDiffStrategy();
    jest.clearAllMocks();
  });

  describe('when binary file content is updated', () => {
    const serverContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString(
      'base64',
    );
    const localBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    const localBase64 = localBuffer.toString('base64');
    let contentDiff: ReturnType<SkillDiffStrategy['diff']> extends Promise<
      (infer U)[]
    >
      ? U | undefined
      : never;

    beforeEach(async () => {
      const file: DiffableFile = {
        path: '.claude/skills/my-skill/icon.png',
        content: serverContent,
        artifactType: 'skill',
        artifactName: 'My Skill',
        artifactId: 'art-1',
        spaceId: 'spc-1',
        skillFileId: 'icon.png',
        skillFilePermissions: 'rw-r--r--',
        isBase64: true,
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(localBuffer);
      (fs.stat as jest.Mock).mockResolvedValue({ mode: 0o100644 });
      mockedIsBinaryFile.mockReturnValue(true);

      const diffs = await strategy.diff(file, '/base');
      contentDiff = diffs.find(
        (d) => d.type === ChangeProposalType.updateSkillFileContent,
      );
    });

    it('produces a content diff', () => {
      expect(contentDiff).toBeDefined();
    });

    it('includes isBase64 true with correct old and new values', () => {
      expect(contentDiff!.payload).toEqual({
        targetId: createSkillFileId('icon.png'),
        oldValue: serverContent,
        newValue: localBase64,
        isBase64: true,
      });
    });
  });

  describe('when binary file content is unchanged', () => {
    it('returns no diff', async () => {
      const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const serverBase64 = binaryContent.toString('base64');

      const file: DiffableFile = {
        path: '.claude/skills/my-skill/icon.png',
        content: serverBase64,
        artifactType: 'skill',
        artifactName: 'My Skill',
        artifactId: 'art-1',
        spaceId: 'spc-1',
        skillFileId: 'icon.png',
        skillFilePermissions: 'rw-r--r--',
        isBase64: true,
      } as DiffableFile;

      (fs.readFile as jest.Mock).mockResolvedValue(binaryContent);
      (fs.stat as jest.Mock).mockResolvedValue({ mode: 0o100644 });
      mockedIsBinaryFile.mockReturnValue(true);

      const diffs = await strategy.diff(file, '/base');

      const contentDiff = diffs.find(
        (d) => d.type === ChangeProposalType.updateSkillFileContent,
      );
      expect(contentDiff).toBeUndefined();
    });
  });

  describe('when text file content is updated', () => {
    let contentDiff: ReturnType<SkillDiffStrategy['diff']> extends Promise<
      (infer U)[]
    >
      ? U | undefined
      : never;

    beforeEach(async () => {
      const file: DiffableFile = {
        path: '.claude/skills/my-skill/helper.ts',
        content: 'const x = 1;',
        artifactType: 'skill',
        artifactName: 'My Skill',
        artifactId: 'art-1',
        spaceId: 'spc-1',
        skillFileId: 'helper.ts',
        skillFilePermissions: 'rw-r--r--',
        isBase64: false,
      } as DiffableFile;

      const localBuffer = Buffer.from('const x = 2;', 'utf-8');
      (fs.readFile as jest.Mock).mockResolvedValue(localBuffer);
      (fs.stat as jest.Mock).mockResolvedValue({ mode: 0o100644 });
      mockedIsBinaryFile.mockReturnValue(false);

      const diffs = await strategy.diff(file, '/base');
      contentDiff = diffs.find(
        (d) => d.type === ChangeProposalType.updateSkillFileContent,
      );
    });

    it('produces a content diff', () => {
      expect(contentDiff).toBeDefined();
    });

    it('includes old and new values without isBase64', () => {
      expect(contentDiff!.payload).toEqual({
        targetId: createSkillFileId('helper.ts'),
        oldValue: 'const x = 1;',
        newValue: 'const x = 2;',
      });
    });
  });

  describe('diffNewFiles', () => {
    describe('when new file is binary', () => {
      const localBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const localBase64 = localBuffer.toString('base64');
      let diffs: Awaited<ReturnType<SkillDiffStrategy['diffNewFiles']>>;

      beforeEach(async () => {
        const serverFiles: DiffableFile[] = [
          {
            path: 'skills/my-skill/SKILL.md',
            content: '---\nname: My Skill\n---\nBody',
            artifactType: 'skill',
            artifactName: 'My Skill',
            artifactId: 'art-1',
            spaceId: 'spc-1',
          } as DiffableFile,
        ];

        (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md', 'icon.png']);
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          mode: 0o100644,
        });
        (fs.readFile as jest.Mock).mockResolvedValue(localBuffer);
        mockedIsBinaryFile.mockReturnValue(true);

        diffs = await strategy.diffNewFiles(
          ['skills/my-skill'],
          serverFiles,
          '/base',
        );
      });

      it('produces an addSkillFile diff', () => {
        expect(diffs).toHaveLength(1);
      });

      it('has addSkillFile type', () => {
        expect(diffs[0].type).toBe(ChangeProposalType.addSkillFile);
      });

      it('sets isBase64 to true with base64 content', () => {
        const item = (
          diffs[0].payload as { item: { content: string; isBase64: boolean } }
        ).item;
        expect(item).toEqual(
          expect.objectContaining({ content: localBase64, isBase64: true }),
        );
      });
    });

    describe('when new file is text', () => {
      const localBuffer = Buffer.from('const x = 1;', 'utf-8');
      let diffs: Awaited<ReturnType<SkillDiffStrategy['diffNewFiles']>>;

      beforeEach(async () => {
        const serverFiles: DiffableFile[] = [
          {
            path: 'skills/my-skill/SKILL.md',
            content: '---\nname: My Skill\n---\nBody',
            artifactType: 'skill',
            artifactName: 'My Skill',
            artifactId: 'art-1',
            spaceId: 'spc-1',
          } as DiffableFile,
        ];

        (fs.readdir as jest.Mock).mockResolvedValue(['SKILL.md', 'helper.ts']);
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          mode: 0o100644,
        });
        (fs.readFile as jest.Mock).mockResolvedValue(localBuffer);
        mockedIsBinaryFile.mockReturnValue(false);

        diffs = await strategy.diffNewFiles(
          ['skills/my-skill'],
          serverFiles,
          '/base',
        );
      });

      it('produces one diff', () => {
        expect(diffs).toHaveLength(1);
      });

      it('sets isBase64 to false with utf-8 content', () => {
        const item = (
          diffs[0].payload as { item: { content: string; isBase64: boolean } }
        ).item;
        expect(item).toEqual(
          expect.objectContaining({ content: 'const x = 1;', isBase64: false }),
        );
      });
    });
  });
});
