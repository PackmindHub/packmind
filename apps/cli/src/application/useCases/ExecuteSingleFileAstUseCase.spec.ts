import {
  IExecuteLinterProgramsUseCase,
  ProgrammingLanguage,
} from '@packmind/types';
import { ExecuteSingleFileAstUseCase } from './ExecuteSingleFileAstUseCase';

describe('ExecuteSingleFileAstUseCase', () => {
  it('delegates execution to the linter execution use case', async () => {
    const mockLinterExecutionUseCase = {
      execute: jest.fn().mockResolvedValue({
        file: 'cli-single-file',
        violations: [
          { line: 5, character: 0, rule: 'rule', standard: 'standard' },
        ],
      }),
    } as unknown as jest.Mocked<IExecuteLinterProgramsUseCase>;

    const useCase = new ExecuteSingleFileAstUseCase(mockLinterExecutionUseCase);

    const result = await useCase.execute({
      program: 'function checkSourceCode(ast) { return [5]; }',
      fileContent: 'interface Sample {}',
      language: ProgrammingLanguage.TYPESCRIPT,
    });

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
        },
      ],
    });
    expect(result).toEqual([{ line: 5, character: 0 }]);
  });
});
