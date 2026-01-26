import { CommandsGeneratorService } from './CommandsGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';

describe('CommandsGeneratorService', () => {
  let service: CommandsGeneratorService;

  beforeEach(() => {
    service = new CommandsGeneratorService();
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

  describe('generateCommands', () => {
    it('generates NestJS module command when NestJS detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['NestJS'],
        hasTypeScript: true,
      });

      const commands = service.generateCommands(scanResult);

      const nestCommand = commands.find((c) => c.name.includes('NestJS'));
      expect(nestCommand).toBeDefined();
      expect(nestCommand?.steps.length).toBeGreaterThan(0);
    });

    it('generates React component command when React detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        frameworks: ['React'],
        hasTypeScript: true,
      });

      const commands = service.generateCommands(scanResult);

      const reactCommand = commands.find((c) => c.name.includes('React'));
      expect(reactCommand).toBeDefined();
      expect(reactCommand?.steps.length).toBeGreaterThan(0);
    });

    it('generates test command when test framework detected', () => {
      const scanResult = createScanResult({
        languages: ['TypeScript'],
        testFramework: 'vitest',
        hasTypeScript: true,
      });

      const commands = service.generateCommands(scanResult);

      const testCommand = commands.find((c) =>
        c.name.toLowerCase().includes('test'),
      );
      expect(testCommand).toBeDefined();
      expect(testCommand?.steps.length).toBeGreaterThan(0);
    });

    it('returns empty array when no frameworks detected', () => {
      const scanResult = createScanResult();

      const commands = service.generateCommands(scanResult);

      expect(commands).toHaveLength(0);
    });

    describe('command structure', () => {
      it('includes whenToUse array', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          frameworks: ['NestJS'],
          hasTypeScript: true,
        });

        const commands = service.generateCommands(scanResult);

        expect(commands[0].whenToUse).toBeDefined();
        expect(commands[0].whenToUse.length).toBeGreaterThan(0);
      });

      it('includes contextValidationCheckpoints array', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          frameworks: ['NestJS'],
          hasTypeScript: true,
        });

        const commands = service.generateCommands(scanResult);

        expect(commands[0].contextValidationCheckpoints).toBeDefined();
        expect(commands[0].contextValidationCheckpoints.length).toBeGreaterThan(
          0,
        );
      });
    });
  });
});
