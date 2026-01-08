import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
  createSpaceId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { IListSkillsBySpace } from '../../../domain/useCases/IListSkillsBySpace';
import { SkillService } from '../../services/SkillService';

const origin = 'ListSkillsBySpaceUsecase';

export class ListSkillsBySpaceUsecase implements IListSkillsBySpace {
  constructor(
    private readonly skillService: SkillService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListSkillsBySpaceUsecase initialized');
  }

  public async execute(
    command: ListSkillsBySpaceCommand,
  ): Promise<ListSkillsBySpaceResponse> {
    const {
      spaceId: spaceIdString,
      userId: userIdString,
      organizationId: orgIdString,
    } = command;
    const spaceId = createSpaceId(spaceIdString);
    const userId = createUserId(userIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting listSkillsBySpace process', {
      spaceId,
      userId,
      organizationId,
    });

    try {
      const skills = await this.skillService.listSkillsBySpace(spaceId);

      this.logger.info('Skills retrieved successfully', {
        spaceId,
        count: skills.length,
      });

      return skills;
    } catch (error) {
      this.logger.error('Failed to list skills by space', {
        spaceId: spaceIdString,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
