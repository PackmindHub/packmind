import {
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

  it('returns violations for valid detection programs', async () => {
    const logger = stubLogger();

    const useCase = new ExecuteLinterProgramsUseCase(astAdapter, logger);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(ast) { return [1, 3]; }',
          ruleContent: 'rules/interface-rule.js',
          standardSlug: 'interface-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
        },
        {
          code: 'function checkSourceCode(ast) { return [{ line: 5, character: 2 }]; }',
          ruleContent: 'Method rule',
          standardSlug: 'method-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(astAdapter.parseSourceCode).toHaveBeenCalledTimes(1);
    expect(result.violations).toEqual([
      {
        line: 2,
        character: 0,
        rule: 'interface-rule',
        standard: 'interface-standard',
      },
      {
        line: 4,
        character: 0,
        rule: 'interface-rule',
        standard: 'interface-standard',
      },
      {
        line: 6,
        character: 2,
        rule: 'Method rule',
        standard: 'method-standard',
      },
    ]);
  });

  it('skips execution if language is not supported', async () => {
    astAdapter.isLanguageSupported.mockReturnValue(false);
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const result = await useCase.execute(buildCommand());

    expect(result.violations).toHaveLength(0);

    expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
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
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(result.violations).toHaveLength(0);
  });

  it('executes RAW programs without parsing AST', async () => {
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(code) { return code.includes("Sample") ? [1] : []; }',
          ruleContent: 'Raw content rule',
          standardSlug: 'raw-standard',
          sourceCodeState: 'RAW',
          language: ProgrammingLanguage.TYPESCRIPT,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
    expect(result.violations).toEqual([
      {
        line: 2,
        character: 0,
        rule: 'Raw content rule',
        standard: 'raw-standard',
      },
    ]);
  });

  it('executes mixed RAW and AST programs correctly', async () => {
    const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

    const command = buildCommand({
      programs: [
        {
          code: 'function checkSourceCode(code) { return [2]; }',
          ruleContent: 'Raw rule',
          standardSlug: 'raw-standard',
          sourceCodeState: 'RAW',
          language: ProgrammingLanguage.TYPESCRIPT,
        },
        {
          code: 'function checkSourceCode(ast) { return [4]; }',
          ruleContent: 'AST rule',
          standardSlug: 'ast-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
        },
      ],
    });

    const result = await useCase.execute(command);

    expect(astAdapter.parseSourceCode).toHaveBeenCalledTimes(1);
    expect(result.violations).toEqual([
      {
        line: 3,
        character: 0,
        rule: 'Raw rule',
        standard: 'raw-standard',
      },
      {
        line: 5,
        character: 0,
        rule: 'AST rule',
        standard: 'ast-standard',
      },
    ]);
  });

  describe('when only RAW programs exist', () => {
    it('skips AST parsing', async () => {
      const useCase = new ExecuteLinterProgramsUseCase(astAdapter);

      const command = buildCommand({
        programs: [
          {
            code: 'function checkSourceCode(code) { return [1]; }',
            ruleContent: 'Raw rule 1',
            standardSlug: 'raw-standard-1',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
          },
          {
            code: 'function checkSourceCode(code) { return [2]; }',
            ruleContent: 'Raw rule 2',
            standardSlug: 'raw-standard-2',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.TYPESCRIPT,
          },
        ],
      });

      const result = await useCase.execute(command);

      expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
      expect(astAdapter.isLanguageSupported).not.toHaveBeenCalled();
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
        },
        {
          code: 'function checkSourceCode(ast) { return [2]; }',
          ruleContent: 'AST rule',
          standardSlug: 'ast-standard',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
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
      },
    ]);
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
          },
          {
            code: 'function checkSourceCode(code) { return [2]; }',
            ruleContent: 'Python rule',
            standardSlug: 'py-standard',
            sourceCodeState: 'RAW',
            language: ProgrammingLanguage.PYTHON,
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
        },
      ]);
    });

    describe('when no programs match language', () => {
      it('returns empty violations', async () => {
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
            },
          ],
        });

        const result = await useCase.execute(command);

        expect(result.violations).toHaveLength(0);
        expect(astAdapter.parseSourceCode).not.toHaveBeenCalled();
      });
    });
  });
});
