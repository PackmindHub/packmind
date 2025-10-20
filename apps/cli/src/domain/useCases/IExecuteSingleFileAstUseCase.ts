import { IPublicUseCase, ProgrammingLanguage } from '@packmind/shared';

export type ExecuteSingleFileAstUseCaseCommand = {
  program: string;
  fileContent: string;
  language: ProgrammingLanguage;
};

export type ExecuteSingleFileAstUseCaseResult = {
  line: number;
  character: number;
}[];

export type IExecuteSingleFileAstUseCase = IPublicUseCase<
  ExecuteSingleFileAstUseCaseCommand,
  ExecuteSingleFileAstUseCaseResult
>;
