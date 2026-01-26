import * as fs from 'fs';
import { ProjectScannerService } from './ProjectScannerService';

jest.mock('fs');

describe('ProjectScannerService', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scanProject', () => {
    describe('when detecting TypeScript', () => {
      it('detects TypeScript from tsconfig.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('tsconfig.json');
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('TypeScript');
        expect(result.hasTypeScript).toBe(true);
      });

      it('returns false for hasTypeScript when tsconfig.json is missing', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('package.json');
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.hasTypeScript).toBe(false);
      });
    });

    describe('when detecting frameworks', () => {
      describe('when NestJS is present', () => {
        it('detects NestJS from package.json', async () => {
          mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
            return filePath.toString().endsWith('package.json');
          });
          mockFs.readFileSync.mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
              if (filePath.toString().endsWith('package.json')) {
                return JSON.stringify({
                  dependencies: { '@nestjs/core': '^10.0.0' },
                });
              }
              return '{}';
            },
          );
          const service = new ProjectScannerService();

          const result = await service.scanProject('/test-project');

          expect(result.frameworks).toContain('NestJS');
        });
      });

      describe('when React is present', () => {
        it('detects React from package.json', async () => {
          mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
            return filePath.toString().endsWith('package.json');
          });
          mockFs.readFileSync.mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
              if (filePath.toString().endsWith('package.json')) {
                return JSON.stringify({
                  dependencies: { react: '^18.0.0' },
                });
              }
              return '{}';
            },
          );
          const service = new ProjectScannerService();

          const result = await service.scanProject('/test-project');

          expect(result.frameworks).toContain('React');
        });
      });
    });

    describe('when detecting monorepo structure', () => {
      it('detects monorepo from packages directory', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('packages') || pathStr.endsWith('package.json')
          );
        });
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.structure.isMonorepo).toBe(true);
      });

      it('detects monorepo from apps directory', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return pathStr.endsWith('apps') || pathStr.endsWith('package.json');
        });
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.structure.isMonorepo).toBe(true);
      });
    });

    describe('when detecting test framework', () => {
      it('detects Vitest from package.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('package.json');
        });
        mockFs.readFileSync.mockImplementation(
          (filePath: fs.PathOrFileDescriptor) => {
            if (filePath.toString().endsWith('package.json')) {
              return JSON.stringify({
                devDependencies: { vitest: '^1.0.0' },
              });
            }
            return '{}';
          },
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.testFramework).toBe('vitest');
      });

      it('detects Jest from package.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('package.json');
        });
        mockFs.readFileSync.mockImplementation(
          (filePath: fs.PathOrFileDescriptor) => {
            if (filePath.toString().endsWith('package.json')) {
              return JSON.stringify({
                devDependencies: { jest: '^29.0.0' },
              });
            }
            return '{}';
          },
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.testFramework).toBe('jest');
      });
    });

    describe('when detecting package manager', () => {
      it('detects pnpm from pnpm-lock.yaml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('pnpm-lock.yaml') ||
            pathStr.endsWith('package.json')
          );
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.packageManager).toBe('pnpm');
      });

      it('detects yarn from yarn.lock', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('yarn.lock') || pathStr.endsWith('package.json')
          );
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.packageManager).toBe('yarn');
      });

      it('detects npm from package-lock.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('package-lock.json') ||
            pathStr.endsWith('package.json')
          );
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.packageManager).toBe('npm');
      });
    });

    describe('when detecting tools', () => {
      it('detects ESLint from package.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('package.json');
        });
        mockFs.readFileSync.mockImplementation(
          (filePath: fs.PathOrFileDescriptor) => {
            if (filePath.toString().endsWith('package.json')) {
              return JSON.stringify({
                devDependencies: { eslint: '^8.0.0' },
              });
            }
            return '{}';
          },
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.tools).toContain('ESLint');
        expect(result.hasLinting).toBe(true);
      });

      it('detects Nx from nx.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('nx.json') || pathStr.endsWith('package.json')
          );
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.tools).toContain('Nx');
      });

      it('returns false for hasLinting when ESLint is not detected', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('package.json');
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.hasLinting).toBe(false);
      });
    });

    describe('when detecting structure details', () => {
      it('detects src directory', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return pathStr.endsWith('src') || pathStr.endsWith('package.json');
        });
        mockFs.statSync.mockImplementation((filePath: fs.PathLike) => {
          if (filePath.toString().endsWith('src')) {
            return { isDirectory: () => true } as fs.Stats;
          }
          return { isDirectory: () => false } as fs.Stats;
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.structure.hasSrcDirectory).toBe(true);
      });

      it('detects test files', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const pathStr = filePath.toString();
          return (
            pathStr.endsWith('test') ||
            pathStr.endsWith('tests') ||
            pathStr.endsWith('__tests__') ||
            pathStr.endsWith('package.json')
          );
        });
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.structure.hasTests).toBe(true);
      });
    });
  });
});
