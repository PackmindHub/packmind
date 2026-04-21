import { IRepository } from '@packmind/types';
import { QueryOption, TokensUsed } from '@packmind/types';
import type {
  DetectionProgramId,
  DetectionProgramMetadata,
  ExecutionLog,
} from '@packmind/types';

export interface IDetectionProgramMetadataRepository extends IRepository<DetectionProgramMetadata> {
  findByDetectionProgramId(
    detectionProgramId: DetectionProgramId,
    opts?: QueryOption,
  ): Promise<DetectionProgramMetadata | null>;

  findByDetectionProgramIds(
    detectionProgramIds: DetectionProgramId[],
  ): Promise<DetectionProgramMetadata[]>;

  addLog(
    log: ExecutionLog,
    detectionProgramId: DetectionProgramId,
  ): Promise<void>;

  updateProgramDescription(
    programDescription: string,
    detectionProgramId: DetectionProgramId,
  ): Promise<void>;

  updateTokensUsed(
    tokens: TokensUsed,
    detectionProgramId: DetectionProgramId,
  ): Promise<void>;

  softDeleteByDetectionProgramIds(
    detectionProgramIds: DetectionProgramId[],
  ): Promise<void>;
}
