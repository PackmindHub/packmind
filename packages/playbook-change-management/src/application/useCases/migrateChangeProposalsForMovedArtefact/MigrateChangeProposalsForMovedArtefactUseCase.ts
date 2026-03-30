import {
  IMigrateChangeProposalsForMovedArtefactUseCase,
  MigrateChangeProposalsForMovedArtefactCommand,
  MigrateChangeProposalsForMovedArtefactResponse,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';

/**
 * Internal use case triggered by PlaybookArtefactMovedEvent — not user-initiated.
 * Implements IUseCase directly (instead of AbstractMemberUseCase) because no
 * membership validation is needed; the operation is a system-level data migration.
 */
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
      ruleMappings: command.ruleMappings,
    });

    return {};
  }
}
