import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  ICopyDetectionProgramsToNewRule,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  DetectionProgram,
  DetectionProgramId,
  createDetectionProgramId,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
} from '@packmind/types';

const origin = 'CopyDetectionProgramsToNewRuleUseCase';

export class CopyDetectionProgramsToNewRuleUseCase implements ICopyDetectionProgramsToNewRule {
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  async execute(
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse> {
    this.logger.info('Starting to copy detection programs to new rule', {
      oldRuleId: command.oldRuleId,
      newRuleId: command.newRuleId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      // 1. Get all DetectionPrograms for the old rule
      const oldDetectionPrograms = await this.repositories
        .getDetectionProgramRepository()
        .findByRuleId(command.oldRuleId);

      if (oldDetectionPrograms.length === 0) {
        this.logger.info('No detection programs found for old rule', {
          oldRuleId: command.oldRuleId,
        });
        return { copiedProgramsCount: 0 };
      }

      this.logger.debug('Found detection programs to copy', {
        count: oldDetectionPrograms.length,
        oldRuleId: command.oldRuleId,
      });

      // 2. Copy all DetectionPrograms and build mapping
      const oldToNewProgramIdMap = new Map<
        DetectionProgramId,
        DetectionProgramId
      >();

      await Promise.all(
        oldDetectionPrograms.map(async (oldProgram) => {
          const newProgramId = createDetectionProgramId(uuidv4());
          const newProgram: DetectionProgram = {
            ...oldProgram,
            id: newProgramId,
            ruleId: command.newRuleId,
            createdAt: new Date(),
          };

          await this.repositories
            .getDetectionProgramRepository()
            .add(newProgram);

          oldToNewProgramIdMap.set(oldProgram.id, newProgramId);

          this.logger.debug('Copied detection program', {
            oldProgramId: oldProgram.id,
            newProgramId,
            version: oldProgram.version,
            language: oldProgram.language,
          });
        }),
      );

      // 3. Get all ActiveDetectionPrograms for the old rule
      const oldActivePrograms = await this.repositories
        .getActiveDetectionProgramRepository()
        .findByRuleIdWithPrograms(command.oldRuleId);

      if (oldActivePrograms.length === 0) {
        this.logger.info(
          'No active detection programs found for old rule, only copied detection programs',
          {
            oldRuleId: command.oldRuleId,
            copiedProgramsCount: oldDetectionPrograms.length,
          },
        );
        return { copiedProgramsCount: oldDetectionPrograms.length };
      }

      // 4. Copy all ActiveDetectionPrograms with updated references
      await Promise.all(
        oldActivePrograms.map(async (oldActiveProgram) => {
          const newActiveDetectionProgram: ActiveDetectionProgram = {
            id: createActiveDetectionProgramId(uuidv4()),
            ruleId: command.newRuleId,
            language: oldActiveProgram.language,
            detectionProgramVersion: oldActiveProgram.detectionProgramVersion
              ? oldToNewProgramIdMap.get(
                  oldActiveProgram.detectionProgramVersion,
                ) || null
              : null,
            detectionProgramDraftVersion:
              oldActiveProgram.detectionProgramDraftVersion
                ? oldToNewProgramIdMap.get(
                    oldActiveProgram.detectionProgramDraftVersion,
                  ) || null
                : null,
            severity: oldActiveProgram.severity,
          };

          await this.repositories
            .getActiveDetectionProgramRepository()
            .add(newActiveDetectionProgram);

          this.logger.debug('Copied active detection program', {
            oldActiveId: oldActiveProgram.id,
            newActiveId: newActiveDetectionProgram.id,
            language: oldActiveProgram.language,
            hasActiveVersion:
              !!newActiveDetectionProgram.detectionProgramVersion,
            hasDraftVersion:
              !!newActiveDetectionProgram.detectionProgramDraftVersion,
          });
        }),
      );

      this.logger.info('Successfully copied detection programs to new rule', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        copiedProgramsCount: oldDetectionPrograms.length,
        copiedActiveCount: oldActivePrograms.length,
      });

      return { copiedProgramsCount: oldDetectionPrograms.length };
    } catch (error) {
      this.logger.error('Failed to copy detection programs to new rule', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
