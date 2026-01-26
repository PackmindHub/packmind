import { SkillsGeneratorService } from './SkillsGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';

describe('SkillsGeneratorService', () => {
  let service: SkillsGeneratorService;

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
    it('generates debugging skill when testing framework detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        testFramework: 'vitest',
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult);

      expect(skills.length).toBeGreaterThan(0);
      const debugSkill = skills.find((s) => s.name.includes('debugging'));
      expect(debugSkill).toBeDefined();
    });

    it('generates NestJS debugging skill when NestJS detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['NestJS'],
        hasTypeScript: true,
      });

      const skills = service.generateSkills(scanResult);

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

      const skills = service.generateSkills(scanResult);

      const monorepoSkill = skills.find((s) => s.name.includes('monorepo'));
      expect(monorepoSkill).toBeDefined();
      expect(monorepoSkill?.prompt).toBeDefined();
    });

    it('returns empty array when no relevant features detected', () => {
      const scanResult = createScanResult();

      const skills = service.generateSkills(scanResult);

      expect(skills).toHaveLength(0);
    });

    describe('skill structure', () => {
      it('includes name, description, and prompt', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          testFramework: 'vitest',
          hasTypeScript: true,
        });

        const skills = service.generateSkills(scanResult);

        expect(skills[0].name).toBeDefined();
        expect(skills[0].description).toBeDefined();
        expect(skills[0].prompt).toBeDefined();
        expect(skills[0].prompt.length).toBeGreaterThan(50);
      });
    });
  });
});
