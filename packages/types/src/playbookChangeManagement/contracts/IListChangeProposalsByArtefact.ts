import { PackageId } from '../../deployments/Package';
import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposal } from '../ChangeProposal';
import { ProposalMergeVerdict } from '../ProposalMergeVerdict';

export const CHANGE_PROPOSAL_LIST_PAGE_SIZE = 20;

export type ListChangeProposalsByArtefactCommand<
  T extends StandardId | CommandId | SkillId,
> = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: T;
  pendingOnly?: boolean;
  page?: number;
};

export type ListChangeProposalsByArtefactResponse = {
  changeProposals: (ChangeProposal & {
    mergeVerdict: ProposalMergeVerdict;
  })[];
  currentPackageIds: PackageId[];
  totalPendingCount: number;
  page: number;
  pageSize: number;
};

export interface IListChangeProposalsByArtefact<
  T extends StandardId | CommandId | SkillId,
> {
  execute: (
    command: ListChangeProposalsByArtefactCommand<T>,
  ) => Promise<ListChangeProposalsByArtefactResponse>;
}
