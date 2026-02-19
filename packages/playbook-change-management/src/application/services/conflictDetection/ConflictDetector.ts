import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { DiffService } from '../DiffService';

export type ConflictDetector<T extends ChangeProposalType> = (
  cp1: ChangeProposal<T>,
  cp2: ChangeProposal,
  diffService: DiffService,
) => boolean;
