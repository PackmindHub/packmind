import { PackmindLogger, LogLevel } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import { ILinterAstPort, IStandardsPort } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDetectionProgramCommand,
  ICreateDetectionProgram,
  createDetectionProgramId,
  DetectionProgram,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  DetectionSeverity,
} from '@packmind/types';
import { clearConsoleLogFromProgramOutput } from '../generateProgramUseCase/shared/program/ProgramExecutionUtils';

export class CreateDetectionProgramUseCase implements ICreateDetectionProgram {
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly standardsAdapter: IStandardsPort,
    private readonly linterAstPort: ILinterAstPort | null,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'CreateDetectionProgramUseCase',
      LogLevel.INFO,
    ),
  ) {}

  async execute(
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    try {
      // Validate input
      if (!command.code || command.code.trim() === '') {
        throw new Error('Code is required');
      }

      if (!command.language || command.language.trim() === '') {
        throw new Error('Language is required');
      }

      // Validate rule exists and belongs to organization
      const rule = await this.standardsAdapter.getRule(command.ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      // Validate rule belongs to user's organization through StandardVersion -> Standard chain
      const standardVersion = await this.standardsAdapter.getStandardVersion(
        rule.standardVersionId,
      );
      if (!standardVersion) {
        throw new Error('Standard version not found for rule');
      }

      const standard = await this.standardsAdapter.getStandard(
        standardVersion.standardId,
      );
      if (!standard) {
        throw new Error('Standard not found for rule');
      }

      // Note: Space-based validation should be done at a higher level
      // Standards are now scoped to spaces, not organizations

      const existingActiveProgram =
        await this.detectionProgramService.findActiveByRuleIdAndLanguage(
          command.ruleId,
          command.language,
        );

      if (existingActiveProgram) {
        throw new Error(
          'Active detection program already exists for this rule and language',
        );
      }

      // Clean console.log statements from the code before saving
      const cleanedCode = await clearConsoleLogFromProgramOutput(
        command.code,
        this.linterAstPort,
      );

      // Create detection program with version 1 (do not increment)
      const detectionProgram: DetectionProgram = {
        id: createDetectionProgramId(uuidv4()),
        ruleId: command.ruleId,
        code: cleanedCode,
        version: 1,
        mode: command.mode,
        language: command.language,
        status: command.status || DetectionStatus.READY,
        sourceCodeState: command.sourceCodeState ?? 'AST',
        createdAt: new Date(),
      };

      const createdDetectionProgram =
        await this.detectionProgramService.addDetectionProgram(
          detectionProgram,
        );

      // Create new active detection program
      const activeDetectionProgram: ActiveDetectionProgram = {
        id: createActiveDetectionProgramId(uuidv4()),
        detectionProgramVersion: command.mustBeDraftVersion
          ? null
          : createdDetectionProgram.id,
        ruleId: command.ruleId,
        language: command.language,
        detectionProgramDraftVersion: command.mustBeDraftVersion
          ? createdDetectionProgram.id
          : null,
        severity: DetectionSeverity.ERROR,
      };

      await this.detectionProgramService.addActiveDetectionProgram(
        activeDetectionProgram,
      );

      // Publish SSE event for new program creation
      try {
        await SSEEventPublisher.publishProgramStatusEvent(
          createdDetectionProgram.id,
          createdDetectionProgram.ruleId,
          createdDetectionProgram.language,
          command.userId,
          command.organizationId,
        );
        this.logger.info('SSE event published for new program creation', {
          detectionProgramId: createdDetectionProgram.id,
          status: createdDetectionProgram.status,
          userId: command.userId,
        });
      } catch (sseError) {
        this.logger.error('Failed to publish SSE event for new program', {
          detectionProgramId: createdDetectionProgram.id,
          error:
            sseError instanceof Error ? sseError.message : String(sseError),
        });
        // Don't throw here - the main operation was successful
      }

      return createdDetectionProgram;
    } catch (error) {
      this.logger.error('Failed to create detection program', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
