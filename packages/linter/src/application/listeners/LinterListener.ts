import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  createRuleId,
  ILinterPort,
  PlaybookArtefactMovedEvent,
} from '@packmind/types';

const origin = 'LinterListener';

export class LinterListener extends PackmindListener<ILinterPort> {
  constructor(
    adapter: ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(
      PlaybookArtefactMovedEvent,
      this.handlePlaybookArtefactMoved,
    );
  }

  private handlePlaybookArtefactMoved = async (
    event: PlaybookArtefactMovedEvent,
  ): Promise<void> => {
    const {
      artifactType,
      oldArtifactId,
      newArtifactId,
      sourceSpaceId,
      destinationSpaceId,
      ruleMappings,
    } = event.payload;

    this.logger.info('Handling PlaybookArtefactMovedEvent', {
      artifactType,
      oldArtifactId,
      newArtifactId,
      sourceSpaceId,
      destinationSpaceId,
      ruleMappingsCount: ruleMappings?.length ?? 0,
    });

    if (artifactType !== 'standard' || !ruleMappings?.length) {
      return;
    }

    await this.adapter.dispatchMoveLinterArtefactsToNewRules({
      ruleMappings: ruleMappings.map((m) => ({
        oldRuleId: createRuleId(m.oldRuleId),
        newRuleId: createRuleId(m.newRuleId),
      })),
      userId: event.payload.userId,
      organizationId: event.payload.organizationId,
    });
  };
}
