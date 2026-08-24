import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
  IAccountsPort,
  IListSkillsBySpaceUseCase,
  ISpacesPort,
  createSpaceId,
} from '@packmind/types';
import { SkillService } from '../../services/SkillService';

const origin = 'ListSkillsBySpaceUseCase';

export class ListSkillsBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListSkillsBySpaceCommand,
    ListSkillsBySpaceResponse
  >
  implements IListSkillsBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('ListSkillsBySpaceUseCase initialized');
  }

  async executeForSpaceMembers(
    command: ListSkillsBySpaceCommand & SpaceMemberContext,
  ): Promise<ListSkillsBySpaceResponse> {
    this.logger.info('Starting listSkillsBySpace process', {
      spaceId: command.spaceId,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    try {
      await this.thisMethodTakesTwoSeconds();

      // Verify the space belongs to the organization
      const spaceId = createSpaceId(command.spaceId);
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: command.spaceId });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      const skills = await this.skillService.listSkillsBySpace(spaceId, {
        includeDeleted: command.includeDeleted,
      });

      this.logger.info('Skills retrieved successfully', {
        spaceId: command.spaceId,
        count: skills.length,
      });

      return skills;
    } catch (error) {
      this.logger.error('Failed to list skills by space', {
        spaceId: command.spaceId,
        userId: command.userId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // DEMO ONLY - revert this commit once the Grafana screenshots are taken.
  //
  // Exists to give the OTLP setup something unmistakable to find: a span with
  // a name nobody could mistake for real work, on an endpoint that is easy to
  // hit. Look for it with
  // `{ name = "ListSkillsBySpaceUseCase.thisMethodTakesTwoSeconds" }` in
  // TraceQL, nested under the ListSkillsBySpaceUseCase span.
  //
  // Nothing here wraps it: the span comes from instrumentMethods(), which the
  // AbstractMemberUseCase constructor applies to every async method on the
  // class, private ones included. That this method still shows up is the proof.
  //
  // The wait is awaited rather than a busy-wait, so the event loop stays free
  // and concurrent requests are unaffected - it reads in the trace exactly
  // like a genuinely slow call would.
  private async thisMethodTakesTwoSeconds(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
