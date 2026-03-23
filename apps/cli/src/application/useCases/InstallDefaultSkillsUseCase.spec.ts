import * as fs from 'fs/promises';

import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { InstallDefaultSkillsUseCase } from './InstallDefaultSkillsUseCase';
import { DeleteItemType } from '@packmind/types';

jest.mock('fs/promises');

describe('InstallDefaultSkillsUseCase', () => {
  let useCase: InstallDefaultSkillsUseCase;
  let mockRepositories: jest.Mocked<IPackmindRepositories>;

  beforeEach(() => {
    const mockConfigFileRepository: jest.Mocked<IConfigFileRepository> = {
      writeConfig: jest.fn(),
      configExists: jest.fn(),
      readConfig: jest.fn().mockResolvedValue(null),
      addPackagesToConfig: jest.fn(),
      findDescendantConfigs: jest.fn(),
      readHierarchicalConfig: jest.fn(),
      findAllConfigsInTree: jest.fn(),
      updateConfig: jest.fn(),
      updateAgentsConfig: jest.fn(),
    };

    const mockLockFileRepository: jest.Mocked<ILockFileRepository> = {
      readLockFile: jest.fn(),
      writeLockFile: jest.fn(),
    } as unknown as jest.Mocked<ILockFileRepository>;

    mockRepositories = {
      packmindGateway: createMockPackmindGateway(),
      configFileRepository: mockConfigFileRepository,
      lockFileRepository: mockLockFileRepository,
    } as jest.Mocked<IPackmindRepositories>;

    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('');
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue(null);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.rmdir as jest.Mock).mockResolvedValue(undefined);

    useCase = new InstallDefaultSkillsUseCase(mockRepositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when processing delete operations', () => {
    describe('when deleting an existing file', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.claude/skills/old-skill/SKILL.md',
                type: DeleteItemType.File,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        result = await useCase.execute({
          baseDirectory: '/test',
        });
      });

      it('calls unlink to delete the file', () => {
        expect(fs.unlink).toHaveBeenCalledWith(
          '/test/.claude/skills/old-skill/SKILL.md',
        );
      });

      it('counts as file deleted', () => {
        expect(result.filesDeleted).toBe(1);
      });
    });

    describe('when deleting a non-existent file', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: 'nonexistent.md',
                type: DeleteItemType.File,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

        result = await useCase.execute({
          baseDirectory: '/test',
        });
      });

      it('does not call unlink', () => {
        expect(fs.unlink).not.toHaveBeenCalled();
      });

      it('does not count as file deleted', () => {
        expect(result.filesDeleted).toBe(0);
      });
    });

    describe('when deleting a directory', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.claude/skills/old-skill',
                type: DeleteItemType.Directory,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => true,
          isFile: () => false,
        });

        result = await useCase.execute({
          baseDirectory: '/test',
        });
      });

      it('calls rm with recursive and force options', () => {
        expect(fs.rm).toHaveBeenCalledWith('/test/.claude/skills/old-skill', {
          recursive: true,
          force: true,
        });
      });

      it('counts as file deleted', () => {
        expect(result.filesDeleted).toBe(1);
      });
    });

    describe('when deletion throws an error', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.claude/skills/broken-skill/SKILL.md',
                type: DeleteItemType.File,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });
        (fs.unlink as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );

        result = await useCase.execute({
          baseDirectory: '/test',
        });
      });

      it('captures the error in result.errors', () => {
        expect(result.errors).toEqual([
          'Failed to delete .claude/skills/broken-skill/SKILL.md: Permission denied',
        ]);
      });

      it('does not count as file deleted', () => {
        expect(result.filesDeleted).toBe(0);
      });
    });
  });

  describe('empty folder cleanup after deletion', () => {
    describe('when deleting a file leaves parent directory empty', () => {
      beforeEach(() => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.claude/skills/old-skill/SKILL.md',
                type: DeleteItemType.File,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        (fs.readdir as jest.Mock).mockResolvedValue([]);
      });

      it('removes empty parent directories', async () => {
        await useCase.execute({
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/skills/old-skill');
      });

      it('removes empty grandparent directories recursively', async () => {
        await useCase.execute({
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/skills');
      });
    });

    describe('when parent directory is not empty after deletion', () => {
      beforeEach(() => {
        mockRepositories.packmindGateway.skills.getDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.claude/skills/old-skill/SKILL.md',
                type: DeleteItemType.File,
              },
            ],
          },
        });

        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        (fs.readdir as jest.Mock).mockResolvedValue(['other-file.md']);
      });

      it('does not remove parent directory', async () => {
        await useCase.execute({
          baseDirectory: '/test',
        });

        expect(fs.rmdir).not.toHaveBeenCalled();
      });
    });
  });
});
