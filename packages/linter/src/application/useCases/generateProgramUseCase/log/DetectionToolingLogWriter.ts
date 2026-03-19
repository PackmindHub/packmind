import {
  ExecutionLog,
  ExecutionLogMetadata,
  DETECTION_LOG_MESSAGES,
} from '@packmind/types';
import { IDetectionProgramMetadataRepository } from '../../../../domain/repositories/IDetectionProgramMetadataRepository';
import { DetectionProgramId } from '@packmind/types';
import { TokensUsed } from '@packmind/types';

export default class DetectionToolingLogWriter {
  public static readonly MESSAGES = DETECTION_LOG_MESSAGES;

  private _logs: ExecutionLog[] = [];

  constructor(
    private readonly _programDetectionMetadataRepository: IDetectionProgramMetadataRepository,
    private readonly _detectionProgramId: DetectionProgramId,
  ) {}

  public async addLogsMessage(
    message: string,
    metadata?: ExecutionLogMetadata,
  ): Promise<void> {
    const timestamp = Date.now();
    const log: ExecutionLog = {
      timestamp,
      message: message.replace(/:/g, '-'),
      metadata,
    };
    this._logs.push(log);
    await this._programDetectionMetadataRepository.addLog(
      log,
      this._detectionProgramId,
    );
  }

  // Temporary set in program metadata
  public async updateProgramDescription(programDescription: string) {
    await this._programDetectionMetadataRepository.updateProgramDescription(
      programDescription,
      this._detectionProgramId,
    );
  }

  public async updateTokensUsed(tokens: TokensUsed) {
    await this._programDetectionMetadataRepository.updateTokensUsed(
      tokens,
      this._detectionProgramId,
    );
  }

  get logs(): ExecutionLog[] {
    return this._logs;
  }
}
