import { Branded, brandedIdFactory } from '../brandedTypes';

export type ChangeProposalId = Branded<'ChangeProposalId'>;
export const createChangeProposalId = brandedIdFactory<ChangeProposalId>();
