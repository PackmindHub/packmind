import { PackmindLogger } from '@packmind/logger';
import {
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  IGetDetectionProgramMetadata,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'GetDetectionProgramMetadataUseCase';

export class GetDetectionProgramMetadataUseCase
  implements IGetDetectionProgramMetadata
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    this.logger.info('Getting detection program metadata', {
      detectionProgramId: command.detectionProgramId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const metadata = await this.linterRepositories
        .getDetectionProgramMetadataRepository()
        .findByDetectionProgramId(command.detectionProgramId);

      if (!metadata) {
        this.logger.info('No metadata found for detection program', {
          detectionProgramId: command.detectionProgramId,
        });
        return { metadata: null };
      }

      this.logger.info('Successfully retrieved detection program metadata', {
        detectionProgramId: command.detectionProgramId,
        metadataId: metadata.id,
      });

      return { metadata };
    } catch (error) {
      this.logger.error('Failed to get detection program metadata', {
        detectionProgramId: command.detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
