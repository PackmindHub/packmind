import {
  createMockPackmindGateway,
  createMockSkillsGateway,
  createMockSpacesGateway,
} from '../../mocks/createMockGateways';

jest.mock('../../infra/utils/readSkillDirectory');

import { UploadSkillUseCase } from './UploadSkillUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { ISkillsGateway } from '../../domain/repositories/ISkillsGateway';
import { readSkillDirectory } from '../../infra/utils/readSkillDirectory';
import { createSkillId } from '@packmind/types';

const mockedReadSkillDirectory = readSkillDirectory as jest.MockedFunction<
  typeof readSkillDirectory
>;

describe('UploadSkillUseCase', () => {
  let useCase: UploadSkillUseCase;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;
  let mockSkillsGateway: jest.Mocked<ISkillsGateway>;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockSpacesGateway = createMockSpacesGateway();
    mockSkillsGateway = createMockSkillsGateway();
    mockGateway = createMockPackmindGateway({
      spaces: mockSpacesGateway,
      skills: mockSkillsGateway,
    });

    useCase = new UploadSkillUseCase({
      gateway: mockGateway,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when SKILL.md is missing', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/README.md',
          relativePath: 'README.md',
          content: '# My Skill',
          size: 10,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({ skillPath: '/skills/my-skill' }),
      ).rejects.toThrow('SKILL.md not found in skill directory');
    });

    it('does not call spaces gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSpacesGateway.getGlobal).not.toHaveBeenCalled();
    });

    it('does not call skills gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSkillsGateway.upload).not.toHaveBeenCalled();
    });
  });

  describe('when file count exceeds maximum', () => {
    beforeEach(() => {
      const files = Array.from({ length: 101 }, (_, i) => ({
        path: `/skills/my-skill/file-${i}.ts`,
        relativePath: `file-${i}.ts`,
        content: 'content',
        size: 10,
        permissions: 'rw-r--r--',
        isBase64: false,
      }));
      files.push({
        path: '/skills/my-skill/SKILL.md',
        relativePath: 'SKILL.md',
        content: '# My Skill',
        size: 10,
        permissions: 'rw-r--r--',
        isBase64: false,
      });
      mockedReadSkillDirectory.mockResolvedValue(files);
    });

    it('throws an error with file count details', async () => {
      await expect(
        useCase.execute({ skillPath: '/skills/my-skill' }),
      ).rejects.toThrow('Skill contains 102 files, but maximum allowed is 100');
    });

    it('does not call spaces gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSpacesGateway.getGlobal).not.toHaveBeenCalled();
    });

    it('does not call skills gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSkillsGateway.upload).not.toHaveBeenCalled();
    });
  });

  describe('when total size exceeds 10MB', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# My Skill',
          size: 10,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/skills/my-skill/large-file.bin',
          relativePath: 'large-file.bin',
          content: 'x'.repeat(11 * 1024 * 1024),
          size: 11 * 1024 * 1024,
          permissions: 'rw-r--r--',
          isBase64: true,
        },
      ]);
    });

    it('throws an error with size details', async () => {
      const expectedSize = 11 * 1024 * 1024 + 10;
      await expect(
        useCase.execute({ skillPath: '/skills/my-skill' }),
      ).rejects.toThrow(
        `Skill size (${expectedSize} bytes) exceeds 10MB limit`,
      );
    });

    it('does not call spaces gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSpacesGateway.getGlobal).not.toHaveBeenCalled();
    });

    it('does not call skills gateway', async () => {
      try {
        await useCase.execute({ skillPath: '/skills/my-skill' });
      } catch {
        // Expected to throw
      }

      expect(mockSkillsGateway.upload).not.toHaveBeenCalled();
    });
  });

  describe('when skill directory is valid', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# My Skill\nDescription here',
          size: 25,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/skills/my-skill/script.ts',
          relativePath: 'script.ts',
          content: 'console.log("hello");',
          size: 22,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: 'skill-456',
          name: 'my-skill',
          version: 1,
        },
        versionCreated: true,
      });
    });

    it('reads files from the provided skill path', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockedReadSkillDirectory).toHaveBeenCalledWith('/skills/my-skill');
    });

    it('gets the global space', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockSpacesGateway.getGlobal).toHaveBeenCalled();
    });

    it('uploads skill with correct spaceId', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockSkillsGateway.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-123',
        }),
      );
    });

    it('uploads skill with mapped file data', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockSkillsGateway.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [
            {
              path: 'SKILL.md',
              content: '# My Skill\nDescription here',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
            {
              path: 'script.ts',
              content: 'console.log("hello");',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          ],
        }),
      );
    });

    it('returns skillId from upload response', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.skillId).toBe('skill-456');
    });

    it('returns name from upload response', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.name).toBe('my-skill');
    });

    it('returns version from upload response', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.version).toBe(1);
    });

    it('returns isNewSkill matching versionCreated', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.isNewSkill).toBe(true);
    });

    it('returns versionCreated from upload response', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.versionCreated).toBe(true);
    });

    it('returns fileCount matching number of files', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.fileCount).toBe(2);
    });

    it('returns totalSize as sum of file sizes', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.totalSize).toBe(47);
    });
  });

  describe('when file has no permissions set', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# Skill',
          size: 7,
          permissions: undefined as unknown as string,
          isBase64: false,
        },
      ]);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: createSkillId('skill-456'),
          name: 'my-skill',
          version: 1,
        },
        versionCreated: true,
      });
    });

    it('uses default permissions rw-r--r--', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockSkillsGateway.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [
            expect.objectContaining({
              permissions: 'rw-r--r--',
            }),
          ],
        }),
      );
    });
  });

  describe('when updating an existing skill', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# Updated Skill',
          size: 15,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: 'skill-456',
          name: 'my-skill',
          version: 3,
        },
        versionCreated: false,
      });
    });

    it('returns versionCreated as false', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.versionCreated).toBe(false);
    });

    it('returns isNewSkill as false', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.isNewSkill).toBe(false);
    });

    it('returns the updated version number', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.version).toBe(3);
    });
  });

  describe('when skill contains binary files', () => {
    beforeEach(() => {
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# Skill',
          size: 7,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/skills/my-skill/icon.png',
          relativePath: 'icon.png',
          content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
          size: 44,
          permissions: 'rw-r--r--',
          isBase64: true,
        },
      ]);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: 'skill-456',
          name: 'my-skill',
          version: 1,
        },
        versionCreated: true,
      });
    });

    it('uploads binary files with isBase64 flag set to true', async () => {
      await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(mockSkillsGateway.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({
              path: 'icon.png',
              isBase64: true,
            }),
          ]),
        }),
      );
    });
  });

  describe('when file count is exactly at maximum', () => {
    beforeEach(() => {
      const files = Array.from({ length: 99 }, (_, i) => ({
        path: `/skills/my-skill/file-${i}.ts`,
        relativePath: `file-${i}.ts`,
        content: 'x',
        size: 1,
        permissions: 'rw-r--r--',
        isBase64: false,
      }));
      files.push({
        path: '/skills/my-skill/SKILL.md',
        relativePath: 'SKILL.md',
        content: '# Skill',
        size: 7,
        permissions: 'rw-r--r--',
        isBase64: false,
      });
      mockedReadSkillDirectory.mockResolvedValue(files);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: 'skill-456',
          name: 'my-skill',
          version: 1,
        },
        versionCreated: true,
      });
    });

    it('accepts the upload', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.fileCount).toBe(100);
    });
  });

  describe('when total size is exactly at limit', () => {
    beforeEach(() => {
      const tenMB = 10 * 1024 * 1024;
      mockedReadSkillDirectory.mockResolvedValue([
        {
          path: '/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: '# Skill',
          size: 7,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/skills/my-skill/data.bin',
          relativePath: 'data.bin',
          content: 'x'.repeat(tenMB - 7),
          size: tenMB - 7,
          permissions: 'rw-r--r--',
          isBase64: true,
        },
      ]);
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-123',
        slug: 'global',
      });
      mockSkillsGateway.upload.mockResolvedValue({
        skill: {
          id: 'skill-456',
          name: 'my-skill',
          version: 1,
        },
        versionCreated: true,
      });
    });

    it('accepts the upload', async () => {
      const result = await useCase.execute({ skillPath: '/skills/my-skill' });

      expect(result.totalSize).toBe(10 * 1024 * 1024);
    });
  });
});
