import { StandardsGeneratorService } from './StandardsGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';
import { IExistingDocumentation } from './DocumentationScannerService';

describe('StandardsGeneratorService', () => {
  let service: StandardsGeneratorService;

  beforeEach(() => {
    service = new StandardsGeneratorService();
  });

  const createScanResult = (
    overrides: Partial<IProjectScanResult> = {},
  ): IProjectScanResult => ({
    languages: [],
    frameworks: [],
    tools: [],
    structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
    hasTypeScript: false,
    hasLinting: false,
    ...overrides,
  });

  const createEmptyDocs = (): IExistingDocumentation => ({
    extractedRules: [],
    extractedConventions: [],
    extractedWorkflows: [],
    sourceFiles: [],
  });

  describe('generateStandards', () => {
    it('generates TypeScript standard when TypeScript detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        hasTypeScript: true,
      });

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      expect(standards).toHaveLength(1);
      expect(standards[0].name).toContain('TypeScript');
      expect(standards[0].rules.length).toBeGreaterThan(0);
    });

    it('generates NestJS standard when NestJS detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['NestJS'],
        hasTypeScript: true,
      });

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      const nestjsStandard = standards.find((s) => s.name.includes('NestJS'));
      expect(nestjsStandard).toBeDefined();
      expect(nestjsStandard?.rules.length).toBeGreaterThan(0);
    });

    it('generates React standard when React detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['React'],
        hasTypeScript: true,
      });

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      const reactStandard = standards.find((s) => s.name.includes('React'));
      expect(reactStandard).toBeDefined();
      expect(reactStandard?.rules.length).toBeGreaterThan(0);
    });

    it('generates testing standard when test framework detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        testFramework: 'vitest',
        hasTypeScript: true,
      });

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      const testingStandard = standards.find((s) =>
        s.name.toLowerCase().includes('testing'),
      );
      expect(testingStandard).toBeDefined();
      expect(testingStandard?.rules.length).toBeGreaterThan(0);
    });

    it('generates monorepo standard when monorepo structure detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        structure: { isMonorepo: true, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
      });

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      const monorepoStandard = standards.find((s) =>
        s.name.toLowerCase().includes('monorepo'),
      );
      expect(monorepoStandard).toBeDefined();
      expect(monorepoStandard?.rules.length).toBeGreaterThan(0);
    });

    it('generates standards from extracted documentation rules', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        hasTypeScript: true,
      });

      const existingDocs: IExistingDocumentation = {
        extractedRules: [
          'Use strict mode in TypeScript',
          'Always add tests for new features',
        ],
        extractedConventions: ['Follow conventional commits'],
        extractedWorkflows: [],
        sourceFiles: ['CLAUDE.md'],
      };

      const standards = service.generateStandards(scanResult, existingDocs);

      const extractedStandard = standards.find((s) =>
        s.name.includes('Extracted'),
      );
      expect(extractedStandard).toBeDefined();
      expect(extractedStandard?.rules.length).toBeGreaterThan(0);
    });

    it('limits extracted rules to 15 per standard', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        hasTypeScript: true,
      });

      const manyRules = Array.from(
        { length: 20 },
        (_, i) => `Rule number ${i + 1}`,
      );
      const existingDocs: IExistingDocumentation = {
        extractedRules: manyRules,
        extractedConventions: [],
        extractedWorkflows: [],
        sourceFiles: ['CLAUDE.md'],
      };

      const standards = service.generateStandards(scanResult, existingDocs);

      const extractedStandard = standards.find((s) =>
        s.name.includes('Extracted'),
      );
      expect(extractedStandard?.rules.length).toBeLessThanOrEqual(15);
    });

    it('returns empty array when no languages detected', () => {
      const scanResult = createScanResult();

      const standards = service.generateStandards(
        scanResult,
        createEmptyDocs(),
      );

      expect(standards).toHaveLength(0);
    });
  });
});
