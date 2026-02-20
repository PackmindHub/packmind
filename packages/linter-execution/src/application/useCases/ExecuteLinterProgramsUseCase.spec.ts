import {
  DetectionSeverity,
  ExecuteLinterProgramsCommand,
  ILinterAstPort,
  ProgrammingLanguage,
} from '@packmind/types';
import { ExecuteLinterProgramsUseCase } from './ExecuteLinterProgramsUseCase';
import { stubLogger } from '@packmind/test-utils';

const buildCommand = (
  overrides: Partial<ExecuteLinterProgramsCommand> = {},
): ExecuteLinterProgramsCommand => ({
  filePath: 'src/file.ts',
  fileContent: 'interface Sample {}',
  language: ProgrammingLanguage.TYPESCRIPT,
  programs: [
    {
      code: 'function checkSourceCode(ast) { return [1, 2]; }',
      ruleContent: 'Interface naming rule',
      standardSlug: 'naming-standard',
      sourceCodeState: 'AST',
      language: ProgrammingLanguage.TYPESCRIPT,
      severity: DetectionSeverity.ERROR,
    },
  ],
  ...overrides,
});

describe('ExecuteLinterProgramsUseCase', () => {
  let astAdapter: jest.Mocked<ILinterAstPort>;

  beforeEach(() => {
    astAdapter = {
      parseSourceCode: jest.fn(),
      isLanguageSupported: jest.fn().mockReturnValue(true),
      getAvailableLanguages: jest
        .fn()
        .mockResolvedValue([ProgrammingLanguage.TYPESCRIPT]),
    } as unknown as jest.Mocked<ILinterAstPort>;
  });

  describe('when executing valid detection programs', () => {
    const programsConfig = [
      {
        code: 'function checkSourceCode(ast) { return [1, 3]; }',
        ruleContent: 'rules/interface-rule.js',
        standardSlug: 'interface-standard',
        sourceCodeState: 'AST' as const,
        language: ProgrammingLanguage.TYPESCRIPT,
        severity: DetectionSeverity.ERROR,
      },
      {
        code: 'function checkSourceCode(ast) { return [{ line: 5, character: 2 }]; }',
        ruleContent: 'Method rule',
        standardSlug: 'method-standard',
        sourceCodeState: 'AST' as const,
        language: ProgrammingLanguage.TYPESCRIPT,
        severity: DetectionSeverity.ERROR,
      },
    ];

    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      const logger = stubLogger();
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter, logger);
      const command = buildCommand({ programs: programsConfig });
      result = await useCase.execute(command);
    });

    it('parses source code once', () => {
      expect(astAdapter.parseSourceCode).toHaveBeenCalledTimes(1);
    });

    it('returns violations for all detection programs', () => {
      expect(result.violations).toEqual([
        {
          line: 2,
          character: 0,
          rule: 'interface-rule',
          standard: 'interface-standard',
          severity: DetectionSeverity.ERROR,
        },
        {
          line: 4,
          character: 0,
          rule: 'interface-rule',
          standard: 'interface-standard',
          severity: DetectionSeverity.ERROR,
        },
        {
          line: 6,
          character: 2,
          rule: 'Method rule',
          standard: 'method-standard',
          severity: DetectionSeverity.ERROR,
        },
      ]);
    });
  });

  describe('when language is not supported', () => {
    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      astAdapter.isLanguageSupported.mockReturnValue(false);
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);
      result = await useCase.execute(buildCommand());
    });

    it('returns empty violations', () => {
      expect(result.violations).toHaveLength(0);
    });

    it('does not parse source code', () => {
      expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
    });
  });

  it('logs and returns empty violations if parsing fails', async () => {
    astAdapter.parseSourceCode.mockRejectedValue(new Error('parser failure'));
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const result = await useCase.execute(buildCommand());

    expect(result.violations).toHaveLength(0);
  });

  it('logs and skips invalid program results', async () => {
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(ast) { return "invalid"; }',
          ruleContent: 'Rule',
          standardSlug: 'standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
          severity: DetectionSeverity.ERROR,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(result.violations).toHaveLength(0);
  });

  it('logs and skips programs that throw during execution', async () => {
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(ast) { throw new Error("boom"); }',
          ruleContent: 'Explosive rule',
          standardSlug: 'danger-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
          severity: DetectionSeverity.ERROR,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(result.violations).toHaveLength(0);
  });

  describe('when executing RAW programs', () => {
    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);
      const command = buildCommand({
        programs: [
          {
            code: 'function checkSourceCode(code) { return code.includes("Sample") ? [1] : []; }',
            ruleContent: 'Raw content rule',
            standardSlug: 'raw-standard',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
        ],
      });
      result = await useCase.execute(command);
    });

    it('does not parse AST', () => {
      expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
    });

    it('returns violations from raw program execution', () => {
      expect(result.violations).toEqual([
        {
          line: 2,
          character: 0,
          rule: 'Raw content rule',
          standard: 'raw-standard',
          severity: DetectionSeverity.ERROR,
        },
      ]);
    });
  });

  describe('when executing mixed RAW and AST programs', () => {
    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);
      const command = buildCommand({
        programs: [
          {
            code: 'function checkSourceCode(code) { return [2]; }',
            ruleContent: 'Raw rule',
            standardSlug: 'raw-standard',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
          {
            code: 'function checkSourceCode(ast) { return [4]; }',
            ruleContent: 'AST rule',
            standardSlug: 'ast-standard',
            sourceCodeState: 'AST',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
        ],
      });
      result = await useCase.execute(command);
    });

    it('parses source code once for AST programs', () => {
      expect(astAdapter.parseSourceCode).toHaveBeenCalledTimes(1);
    });

    it('returns violations from both RAW and AST programs', () => {
      expect(result.violations).toEqual([
        {
          line: 3,
          character: 0,
          rule: 'Raw rule',
          standard: 'raw-standard',
          severity: DetectionSeverity.ERROR,
        },
        {
          line: 5,
          character: 0,
          rule: 'AST rule',
          standard: 'ast-standard',
          severity: DetectionSeverity.ERROR,
        },
      ]);
    });
  });

  describe('when only RAW programs exist', () => {
    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);
      const command = buildCommand({
        programs: [
          {
            code: 'function checkSourceCode(code) { return [1]; }',
            ruleContent: 'Raw rule 1',
            standardSlug: 'raw-standard-1',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
          {
            code: 'function checkSourceCode(code) { return [2]; }',
            ruleContent: 'Raw rule 2',
            standardSlug: 'raw-standard-2',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
        ],
      });
      result = await useCase.execute(command);
    });

    it('does not parse source code', () => {
      expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
    });

    it('does not check language support', () => {
      expect(astAdapter.isLanguageSupported).not.toHaveBeenCalled();
    });

    it('returns violations from all RAW programs', () => {
      expect(result.violations).toHaveLength(2);
    });
  });

  it('continues with RAW programs even if AST parsing fails', async () => {
    astAdapter.parseSourceCode.mockRejectedValue(new Error('parse error'));
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(code) { return [1]; }',
          ruleContent: 'Raw rule',
          standardSlug: 'raw-standard',
          sourceCodeState: 'RAW',
          language: ProgrammingLanguage.TYPESCRIPT,
          severity: DetectionSeverity.ERROR,
        },
        {
          code: 'function checkSourceCode(ast) { return [2]; }',
          ruleContent: 'AST rule',
          standardSlug: 'ast-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
          severity: DetectionSeverity.ERROR,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(result.violations).toEqual([
      {
        line: 2,
        character: 0,
        rule: 'Raw rule',
        standard: 'raw-standard',
        severity: DetectionSeverity.ERROR,
      },
    ]);
  });

  describe('when program has warning severity', () => {
    let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

    beforeEach(async () => {
      const logger = stubLogger();
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter, logger);
      const command = buildCommand({
        programs: [
          {
            code: 'function checkSourceCode(input) { return [0]; }',
            ruleContent: 'console-log-rule',
            standardSlug: 'logging-standard',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.WARNING,
          },
        ],
      });
      result = await useCase.execute(command);
    });

    it('includes warning severity in violations', () => {
      expect(result.violations).toEqual([
        expect.objectContaining({
          severity: DetectionSeverity.WARNING,
        }),
      ]);
    });
  });

  describe('language filtering', () => {
    it('filters out programs not matching file language', async () => {
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

      const command = buildCommand({
        language: ProgrammingLanguage.TYPESCRIPT,
        programs: [
          {
            code: 'function checkSourceCode(ast) { return [1]; }',
            ruleContent: 'TypeScript rule',
            standardSlug: 'ts-standard',
            sourceCodeState: 'AST',
            language: ProgrammingLanguage.TYPESCRIPT,
            severity: DetectionSeverity.ERROR,
          },
          {
            code: 'function checkSourceCode(code) { return [2]; }',
            ruleContent: 'Python rule',
            standardSlug: 'py-standard',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.PYTHON,
            severity: DetectionSeverity.ERROR,
          },
        ],
      });

      const result = await useCase.execute(command);

      // Program returns [1] → violation at line 2 (0-indexed to 1-indexed conversion)
      expect(result.violations).toEqual([
        {
          line: 2,
          character: 0,
          rule: 'TypeScript rule',
          standard: 'ts-standard',
          severity: DetectionSeverity.ERROR,
        },
      ]);
    });

    describe('when no programs match language', () => {
      let result: Awaited<ReturnType<ExecuteLinterProgramsUseCase['execute']>>;

      beforeEach(async () => {
        const useCase = new ExecuteLinterProgramsUseCase(astAdapter);
        const command = buildCommand({
          language: ProgrammingLanguage.TYPESCRIPT,
          programs: [
            {
              code: 'function checkSourceCode(code) { return [1]; }',
              ruleContent: 'Python rule',
              standardSlug: 'py-standard',
              sourceCodeState: 'RAW',
              language: ProgrammingLanguage.PYTHON,
              severity: DetectionSeverity.ERROR,
            },
          ],
        });
        result = await useCase.execute(command);
      });

      it('returns empty violations', () => {
        expect(result.violations).toHaveLength(0);
      });

      it('does not parse source code', () => {
        expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
      });
    });
  });
});
