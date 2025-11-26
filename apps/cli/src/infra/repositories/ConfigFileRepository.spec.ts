import * as fs from 'fs/promises';
import { ConfigFileRepository } from './ConfigFileRepository';

jest.mock('fs/promises');
jest.mock('chalk', () => ({
  bgYellow: { bold: (s: string) => s },
  yellow: (s: string) => s,
}));

const mockFs = fs as jest.Mocked<typeof fs>;

type MockDirent = { name: string; isDirectory: () => boolean };

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
      it('logs warning once and returns empty result', async () => {
        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(jest.fn());

        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return 'not valid json';
          }
          throw { code: 'ENOENT' };
        });

        // Call twice to verify warning is only shown once
        await repository.readHierarchicalConfig('/project', '/project');
        const result = await repository.readHierarchicalConfig(
          '/project',
          '/project',
        );

        expect(result.hasConfigs).toBe(false);
        expect(result.configPaths).toHaveLength(0);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('/project/packmind.json'),
        );

        consoleWarnSpy.mockRestore();
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

    describe('when stopDirectory is null', () => {
      it('walks up to filesystem root', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/home/user/packmind.json') {
            return JSON.stringify({ packages: { home: '*' } });
          }
          if (filePath === '/home/user/project/packmind.json') {
            return JSON.stringify({ packages: { project: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.readHierarchicalConfig(
          '/home/user/project',
          null,
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.packages).toEqual({ home: '*', project: '*' });
        expect(result.configPaths).toContain(
          '/home/user/project/packmind.json',
        );
        expect(result.configPaths).toContain('/home/user/packmind.json');
      });
    });
  });

  describe('findDescendantConfigs', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue([]);
    });

    describe('when no packmind.json exists in descendants', () => {
      it('returns empty array', async () => {
        mockFs.readdir.mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
          { name: 'file.ts', isDirectory: () => false },
        ] as MockDirent[] as never);
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        const result = await repository.findDescendantConfigs('/project');

        expect(result).toEqual([]);
      });
    });

    describe('when packmind.json exists in child directory', () => {
      it('returns directory path', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'apps', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/apps/packmind.json') {
            return JSON.stringify({ packages: { apps: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findDescendantConfigs('/project');

        expect(result).toEqual(['/project/apps']);
      });
    });

    describe('when packmind.json exists in nested directories', () => {
      it('returns all directory paths', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'apps', isDirectory: () => true },
            { name: 'packages', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValueOnce([
            { name: 'api', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/apps/packmind.json') {
            return JSON.stringify({ packages: { apps: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { api: '*' } });
          }
          if (filePath === '/project/packages/packmind.json') {
            return JSON.stringify({ packages: { packages: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findDescendantConfigs('/project');

        expect(result).toContain('/project/apps');
        expect(result).toContain('/project/apps/api');
        expect(result).toContain('/project/packages');
      });
    });

    describe('when excluded directories exist', () => {
      it('skips node_modules, .git, dist, build, coverage, .nx', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'node_modules', isDirectory: () => true },
            { name: '.git', isDirectory: () => true },
            { name: 'dist', isDirectory: () => true },
            { name: 'build', isDirectory: () => true },
            { name: 'coverage', isDirectory: () => true },
            { name: '.nx', isDirectory: () => true },
            { name: 'src', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/src/packmind.json') {
            return JSON.stringify({ packages: { src: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findDescendantConfigs('/project');

        expect(result).toEqual(['/project/src']);
      });
    });

    describe('when descendant has malformed JSON', () => {
      it('logs warning and skips malformed config', async () => {
        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(jest.fn());

        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'valid', isDirectory: () => true },
            { name: 'invalid', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/valid/packmind.json') {
            return JSON.stringify({ packages: { valid: '*' } });
          }
          if (filePath === '/project/invalid/packmind.json') {
            return 'not valid json';
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findDescendantConfigs('/project');

        expect(result).toEqual(['/project/valid']);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('/project/invalid/packmind.json'),
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe('findAllConfigsInTree', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue([]);
    });

    describe('when no packmind.json exists anywhere', () => {
      it('returns empty configs with hasConfigs false', async () => {
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        const result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(false);
        expect(result.configs).toHaveLength(0);
        expect(result.basePath).toBe('/project');
      });
    });

    describe('when packmind.json exists only at root', () => {
      it('returns root config with target path "/"', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.configs).toHaveLength(1);
        expect(result.configs[0]).toEqual({
          targetPath: '/',
          absoluteTargetPath: '/project',
          packages: { generic: '*' },
        });
      });
    });

    describe('when packmind.json exists in ancestor directories', () => {
      it('returns all ancestor configs with correct target paths', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.configs).toHaveLength(2);

        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        const apiConfig = result.configs.find(
          (c) => c.targetPath === '/apps/api',
        );

        expect(rootConfig).toEqual({
          targetPath: '/',
          absoluteTargetPath: '/project',
          packages: { generic: '*' },
        });
        expect(apiConfig).toEqual({
          targetPath: '/apps/api',
          absoluteTargetPath: '/project/apps/api',
          packages: { backend: '*' },
        });
      });
    });

    describe('when packmind.json exists in descendant directories', () => {
      it('returns descendant configs with correct target paths', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'apps', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValueOnce([
            { name: 'api', isDirectory: () => true },
            { name: 'web', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          if (filePath === '/project/apps/web/packmind.json') {
            return JSON.stringify({ packages: { frontend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findAllConfigsInTree(
          '/project',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.configs).toHaveLength(3);

        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        const apiConfig = result.configs.find(
          (c) => c.targetPath === '/apps/api',
        );
        const webConfig = result.configs.find(
          (c) => c.targetPath === '/apps/web',
        );

        expect(rootConfig?.packages).toEqual({ generic: '*' });
        expect(apiConfig?.packages).toEqual({ backend: '*' });
        expect(webConfig?.packages).toEqual({ frontend: '*' });
      });
    });

    describe('when packmind.json exists in both ancestors and descendants', () => {
      it('returns all configs without duplicates', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'apps', isDirectory: () => true },
            { name: 'libs', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValueOnce([
            { name: 'api', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          if (filePath === '/project/libs/packmind.json') {
            return JSON.stringify({ packages: { libs: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        // Start from /project/apps/api, so it's an ancestor
        // /project/libs is a descendant from /project root
        const result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );

        expect(result.hasConfigs).toBe(true);
        expect(result.configs).toHaveLength(3);

        const targetPaths = result.configs.map((c) => c.targetPath).sort();
        expect(targetPaths).toEqual(['/', '/apps/api', '/libs']);
      });
    });

    describe('when stopDirectory is null', () => {
      it('uses startDirectory as basePath', async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/home/user/project/packmind.json') {
            return JSON.stringify({ packages: { project: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findAllConfigsInTree(
          '/home/user/project',
          null,
        );

        expect(result.basePath).toBe('/home/user/project');
        expect(result.hasConfigs).toBe(true);
        expect(result.configs[0].targetPath).toBe('/');
      });
    });

    describe('when configs have same packages', () => {
      it('keeps each config separate with its own packages', async () => {
        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'apps', isDirectory: () => true },
          ] as MockDirent[] as never)
          .mockResolvedValue([]);
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { shared: '1.0.0' } });
          }
          if (filePath === '/project/apps/packmind.json') {
            return JSON.stringify({ packages: { shared: '2.0.0' } });
          }
          throw { code: 'ENOENT' };
        });

        const result = await repository.findAllConfigsInTree(
          '/project',
          '/project',
        );

        expect(result.configs).toHaveLength(2);

        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        const appsConfig = result.configs.find((c) => c.targetPath === '/apps');

        expect(rootConfig?.packages).toEqual({ shared: '1.0.0' });
        expect(appsConfig?.packages).toEqual({ shared: '2.0.0' });
      });
    });
  });
});
