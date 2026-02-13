import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
} from '@packmind/types';
import { ChangeProposalNotFoundError } from '../../domain/errors/ChangeProposalNotFoundError';
import { ChangeProposalNotPendingError } from '../../domain/errors/ChangeProposalNotPendingError';
import { ChangeProposalService } from '../services/ChangeProposalService';

export async function findPendingById(
  service: ChangeProposalService,
  changeProposalId: ChangeProposalId,
): Promise<ChangeProposal<ChangeProposalType>> {
  const proposal = await service.findById(changeProposalId);

  if (!proposal) {
    throw new ChangeProposalNotFoundError(changeProposalId);
  }

  if (proposal.status !== ChangeProposalStatus.pending) {
    throw new ChangeProposalNotPendingError(changeProposalId, proposal.status);
  }

  return proposal;
}
