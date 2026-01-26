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

    describe('when detecting Python ecosystem', () => {
      it('detects Python language from requirements.txt', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('requirements.txt');
        });
        mockFs.readFileSync.mockReturnValue('');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Python');
      });

      it('detects Django from requirements.txt', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('requirements.txt');
        });
        mockFs.readFileSync.mockReturnValue('django==4.2.0\npytest==7.0.0');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Django');
        expect(result.testFramework).toBe('pytest');
      });

      it('detects Flask and FastAPI from pyproject.toml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('pyproject.toml');
        });
        mockFs.readFileSync.mockReturnValue(
          'flask = "^2.0.0"\nfastapi = "^0.95.0"\npoetry',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Flask');
        expect(result.frameworks).toContain('FastAPI');
        expect(result.tools).toContain('Poetry');
      });

      it('detects Python tools from requirements.txt', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('requirements.txt');
        });
        mockFs.readFileSync.mockReturnValue('pylint\nblack\nmypy');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.tools).toContain('Pylint');
        expect(result.tools).toContain('Black');
        expect(result.tools).toContain('Mypy');
        expect(result.hasLinting).toBe(true);
      });
    });

    describe('when detecting Java ecosystem', () => {
      it('detects Java language from pom.xml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('pom.xml');
        });
        mockFs.readFileSync.mockReturnValue('<project></project>');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Java');
      });

      it('detects Spring Boot from pom.xml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('pom.xml');
        });
        mockFs.readFileSync.mockReturnValue(
          '<dependency><artifactId>spring-boot-starter</artifactId></dependency>',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Spring Boot');
        expect(result.tools).toContain('Maven');
      });

      it('detects Kotlin and frameworks from build.gradle.kts', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('build.gradle.kts');
        });
        mockFs.readFileSync.mockReturnValue(
          'implementation("org.springframework.boot:spring-boot-starter")\nimplementation("io.quarkus:quarkus-core")',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Kotlin');
        expect(result.frameworks).toContain('Spring Boot');
        expect(result.frameworks).toContain('Quarkus');
        expect(result.tools).toContain('Gradle');
      });

      it('detects JUnit from pom.xml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('pom.xml');
        });
        mockFs.readFileSync.mockReturnValue(
          '<dependency><artifactId>junit</artifactId></dependency>',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.testFramework).toBe('JUnit');
      });
    });

    describe('when detecting Go ecosystem', () => {
      it('detects Go language from go.mod', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('go.mod');
        });
        mockFs.readFileSync.mockReturnValue('module example.com/myapp');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Go');
        expect(result.testFramework).toBe('go test');
      });

      it('detects Gin framework from go.mod', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('go.mod');
        });
        mockFs.readFileSync.mockReturnValue(
          'require github.com/gin-gonic/gin v1.9.0',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Gin');
      });

      it('detects Echo and Fiber frameworks from go.mod', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('go.mod');
        });
        mockFs.readFileSync.mockReturnValue(
          'require (\n  github.com/labstack/echo v4.10.0\n  github.com/gofiber/fiber v2.42.0\n)',
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Echo');
        expect(result.frameworks).toContain('Fiber');
      });
    });

    describe('when detecting Rust ecosystem', () => {
      it('detects Rust language from Cargo.toml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Cargo.toml');
        });
        mockFs.readFileSync.mockReturnValue('[package]\nname = "myapp"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Rust');
        expect(result.tools).toContain('Cargo');
      });

      it('detects Actix framework from Cargo.toml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Cargo.toml');
        });
        mockFs.readFileSync.mockReturnValue('actix-web = "4.3.0"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Actix');
      });

      it('detects Rocket and Axum frameworks from Cargo.toml', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Cargo.toml');
        });
        mockFs.readFileSync.mockReturnValue('rocket = "0.5.0"\naxum = "0.6.0"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Rocket');
        expect(result.frameworks).toContain('Axum');
      });
    });

    describe('when detecting PHP ecosystem', () => {
      it('detects PHP language from composer.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('composer.json');
        });
        mockFs.readFileSync.mockReturnValue('{}');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('PHP');
        expect(result.tools).toContain('Composer');
      });

      it('detects Laravel from composer.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('composer.json');
        });
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({
            require: { 'laravel/framework': '^10.0' },
          }),
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Laravel');
      });

      it('detects Symfony and PHPUnit from composer.json', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('composer.json');
        });
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({
            require: { 'symfony/symfony': '^6.0' },
            'require-dev': { 'phpunit/phpunit': '^10.0' },
          }),
        );
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Symfony');
        expect(result.testFramework).toBe('PHPUnit');
      });
    });

    describe('when detecting Ruby ecosystem', () => {
      it('detects Ruby language from Gemfile', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Gemfile');
        });
        mockFs.readFileSync.mockReturnValue('source "https://rubygems.org"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.languages).toContain('Ruby');
        expect(result.tools).toContain('Bundler');
      });

      it('detects Rails from Gemfile', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Gemfile');
        });
        mockFs.readFileSync.mockReturnValue('gem "rails", "~> 7.0"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Rails');
      });

      it('detects Sinatra and RSpec from Gemfile', async () => {
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath.toString().endsWith('Gemfile');
        });
        mockFs.readFileSync.mockReturnValue('gem "sinatra"\ngem "rspec"');
        const service = new ProjectScannerService();

        const result = await service.scanProject('/test-project');

        expect(result.frameworks).toContain('Sinatra');
        expect(result.testFramework).toBe('RSpec');
      });
    });
  });
});
