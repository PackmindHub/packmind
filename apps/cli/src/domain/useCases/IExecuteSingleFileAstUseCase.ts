import { IPublicUseCase } from '@packmind/shared';

export type ExecuteSingleFileAstUseCaseCommand = {
  program: string;
  fileContent: string;
};

export type ExecuteSingleFileAstUseCaseResult = {
  line: number;
  character: number;
}[];

export type IExecuteSingleFileAstUseCase = IPublicUseCase<
  ExecuteSingleFileAstUseCaseCommand,
  ExecuteSingleFileAstUseCaseResult
>;
