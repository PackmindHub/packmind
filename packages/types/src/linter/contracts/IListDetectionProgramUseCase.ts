import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionModeEnum, SourceCodeState } from '../DetectionProgram';

export type IListDetectionProgramUseCase = IUseCase<
  ListDetectionProgramCommand,
  ListDetectionProgramResponse
>;

export type ListDetectionProgramCommand = PackmindCommand & {
  gitRemoteUrl: string;
  branches: string[];
};

export type ListDetectionProgramResponse = {
  targets: {
    name: string;
    path: string;
    standards: {
      name: string;
      slug: string;
      scope: string[];
      rules: {
        content: string;
        activeDetectionPrograms: {
          language: string;
          detectionProgram: {
            mode: DetectionModeEnum;
            code: string;
            sourceCodeState: SourceCodeState;
          };
        }[];
      }[];
    }[];
  }[];
};
