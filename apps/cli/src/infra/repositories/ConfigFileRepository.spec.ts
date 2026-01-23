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
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        result = await repository.readHierarchicalConfig(
          '/project/apps/api/src',
          '/project',
        );
      });

      it('returns hasConfigs as false', () => {
        expect(result.hasConfigs).toBe(false);
      });

      it('returns empty configPaths', () => {
        expect(result.configPaths).toHaveLength(0);
      });

      it('returns empty packages', () => {
        expect(Object.keys(result.packages)).toHaveLength(0);
      });
    });

    describe('when single packmind.json exists at root', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns packages from root config', () => {
        expect(result.packages).toEqual({ generic: '*' });
      });

      it('includes root config path', () => {
        expect(result.configPaths).toContain('/project/packmind.json');
      });
    });

    describe('when single packmind.json exists in subdirectory', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns packages from subdirectory config', () => {
        expect(result.packages).toEqual({ backend: '*' });
      });

      it('returns only subdirectory config path', () => {
        expect(result.configPaths).toEqual(['/project/apps/api/packmind.json']);
      });
    });

    describe('when multiple packmind.json files exist', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.readHierarchicalConfig(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('merges packages from all configs', () => {
        expect(result.packages).toEqual({ generic: '*', backend: '*' });
      });

      it('returns both config paths', () => {
        expect(result.configPaths).toHaveLength(2);
      });
    });

    describe('when multiple configs have same package slug', () => {
      it('gives precedence to deeper config', async () => {
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
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { only: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.readHierarchicalConfig(
          '/project',
          '/project',
        );
      });

      it('returns packages from that directory', () => {
        expect(result.packages).toEqual({ only: '*' });
      });

      it('returns single config path', () => {
        expect(result.configPaths).toHaveLength(1);
      });
    });

    describe('when config file has malformed JSON', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;
      let consoleWarnSpy: jest.SpyInstance;

      beforeEach(async () => {
        consoleWarnSpy = jest
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
        result = await repository.readHierarchicalConfig(
          '/project',
          '/project',
        );
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });

      it('returns hasConfigs as false', () => {
        expect(result.hasConfigs).toBe(false);
      });

      it('returns empty configPaths', () => {
        expect(result.configPaths).toHaveLength(0);
      });

      it('logs warning only once', () => {
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });

      it('logs warning with config path', () => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('/project/packmind.json'),
        );
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
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['readHierarchicalConfig']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/home/user/packmind.json') {
            return JSON.stringify({ packages: { home: '*' } });
          }
          if (filePath === '/home/user/project/packmind.json') {
            return JSON.stringify({ packages: { project: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.readHierarchicalConfig(
          '/home/user/project',
          null,
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('merges packages from all configs up to root', () => {
        expect(result.packages).toEqual({ home: '*', project: '*' });
      });

      it('includes project config path', () => {
        expect(result.configPaths).toContain(
          '/home/user/project/packmind.json',
        );
      });

      it('includes home config path', () => {
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
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findDescendantConfigs']>
      >;
      let result: ResultType;

      beforeEach(async () => {
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

        result = await repository.findDescendantConfigs('/project');
      });

      it('includes apps directory', () => {
        expect(result).toContain('/project/apps');
      });

      it('includes nested api directory', () => {
        expect(result).toContain('/project/apps/api');
      });

      it('includes packages directory', () => {
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
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findDescendantConfigs']>
      >;
      let result: ResultType;
      let consoleWarnSpy: jest.SpyInstance;

      beforeEach(async () => {
        consoleWarnSpy = jest
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

        result = await repository.findDescendantConfigs('/project');
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });

      it('returns only valid config paths', () => {
        expect(result).toEqual(['/project/valid']);
      });

      it('logs warning for malformed config', () => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('/project/invalid/packmind.json'),
        );
      });
    });
  });

  describe('findAllConfigsInTree', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue([]);
    });

    describe('when no packmind.json exists anywhere', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as false', () => {
        expect(result.hasConfigs).toBe(false);
      });

      it('returns empty configs array', () => {
        expect(result.configs).toHaveLength(0);
      });

      it('returns basePath as stopDirectory', () => {
        expect(result.basePath).toBe('/project');
      });
    });

    describe('when packmind.json exists only at root', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns single config', () => {
        expect(result.configs).toHaveLength(1);
      });

      it('returns root config with correct properties', () => {
        expect(result.configs[0]).toEqual({
          targetPath: '/',
          absoluteTargetPath: '/project',
          packages: { generic: '*' },
        });
      });
    });

    describe('when packmind.json exists in ancestor directories', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/project/packmind.json') {
            return JSON.stringify({ packages: { generic: '*' } });
          }
          if (filePath === '/project/apps/api/packmind.json') {
            return JSON.stringify({ packages: { backend: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns both configs', () => {
        expect(result.configs).toHaveLength(2);
      });

      it('returns root config with correct properties', () => {
        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        expect(rootConfig).toEqual({
          targetPath: '/',
          absoluteTargetPath: '/project',
          packages: { generic: '*' },
        });
      });

      it('returns api config with correct properties', () => {
        const apiConfig = result.configs.find(
          (c) => c.targetPath === '/apps/api',
        );
        expect(apiConfig).toEqual({
          targetPath: '/apps/api',
          absoluteTargetPath: '/project/apps/api',
          packages: { backend: '*' },
        });
      });
    });

    describe('when packmind.json exists in descendant directories', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
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

        result = await repository.findAllConfigsInTree('/project', '/project');
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns three configs', () => {
        expect(result.configs).toHaveLength(3);
      });

      it('returns root config with correct packages', () => {
        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        expect(rootConfig?.packages).toEqual({ generic: '*' });
      });

      it('returns api config with correct packages', () => {
        const apiConfig = result.configs.find(
          (c) => c.targetPath === '/apps/api',
        );
        expect(apiConfig?.packages).toEqual({ backend: '*' });
      });

      it('returns web config with correct packages', () => {
        const webConfig = result.configs.find(
          (c) => c.targetPath === '/apps/web',
        );
        expect(webConfig?.packages).toEqual({ frontend: '*' });
      });
    });

    describe('when packmind.json exists in both ancestors and descendants', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
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
        result = await repository.findAllConfigsInTree(
          '/project/apps/api',
          '/project',
        );
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns three configs', () => {
        expect(result.configs).toHaveLength(3);
      });

      it('returns all expected target paths', () => {
        const targetPaths = result.configs.map((c) => c.targetPath).sort();
        expect(targetPaths).toEqual(['/', '/apps/api', '/libs']);
      });
    });

    describe('when stopDirectory is null', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
        mockFs.readFile.mockImplementation(async (filePath: unknown) => {
          if (filePath === '/home/user/project/packmind.json') {
            return JSON.stringify({ packages: { project: '*' } });
          }
          throw { code: 'ENOENT' };
        });

        result = await repository.findAllConfigsInTree(
          '/home/user/project',
          null,
        );
      });

      it('uses startDirectory as basePath', () => {
        expect(result.basePath).toBe('/home/user/project');
      });

      it('returns hasConfigs as true', () => {
        expect(result.hasConfigs).toBe(true);
      });

      it('returns config with root target path', () => {
        expect(result.configs[0].targetPath).toBe('/');
      });
    });

    describe('when configs have same packages', () => {
      type ResultType = Awaited<
        ReturnType<ConfigFileRepository['findAllConfigsInTree']>
      >;
      let result: ResultType;

      beforeEach(async () => {
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

        result = await repository.findAllConfigsInTree('/project', '/project');
      });

      it('returns two configs', () => {
        expect(result.configs).toHaveLength(2);
      });

      it('keeps root config with its own package version', () => {
        const rootConfig = result.configs.find((c) => c.targetPath === '/');
        expect(rootConfig?.packages).toEqual({ shared: '1.0.0' });
      });

      it('keeps apps config with its own package version', () => {
        const appsConfig = result.configs.find((c) => c.targetPath === '/apps');
        expect(appsConfig?.packages).toEqual({ shared: '2.0.0' });
      });
    });
  });
});
