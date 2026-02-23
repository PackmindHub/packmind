import { PackmindLogger } from '@packmind/logger';
import { IStandardsPort } from '@packmind/types';
import {
  IExecuteLinterProgramsUseCase,
  LinterExecutionProgram,
  DetectionSeverity,
} from '@packmind/types';
import {
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  ITestProgramExecutionUseCase,
  DetectionProgram,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { UnauthorizedTestProgramExecutionError } from '../../../domain/errors/UnauthorizedTestProgramExecutionError';
import { DetectionProgramNotFoundError } from '../../../domain/errors/DetectionProgramNotFoundError';

const origin = 'TestProgramExecutionUseCase';

export class TestProgramExecutionUseCase implements ITestProgramExecutionUseCase {
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly linterExecutionUseCase: IExecuteLinterProgramsUseCase,
    private readonly standardsAdapter: IStandardsPort | undefined,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    this.logger.info('Testing program execution with sandbox code', {
      detectionProgramId: command.detectionProgramId,
      organizationId: command.organizationId,
      sandboxCodeLength: command.sandboxCode.length,
    });

    try {
      // Fetch detection program
      const detectionProgram = await this.repositories
        .getDetectionProgramRepository()
        .findById(command.detectionProgramId);

      if (!detectionProgram) {
        this.logger.error('Detection program not found', {
          detectionProgramId: command.detectionProgramId,
        });
        throw new DetectionProgramNotFoundError(command.detectionProgramId);
      }

      // Verify program belongs to organization
      await this.verifyOrganizationAccess(
        detectionProgram,
        command.organizationId,
      );

      // Get standard slug and rule content for proper violation reporting
      const { standardSlug, ruleContent } =
        await this.getStandardAndRuleInfo(detectionProgram);

      // Map detection program to linter execution format
      const linterExecutionProgram: LinterExecutionProgram = {
        standardSlug,
        ruleContent,
        code: detectionProgram.code,
        sourceCodeState: detectionProgram.sourceCodeState as 'AST' | 'RAW',
        language: detectionProgram.language,
        severity: DetectionSeverity.ERROR,
      };

      // Execute the program with sandbox code
      const filePath = command.filePath || 'sandbox.test';
      const result = await this.linterExecutionUseCase.execute({
        filePath,
        fileContent: command.sandboxCode,
        language: detectionProgram.language,
        programs: [linterExecutionProgram],
      });

      this.logger.info('Program execution completed successfully', {
        detectionProgramId: command.detectionProgramId,
        violationsCount: result.violations.length,
      });

      return {
        violations: result.violations,
      };
    } catch (error) {
      this.logger.error('Failed to test program execution', {
        detectionProgramId: command.detectionProgramId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async verifyOrganizationAccess(
    detectionProgram: DetectionProgram,
    organizationId: string,
  ): Promise<void> {
    if (!this.standardsAdapter) {
      this.logger.warn(
        'Standards adapter not available, skipping authorization check',
      );
      return;
    }

    try {
      const rule = await this.standardsAdapter.getRule(detectionProgram.ruleId);

      if (!rule) {
        throw new DetectionProgramNotFoundError(detectionProgram.id);
      }

      const standardVersion = await this.standardsAdapter.getStandardVersion(
        rule.standardVersionId,
      );

      if (!standardVersion) {
        throw new DetectionProgramNotFoundError(detectionProgram.id);
      }

      const standard = await this.standardsAdapter.getStandard(
        standardVersion.standardId,
      );

      if (!standard) {
        throw new DetectionProgramNotFoundError(detectionProgram.id);
      }

      // Note: Organization validation should be done at a higher level
      // Standards are now scoped to spaces, not directly to organizations
    } catch (error) {
      if (
        error instanceof DetectionProgramNotFoundError ||
        error instanceof UnauthorizedTestProgramExecutionError
      ) {
        throw error;
      }
      this.logger.error('Failed to verify organization access', {
        detectionProgramId: detectionProgram.id,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getStandardAndRuleInfo(
    detectionProgram: DetectionProgram,
  ): Promise<{ standardSlug: string; ruleContent: string }> {
    if (!this.standardsAdapter) {
      this.logger.warn(
        'Standards adapter not available, using fallback values',
      );
      return {
        standardSlug: 'unknown-standard',
        ruleContent: detectionProgram.ruleId,
      };
    }

    try {
      const rule = await this.standardsAdapter.getRule(detectionProgram.ruleId);

      if (!rule) {
        this.logger.warn('Rule not found, using fallback values');
        return {
          standardSlug: 'unknown-standard',
          ruleContent: detectionProgram.ruleId,
        };
      }

      const standardVersion = await this.standardsAdapter.getStandardVersion(
        rule.standardVersionId,
      );

      if (!standardVersion) {
        this.logger.warn('Standard version not found, using fallback values');
        return {
          standardSlug: 'unknown-standard',
          ruleContent: rule.content,
        };
      }

      const standard = await this.standardsAdapter.getStandard(
        standardVersion.standardId,
      );

      if (!standard) {
        this.logger.warn('Standard not found, using fallback values');
        return {
          standardSlug: 'unknown-standard',
          ruleContent: rule.content,
        };
      }

      return {
        standardSlug: standard.slug,
        ruleContent: rule.content,
      };
    } catch (error) {
      this.logger.warn('Failed to get standard and rule info, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        standardSlug: 'unknown-standard',
        ruleContent: detectionProgram.ruleId,
      };
    }
  }
}
