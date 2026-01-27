import { SkillsGeneratorService } from './SkillsGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';

describe('SkillsGeneratorService', () => {
  let service: SkillsGeneratorService;
  const testProjectPath = '/test/my-project';

  beforeEach(() => {
    service = new SkillsGeneratorService();
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

  describe('generateSkills', () => {
    it('generates project overview skill with project name', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['React'],
        tools: ['ESLint'],
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const overviewSkill = skills.find((s) =>
        s.name.includes('my-project-overview'),
      );
      expect(overviewSkill).toBeDefined();
      expect(overviewSkill?.description).toContain('my-project');
      expect(overviewSkill?.prompt).toContain('TypeScript');
      expect(overviewSkill?.prompt).toContain('React');
    });

    it('includes tools in project overview', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        tools: ['ESLint', 'Prettier'],
        testFramework: 'jest',
        packageManager: 'npm',
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const overviewSkill = skills.find((s) => s.name.includes('overview'));
      expect(overviewSkill?.prompt).toContain('ESLint');
      expect(overviewSkill?.prompt).toContain('Prettier');
      expect(overviewSkill?.prompt).toContain('jest');
      expect(overviewSkill?.prompt).toContain('npm');
    });

    it('includes architecture info in project overview', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const overviewSkill = skills.find((s) => s.name.includes('overview'));
      expect(overviewSkill?.prompt).toContain('Monorepo');
      expect(overviewSkill?.prompt).toContain('src/');
    });

    it('generates debugging skill when testing framework detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        testFramework: 'vitest',
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const debugSkill = skills.find((s) => s.name.includes('debugging'));
      expect(debugSkill).toBeDefined();
    });

    it('generates NestJS debugging skill when NestJS detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['NestJS'],
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const nestjsSkill = skills.find((s) => s.name.includes('nestjs'));
      expect(nestjsSkill).toBeDefined();
      expect(nestjsSkill?.prompt).toBeDefined();
    });

    it('generates monorepo navigation skill when monorepo detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        structure: { isMonorepo: true, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult, testProjectPath);

      const monorepoSkill = skills.find((s) => s.name.includes('monorepo'));
      expect(monorepoSkill).toBeDefined();
      expect(monorepoSkill?.prompt).toBeDefined();
    });

    it('always generates at least the project overview skill', () => {
      const scanResult = createScanResult();

      const skills = service.generateSkills(scanResult, testProjectPath);

      expect(skills.length).toBeGreaterThanOrEqual(1);
      expect(skills[0].name).toContain('overview');
    });

    describe('skill structure', () => {
      it('includes name, description, and prompt', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          testFramework: 'vitest',
          hasTypeScript: true,
        });

        const skills = service.generateSkills(scanResult, testProjectPath);

        expect(skills[0].name).toBeDefined();
        expect(skills[0].description).toBeDefined();
        expect(skills[0].prompt).toBeDefined();
        expect(skills[0].prompt.length).toBeGreaterThan(50);
      });
    });
  });
});
