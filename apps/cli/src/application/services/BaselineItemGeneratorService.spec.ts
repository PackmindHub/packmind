import { BaselineItemGeneratorService } from './BaselineItemGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';

describe('BaselineItemGeneratorService', () => {
  let service: BaselineItemGeneratorService;

  beforeEach(() => {
    service = new BaselineItemGeneratorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createScanResult = (
    overrides: Partial<IProjectScanResult> = {},
  ): IProjectScanResult => ({
    languages: [],
    frameworks: [],
    tools: [],
    structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: false },
    testFramework: undefined,
    packageManager: undefined,
    hasTypeScript: false,
    hasLinting: false,
    detectedFiles: [],
    detectedDirectories: [],
    ...overrides,
  });

  describe('generateBaselineItems', () => {
    describe('when TypeScript is detected', () => {
      it('generates a high-confidence TypeScript baseline item with verified evidence', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          detectedFiles: ['tsconfig.json', 'package.json'],
        });

        const items = service.generateBaselineItems(scanResult);

        const tsItem = items.find((i) => i.label === 'Uses TypeScript');
        expect(tsItem).toBeDefined();
        expect(tsItem?.type).toBe('tooling');
        expect(tsItem?.confidence).toBe('high');
        expect(tsItem?.evidence).toEqual(['tsconfig.json']);
      });
    });

    describe('evidence filtering', () => {
      it('only includes files that exist in detectedFiles', () => {
        const scanResult = createScanResult({
          languages: ['Python'],
          detectedFiles: ['pyproject.toml'], // Only pyproject.toml exists
        });

        const items = service.generateBaselineItems(scanResult);

        const pythonItem = items.find((i) => i.label === 'Uses Python');
        expect(pythonItem?.evidence).toEqual(['pyproject.toml']);
        expect(pythonItem?.evidence).not.toContain('requirements.txt');
        expect(pythonItem?.evidence).not.toContain('setup.py');
      });

      it('excludes items with no valid evidence', () => {
        const scanResult = createScanResult({
          hasLinting: true,
          detectedFiles: ['package.json'], // No eslint config files
        });

        const items = service.generateBaselineItems(scanResult);

        const eslintItem = items.find((i) => i.label.includes('ESLint'));
        expect(eslintItem).toBeUndefined();
      });
    });

    describe('when generating items', () => {
      it('caps at 10 items maximum', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript', 'JavaScript', 'Python'],
          frameworks: ['NestJS', 'React', 'Express'],
          tools: ['ESLint', 'Prettier', 'Nx'],
          structure: {
            isMonorepo: true,
            hasTests: true,
            hasSrcDirectory: true,
          },
          testFramework: 'jest',
          packageManager: 'npm',
          hasTypeScript: true,
          hasLinting: true,
          detectedFiles: [
            'tsconfig.json',
            'package.json',
            'pyproject.toml',
            'nx.json',
            '.eslintrc.js',
            '.prettierrc',
            'package-lock.json',
            'jest.config.js',
          ],
          detectedDirectories: ['packages', 'apps', 'test', 'src'],
        });

        const items = service.generateBaselineItems(scanResult);

        expect(items.length).toBeLessThanOrEqual(10);
      });

      it('generates stable IDs for consistent reruns', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          detectedFiles: ['tsconfig.json'],
        });

        const items1 = service.generateBaselineItems(scanResult);
        const items2 = service.generateBaselineItems(scanResult);

        expect(items1[0].id).toBe(items2[0].id);
      });
    });

    describe('when monorepo structure is detected', () => {
      it('includes verified directory evidence', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          structure: {
            isMonorepo: true,
            hasTests: false,
            hasSrcDirectory: false,
          },
          detectedFiles: ['tsconfig.json', 'nx.json'],
          detectedDirectories: ['packages', 'apps'],
        });

        const items = service.generateBaselineItems(scanResult);

        const monorepoItem = items.find((i) => i.label.includes('Monorepo'));
        expect(monorepoItem).toBeDefined();
        expect(monorepoItem?.evidence).toContain('packages/');
        expect(monorepoItem?.evidence).toContain('apps/');
      });
    });
  });
});
