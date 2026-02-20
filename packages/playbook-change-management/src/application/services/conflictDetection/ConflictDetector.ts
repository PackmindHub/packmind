import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { DiffService } from '../DiffService';

export type ConflictDetector<
  T1 extends ChangeProposalType,
  T2 extends ChangeProposalType = ChangeProposalType,
> = (
  cp1: ChangeProposal<T1>,
  cp2: ChangeProposal<T2>,
  diffService: DiffService,
) => boolean;
