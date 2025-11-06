import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionProgramMetadata } from '../DetectionProgramMetadata';
import { DetectionProgramId } from '../DetectionProgram';

export type GetDetectionProgramMetadataCommand = PackmindCommand & {
  detectionProgramId: DetectionProgramId;
};

export type GetDetectionProgramMetadataResponse = {
  metadata: DetectionProgramMetadata | null;
};

export type IGetDetectionProgramMetadata = IUseCase<
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse
>;
