import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListSkillVersionsUseCase,
  ListSkillVersionsCommand,
  ListSkillVersionsResponse,
} from '@packmind/types';
import { ISkillRepository } from '../../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../../domain/repositories/ISkillVersionRepository';

const origin = 'ListSkillVersionsUsecase';

export class ListSkillVersionsUsecase
  extends AbstractMemberUseCase<
    ListSkillVersionsCommand,
    ListSkillVersionsResponse
  >
  implements IListSkillVersionsUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly skillRepository: ISkillRepository,
    private readonly skillVersionRepository: ISkillVersionRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListSkillVersionsCommand & MemberContext,
  ): Promise<ListSkillVersionsResponse> {
    const { skillId, spaceId } = command;

    try {
      this.logger.info('Listing skill versions', { skillId, spaceId });

      const skill = await this.skillRepository.findById(skillId);

      if (!skill) {
        this.logger.info('Skill not found', { skillId });
        return { versions: [] };
      }

      if (skill.spaceId !== spaceId) {
        this.logger.info('Skill does not belong to space', {
          skillId,
          skillSpaceId: skill.spaceId,
          requestedSpaceId: spaceId,
        });
        return { versions: [] };
      }

      const versions = await this.skillVersionRepository.findBySkillId(skillId);

      this.logger.info('Skill versions retrieved successfully', {
        skillId,
        versionCount: versions.length,
      });

      return { versions };
    } catch (error) {
      this.logger.error('Failed to list skill versions', {
        skillId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
