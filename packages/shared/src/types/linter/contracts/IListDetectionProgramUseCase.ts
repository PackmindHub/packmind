import { IUseCase, PackmindCommand } from '@packmind/types';
import { DetectionModeEnum } from '../DetectionProgram';

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
          };
        }[];
      }[];
    }[];
  }[];
};
