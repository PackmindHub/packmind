import { mockInterface } from '@packmind/test-utils';
import {
  DetectionSeverity,
  IExecuteLinterProgramsUseCase,
  ProgrammingLanguage,
} from '@packmind/types';
import { ExecuteSingleFileAstUseCase } from './ExecuteSingleFileAstUseCase';

describe('ExecuteSingleFileAstUseCase', () => {
  let mockLinterExecutionUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let useCase: ExecuteSingleFileAstUseCase;
  let result: Awaited<ReturnType<ExecuteSingleFileAstUseCase['execute']>>;

  beforeEach(async () => {
    mockLinterExecutionUseCase = mockInterface<IExecuteLinterProgramsUseCase>();
    mockLinterExecutionUseCase.execute.mockResolvedValue({
      file: 'cli-single-file',
      violations: [
        {
          line: 5,
          character: 0,
          rule: 'rule',
          standard: 'standard',
          severity: DetectionSeverity.ERROR,
        },
      ],
    });

    useCase = new ExecuteSingleFileAstUseCase(mockLinterExecutionUseCase);

    result = await useCase.execute({
      program: 'function checkSourceCode(ast) { return [5]; }',
      fileContent: 'interface Sample {}',
      language: ProgrammingLanguage.TYPESCRIPT,
    });
  });

  it('delegates execution to the linter execution use case', () => {
    expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith({
      filePath: 'cli-single-file',
      fileContent: 'interface Sample {}',
      language: ProgrammingLanguage.TYPESCRIPT,
      programs: [
        {
          code: 'function checkSourceCode(ast) { return [5]; }',
          ruleContent: 'adhoc-rule',
          standardSlug: 'adhoc-linter',
          sourceCodeState: 'AST',
          language: ProgrammingLanguage.TYPESCRIPT,
          severity: DetectionSeverity.ERROR,
        },
      ],
    });
  });

  it('returns violations with line and character', () => {
    expect(result).toEqual([{ line: 5, character: 0 }]);
  });
});
