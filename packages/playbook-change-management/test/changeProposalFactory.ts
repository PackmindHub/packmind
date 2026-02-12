import { Factory } from '@packmind/test-utils';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createSpaceId,
  createStandardId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const changeProposalFactory: Factory<
  ChangeProposal<ChangeProposalType>
> = (proposal?: Partial<ChangeProposal<ChangeProposalType>>) => {
  return {
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateStandardName,
    artefactId: createStandardId(uuidv4()),
    artefactVersion: 1,
    spaceId: createSpaceId(uuidv4()),
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: createUserId(uuidv4()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...proposal,
  } as ChangeProposal<ChangeProposalType>;
};
