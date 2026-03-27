import {
  IMigrateChangeProposalsForMovedArtefactUseCase,
  MigrateChangeProposalsForMovedArtefactCommand,
  MigrateChangeProposalsForMovedArtefactResponse,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

export class MigrateChangeProposalsForMovedArtefactUseCase implements IMigrateChangeProposalsForMovedArtefactUseCase {
  constructor(private readonly changeProposalService: ChangeProposalService) {}

  async execute(
    command: MigrateChangeProposalsForMovedArtefactCommand,
  ): Promise<MigrateChangeProposalsForMovedArtefactResponse> {
    await this.changeProposalService.migrateProposalsForMovedArtefact({
      sourceSpaceId: command.sourceSpaceId,
      destinationSpaceId: command.destinationSpaceId,
      oldArtefactId: command.oldArtefactId,
      newArtefactId: command.newArtefactId,
    });

    return {};
  }
}
