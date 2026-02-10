import {
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  ChangeProposalArtefactId,
  OrganizationId,
} from '@packmind/types';

export interface CreateChangeProposalParams<T extends ChangeProposalType> {
  organizationId: OrganizationId;
  type: T;
  artefactId: ChangeProposalArtefactId<T>;
  payload: ChangeProposalPayload<T>;
  captureMode: ChangeProposalCaptureMode;
}

export interface IChangeProposalsGateway {
  createChangeProposal<T extends ChangeProposalType>(
    params: CreateChangeProposalParams<T>,
  ): Promise<void>;
}
