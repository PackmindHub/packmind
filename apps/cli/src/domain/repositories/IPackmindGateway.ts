import { Gateway, IUseCase, PackmindCommand } from '@packmind/shared';

// Waiting for the standards hexa to expose the use case
export type ListDetectionProgramsCommand = PackmindCommand & {
  gitRemoteUrl: string;
};
export type ListDetectionProgramsResult = {
  standards: {
    name: string;
    slug: string;
    scope: string[];
    rules: {
      content: string;
      activeDetectionPrograms: {
        language: string;
        detectionProgram: {
          mode: string;
          code: string;
        };
      }[];
    }[];
  }[];
};

export type ListDetectionPrograms = IUseCase<
  ListDetectionProgramsCommand,
  ListDetectionProgramsResult
>;

export interface IPackmindGateway {
  listExecutionPrograms: Gateway<ListDetectionPrograms>;
}
