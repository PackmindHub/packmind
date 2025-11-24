import * as fs from 'fs/promises';
import { ConfigFileRepository } from './ConfigFileRepository';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigFileRepository', () => {
  let repository: ConfigFileRepository;

  beforeEach(() => {
    repository = new ConfigFileRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('readHierarchicalConfig', () => {
    describe('when no packmind.json exists in hierarchy', () => {
      it('returns empty result with hasConfigs false', async () => {
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api/src',
          '/project',
        );

        expect(result.hasConfigs).toBe(false);
        expect(result.configPaths).toHaveLength(0);
        expect(Object.keys(result.packages)).toHaveLength(0);
      });
    });

    describe('when single packmind.json exists at root', () => {
      it('returns packages from root config', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.packages).toEqual({ generic: '*' });
        expect(result.configPaths).toContain('/project/packmind.json');
      });
    });

    describe('when single packmind.json exists in subdirectory', () => {
      it('returns packages from subdirectory config only', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.packages).toEqual({ backend: '*' });
        expect(result.configPaths).toEqual(['/project/apps/api/packmind.json']);
      });
    });

    describe('when multiple packmind.json files exist', () => {
      it('merges packages from all configs', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.packages).toEqual({ generic: '*', backend: '*' });
        expect(result.configPaths).toHaveLength(2);
      });

      it('gives precedence to deeper config for same package slug', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { shared: '1.0.0' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { shared: '2.0.0' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );

        expect(result.packages.shared).toBe('2.0.0');
      });
    });

    describe('when start and stop directories are the same', () => {
      it('reads only from that directory', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { only: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project',
          '/project',
        );

        expect(result.packages).toEqual({ only: '*' });
        expect(result.configPaths).toHaveLength(1);
      });
    });

    describe('when config file has malformed JSON', () => {
      it('throws descriptive error', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return 'not valid json';
          }
          throw { code: 'ENOENT' };
        });

        await expect(
          repository.readHierarchicalConfig('/project', '/project'),
        ).rejects.toThrow('Failed to read packmind.json');
      });
    });

    describe('when config paths are collected in order', () => {
      it('lists configs from deepest to shallowest', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { root: '*' } });
          }
          if (filePath === '/project/apps/packmind.json') {
            return JSON.stringify({ packages: { apps: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { api: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );

        expect(result.configPaths).toEqual([
          '/project/apps/api/packmind.json',
          '/project/apps/packmind.json',
          '/project/packmind.json',
        ]);
      });
    });
  });
});
