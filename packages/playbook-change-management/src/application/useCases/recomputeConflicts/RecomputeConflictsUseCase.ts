import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  IAccountsPort,
  ISpacesPort,
  IRecomputeConflictsUseCase,
  RecomputeConflictsCommand,
  RecomputeConflictsResponse,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ConflictDetectionService } from '../../services/ConflictDetectionService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

const origin = 'RecomputeConflictsUseCase';

export class RecomputeConflictsUseCase
  extends AbstractMemberUseCase<
    RecomputeConflictsCommand,
    RecomputeConflictsResponse
  >
  implements IRecomputeConflictsUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    private readonly conflictDetectionService: ConflictDetectionService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: RecomputeConflictsCommand & MemberContext,
  ): Promise<RecomputeConflictsResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const allProposals = await this.service.findProposalsByArtefact(
      command.spaceId,
      command.artefactId,
    );

    const pendingProposals = allProposals.filter(
      (p) => p.status === ChangeProposalStatus.pending,
    );

    const proposalsWithDecisions = pendingProposals.map((p) => {
      const decision = command.decisions[p.id];
      if (decision) {
        // The ChangeProposal discriminated union constrains pending proposals to `decision: null`.
        // We temporarily set decision for conflict computation only (not persisted).
        // Safe because conflict detectors read `decision ?? payload` without inspecting `status`.
        return {
          ...p,
          decision,
        } as unknown as ChangeProposal<ChangeProposalType>;
      }
      return p;
    });

    const enrichedProposals = this.conflictDetectionService.detectConflicts(
      proposalsWithDecisions,
    );

    const conflicts: Record<ChangeProposalId, ChangeProposalId[]> = {};
    for (const proposal of enrichedProposals) {
      conflicts[proposal.id] = proposal.conflictsWith;
    }

    return { conflicts };
  }
}
