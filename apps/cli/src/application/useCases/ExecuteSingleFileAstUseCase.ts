import {
  ExecuteSingleFileAstUseCaseCommand,
  ExecuteSingleFileAstUseCaseResult,
  IExecuteSingleFileAstUseCase,
} from '../../domain/useCases/IExecuteSingleFileAstUseCase';
import { AstExecutorService } from '../services/AstExecutorService';

export class ExecuteSingleFileAstUseCase
  implements IExecuteSingleFileAstUseCase
{
  constructor(
    private readonly astExecutorService: AstExecutorService = new AstExecutorService(),
  ) {}

  public async execute(
    command: ExecuteSingleFileAstUseCaseCommand,
  ): Promise<ExecuteSingleFileAstUseCaseResult> {
    const { program, fileContent } = command;

    return this.astExecutorService.executeProgram(program, fileContent);
  }
}
