import {
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  ChangeProposalArtefactId,
  OrganizationId,
  SpaceId,
  IListChangeProposalsBySpace,
  NewGateway,
} from '@packmind/types';

export interface CreateChangeProposalParams<T extends ChangeProposalType> {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  type: T;
  artefactId: ChangeProposalArtefactId<T>;
  payload: ChangeProposalPayload<T>;
  captureMode: ChangeProposalCaptureMode;
}

export interface IChangeProposalsGateway {
  getGroupedChangeProposals: NewGateway<IListChangeProposalsBySpace>;

  createChangeProposal<T extends ChangeProposalType>(
    params: CreateChangeProposalParams<T>,
  ): Promise<void>;
}
