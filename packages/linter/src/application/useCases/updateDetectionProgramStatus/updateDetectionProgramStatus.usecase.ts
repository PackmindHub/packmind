import { PackmindLogger } from '@packmind/logger';
import { IStandardsPort } from '@packmind/types';
import { DetectionSeverity, DetectionStatus, RuleId } from '@packmind/types';
import {
  IExecuteLinterProgramsUseCase,
  ExecuteLinterProgramsCommand,
  ExecuteLinterProgramsResult,
  LinterExecutionProgram,
  DetectionSeverity,
} from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  UpdateDetectionProgramStatusCommand,
  IUpdateDetectionProgramStatusUseCase,
  UpdateRuleDetectionAssessmentAfterUpdateResponse,
  DetectionProgram,
  ActiveDetectionProgram,
} from '@packmind/types';
import { RuleNotFoundError } from '../../../domain/errors';

const origin = 'UpdateDetectionProgramStatusUseCase';

export class UpdateDetectionProgramStatusUseCase implements IUpdateDetectionProgramStatusUseCase {
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly executeLinterProgramsUseCase: IExecuteLinterProgramsUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    this.logger.info('Updating detection program status', {
      ruleId: command.ruleId,
      language: command.language,
    });

    // Get ActiveDetectionProgram by ruleId and language
    const activeDetectionProgram = await this.repositories
      .getActiveDetectionProgramRepository()
      .findByRuleIdAndLanguage(command.ruleId, command.language);

    if (!activeDetectionProgram) {
      this.logger.info(
        'No active detection program found, skipping validation',
        {
          ruleId: command.ruleId,
          language: command.language,
        },
      );
      return {
        action: 'STATUS_UPDATED',
        message: `0 programs have been updated`,
      };
    }

    // Verify rule exists
    const rule = await this.standardsAdapter.getRule(command.ruleId);
    if (!rule) {
      throw new RuleNotFoundError(command.ruleId);
    }

    // Fetch rule examples and filter by language
    const allRuleExamples = await this.standardsAdapter.getRuleCodeExamples(
      command.ruleId,
    );

    const filteredExamples = allRuleExamples.filter(
      (example) => example.lang === command.language,
    );

    // Collect programs first
    const programsToValidate = await this.collectProgramsToValidate(
      activeDetectionProgram,
    );

    this.logger.info('Programs collected for validation', {
      ruleId: command.ruleId,
      language: command.language,
      programCount: programsToValidate.length,
      hasActiveProgram: !!activeDetectionProgram.detectionProgramVersion,
      hasDraftProgram: !!activeDetectionProgram.detectionProgramDraftVersion,
    });

    // If no examples exist, mark all programs as TO_REVIEW
    if (filteredExamples.length === 0) {
      this.logger.info('No examples found for language', {
        ruleId: command.ruleId,
        language: command.language,
        programCount: programsToValidate.length,
      });
      await this.updateProgramsToReviewDueToMissingExamples(
        programsToValidate,
        command.ruleId,
        command.language,
      );
      return {
        action: 'STATUS_UPDATED',
        message: 'Update status to TO-REVIEW',
      };
    }

    this.logger.info('Starting validation of programs against examples', {
      ruleId: command.ruleId,
      language: command.language,
      programCount: programsToValidate.length,
      exampleCount: filteredExamples.length,
    });

    // Validate all programs in parallel and count updates
    const updateResults = await Promise.all(
      programsToValidate.map((program) =>
        this.validateAndUpdateProgram(program, filteredExamples),
      ),
    );

    const programsUpdated = updateResults.filter((updated) => updated).length;

    this.logger.info('Detection program status update completed', {
      ruleId: command.ruleId,
      language: command.language,
      programCount: programsToValidate.length,
      programsUpdated,
    });

    return {
      action: 'STATUS_UPDATED',
      message: `${programsUpdated} successfully updated`,
    };
  }

  public async collectProgramsToValidate(
    activeDetectionProgram: ActiveDetectionProgram,
  ): Promise<DetectionProgram[]> {
    const programsToValidate: DetectionProgram[] = [];

    if (activeDetectionProgram.detectionProgramVersion) {
      const activeProgram = await this.repositories
        .getDetectionProgramRepository()
        .findById(activeDetectionProgram.detectionProgramVersion);

      if (activeProgram) {
        programsToValidate.push(activeProgram);
      }
    }

    if (activeDetectionProgram.detectionProgramDraftVersion) {
      const draftProgram = await this.repositories
        .getDetectionProgramRepository()
        .findById(activeDetectionProgram.detectionProgramDraftVersion);

      if (draftProgram) {
        programsToValidate.push(draftProgram);
      }
    }

    return programsToValidate;
  }

  public async updateProgramsToReviewDueToMissingExamples(
    programs: DetectionProgram[],
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<void> {
    this.logger.info(
      'No examples found for language, marking programs as TO_REVIEW',
      {
        ruleId,
        language,
        programCount: programs.length,
      },
    );

    await Promise.all(
      programs.map((program) => this.updateProgramToReview(program)),
    );

    this.logger.info('Programs marked as TO_REVIEW due to missing examples', {
      ruleId,
      language,
    });
  }

  private async validateAndUpdateProgram(
    program: DetectionProgram,
    examples: Array<{ positive: string; negative: string }>,
  ): Promise<boolean> {
    this.logger.info('Validating detection program', {
      programId: program.id,
      ruleId: program.ruleId,
      language: program.language,
      version: program.version,
      sourceCodeState: program.sourceCodeState,
      currentStatus: program.status,
    });

    // Skip programs with sourceCodeState 'NONE'
    if (program.sourceCodeState === 'NONE') {
      this.logger.info('Skipping program with sourceCodeState NONE', {
        programId: program.id,
        ruleId: program.ruleId,
      });
      return false;
    }

    this.logger.info('Checking negative examples', {
      programId: program.id,
      exampleCount: examples.length,
    });

    const negativeValidationFailed = await this.checkNegativeExamples(
      program,
      examples,
    );

    if (negativeValidationFailed) {
      this.logger.info(
        'Negative validation failed, marking program as TO_REVIEW',
        {
          programId: program.id,
          ruleId: program.ruleId,
        },
      );
      await this.updateProgramToReview(program);
      return true;
    }

    this.logger.info(
      'Negative examples validated successfully, checking positive examples',
      {
        programId: program.id,
      },
    );

    const positiveValidationFailed = await this.checkPositiveExamples(
      program,
      examples,
    );

    if (positiveValidationFailed) {
      this.logger.info(
        'Positive validation failed, marking program as TO_REVIEW',
        {
          programId: program.id,
          ruleId: program.ruleId,
        },
      );
      await this.updateProgramToReview(program);
      return true;
    }

    this.logger.info('Program validation completed successfully', {
      programId: program.id,
      ruleId: program.ruleId,
      status: 'VALID',
    });

    await this.updateProgramToSuccess(program);
    return true;
  }

  private async checkNegativeExamples(
    program: DetectionProgram,
    examples: Array<{ positive: string; negative: string }>,
  ): Promise<boolean> {
    return this.checkExamples(
      program,
      examples,
      'negative',
      'validation-negative-example',
      (violations) => violations.length === 0,
    );
  }

  private async checkPositiveExamples(
    program: DetectionProgram,
    examples: Array<{ positive: string; negative: string }>,
  ): Promise<boolean> {
    return this.checkExamples(
      program,
      examples,
      'positive',
      'validation-positive-example',
      (violations) => violations.length > 0,
    );
  }

  private async checkExamples(
    program: DetectionProgram,
    examples: Array<{ positive: string; negative: string }>,
    exampleType: 'positive' | 'negative',
    filePath: string,
    shouldFail: (violations: unknown[]) => boolean,
  ): Promise<boolean> {
    this.logger.info(`Checking ${exampleType} examples`, {
      programId: program.id,
      exampleCount: examples.length,
      exampleType,
    });

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      const content = example[exampleType];
      const result = await this.executeProgram(program, content, filePath);

      if (shouldFail(result.violations)) {
        this.logger.info(`${exampleType} example validation failed`, {
          programId: program.id,
          exampleIndex: i + 1,
          expectedViolations: exampleType === 'negative',
          foundViolations: result.violations.length > 0,
          violationCount: result.violations.length,
        });
        return true;
      }
    }

    this.logger.info(`All ${exampleType} examples passed validation`, {
      programId: program.id,
      exampleCount: examples.length,
      exampleType,
    });

    return false;
  }

  private async executeProgram(
    program: DetectionProgram,
    fileContent: string,
    filePath: string,
  ): Promise<ExecuteLinterProgramsResult> {
    const command: ExecuteLinterProgramsCommand = {
      filePath,
      fileContent,
      language: program.language,
      programs: [this.createLinterExecutionProgram(program)],
    };

    return await this.executeLinterProgramsUseCase.execute(command);
  }

  private async updateProgramToReview(
    program: DetectionProgram,
  ): Promise<void> {
    this.logger.info('Updating program status to TO_REVIEW', {
      programId: program.id,
      ruleId: program.ruleId,
      language: program.language,
      currentStatus: program.status,
      newStatus: DetectionStatus.TO_REVIEW,
    });

    await this.repositories
      .getDetectionProgramRepository()
      .updateStatus(program.id, DetectionStatus.TO_REVIEW);

    this.logger.info('Program status updated to TO_REVIEW successfully', {
      programId: program.id,
      ruleId: program.ruleId,
    });
  }

  private async updateProgramToSuccess(
    program: DetectionProgram,
  ): Promise<void> {
    this.logger.info('Updating program status to SUCCESS', {
      programId: program.id,
      ruleId: program.ruleId,
      language: program.language,
      currentStatus: program.status,
      newStatus: DetectionStatus.READY,
    });

    await this.repositories
      .getDetectionProgramRepository()
      .updateStatus(program.id, DetectionStatus.READY);

    this.logger.info('Program status updated to SUCCESS successfully', {
      programId: program.id,
      ruleId: program.ruleId,
    });
  }

  private createLinterExecutionProgram(
    program: DetectionProgram,
  ): LinterExecutionProgram {
    return {
      standardSlug: 'validation-standard',
      ruleContent: 'validation-rule',
      code: program.code,
      sourceCodeState: program.sourceCodeState as 'AST' | 'RAW',
      language: program.language,
      severity: DetectionSeverity.ERROR,
    };
  }
}
