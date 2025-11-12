import { PackmindLogger } from '@packmind/logger';
import { OrganizationProvider, UserProvider } from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse,
  IGetRuleDetectionAssessment,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'GetRuleDetectionAssessmentUseCase';

export class GetRuleDetectionAssessmentUseCase
  extends AbstractMemberUseCase<
    GetRuleDetectionAssessmentCommand,
    GetRuleDetectionAssessmentResponse
  >
  implements IGetRuleDetectionAssessment
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
  }

  protected async executeForMembers(
    command: GetRuleDetectionAssessmentCommand & MemberContext,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    this.logger.info('Getting rule detection assessment', {
      ruleId: command.ruleId,
      language: command.language,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const assessment = await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .get(command.ruleId, command.language);

      if (assessment) {
        this.logger.info('Successfully retrieved rule detection assessment', {
          ruleId: command.ruleId,
          language: command.language,
          assessmentId: assessment.id,
          status: assessment.status,
        });
      } else {
        this.logger.info('No rule detection assessment found', {
          ruleId: command.ruleId,
          language: command.language,
        });
      }

      return { assessment };
    } catch (error) {
      this.logger.error('Failed to get rule detection assessment', {
        ruleId: command.ruleId,
        language: command.language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
