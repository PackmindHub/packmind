import { ExecutionLog, ExecutionLogMetadata } from '@packmind/types';
import { IDetectionProgramMetadataRepository } from '../../../../domain/repositories/IDetectionProgramMetadataRepository';
import { DetectionProgramId } from '@packmind/types';
import { TokensUsed } from '@packmind/types';

export default class DetectionToolingLogWriter {
  public static readonly MESSAGES: { [key: string]: string } = {
    AI_AGENT_STRATEGY_ASSESSMENT: 'AI_AGENT_STRATEGY_ASSESSMENT',
    AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART:
      'AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART',
    AI_AGENT_RESULT_SUCCESS: 'AI_AGENT_RESULT_SUCCESS',
    AI_AGENT_CRASH_RESTART: 'AI_AGENT_CRASH_RESTART',

    AI_AGENT_PROGRAM_GENERATION_STARTED: 'AI_AGENT_PROGRAM_GENERATION_STARTED',
    AI_AGENT_NEW_PROGRAM_UNDER_TEST: 'AI_AGENT_NEW_PROGRAM_UNDER_TEST',
    AI_AGENT_PROGRAM_DEBUGGING: 'AI_AGENT_PROGRAM_DEBUGGING',
    AI_AGENT_PROGRAM_SUCCESSFUL: 'AI_AGENT_PROGRAM_SUCCESSFUL',
    AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES:
      'AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES',
    AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES:
      'AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES',

    AI_AGENT_RUN_TEST: 'AI_AGENT_RUN_TEST',
    AI_AGENT_RUN_TEST_NO_NAME: 'AI_AGENT_RUN_TEST_NO_NAME',

    AI_AGENT_TIMEOUT: 'AI_AGENT_TIMEOUT',
  };

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

  public async updateDetectionHeuristics(detectionHeuristics: string[]) {
    await this._programDetectionMetadataRepository.updateDetectionHeuristics(
      detectionHeuristics,
      this._detectionProgramId,
    );
  }

  get logs(): ExecutionLog[] {
    return this._logs;
  }
}
