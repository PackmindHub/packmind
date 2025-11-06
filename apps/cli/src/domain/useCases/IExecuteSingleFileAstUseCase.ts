import { IPublicUseCase } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';

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
