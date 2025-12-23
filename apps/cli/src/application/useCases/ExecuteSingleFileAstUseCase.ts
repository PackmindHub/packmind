import {
  ExecuteSingleFileAstUseCaseCommand,
  ExecuteSingleFileAstUseCaseResult,
  IExecuteSingleFileAstUseCase,
} from '../../domain/useCases/IExecuteSingleFileAstUseCase';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';

export class ExecuteSingleFileAstUseCase implements IExecuteSingleFileAstUseCase {
  private static readonly fallbackStandardSlug = 'adhoc-linter';
  private static readonly fallbackRuleContent = 'adhoc-rule';

  constructor(
    private readonly linterExecutionUseCase: IExecuteLinterProgramsUseCase,
  ) {}

  public async execute(
    command: ExecuteSingleFileAstUseCaseCommand,
  ): Promise<ExecuteSingleFileAstUseCaseResult> {
    const { program, fileContent, language } = command;

    const result = await this.linterExecutionUseCase.execute({
      filePath: 'cli-single-file',
      fileContent,
      language,
      programs: [
        {
          code: program,
          ruleContent: ExecuteSingleFileAstUseCase.fallbackRuleContent,
          standardSlug: ExecuteSingleFileAstUseCase.fallbackStandardSlug,
          sourceCodeState: 'AST',
          language,
        },
      ],
    });

    return result.violations.map(({ line, character }) => ({
      line,
      character,
    }));
  }
}
