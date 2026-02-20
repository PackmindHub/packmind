import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionSeverity } from '../ActiveDetectionProgram';
import { DetectionModeEnum, SourceCodeState } from '../DetectionProgram';

export type IGetDetectionProgramsForPackagesUseCase = IUseCase<
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse
>;

export type GetDetectionProgramsForPackagesCommand = PackmindCommand & {
  packagesSlugs: string[];
};

export type GetDetectionProgramsForPackagesResponse = {
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
          severity: DetectionSeverity;
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
