import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import { ILinterPort, PlaybookArtefactMovedEvent } from '@packmind/types';

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
    } = event.payload;
    this.logger.info('Handling PlaybookArtefactMovedEvent', {
      artifactType,
      oldArtifactId,
      newArtifactId,
      sourceSpaceId,
      destinationSpaceId,
    });
  };
}
