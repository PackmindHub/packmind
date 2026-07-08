import { PackageId } from '../../deployments/Package';
import { CommandId } from '../../commands/CommandId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';

export type ListChangeProposalsByArtefactCommand<
  T extends StandardId | CommandId | SkillId,
> = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: T;
  pendingOnly?: boolean;
};

export type ListChangeProposalsByArtefactResponse = {
  changeProposals: (ChangeProposal & {
    conflictsWith: ChangeProposalId[];
  })[];
  currentPackageIds: PackageId[];
};

export interface IListChangeProposalsByArtefact<
  T extends StandardId | CommandId | SkillId,
> {
  execute: (
    command: ListChangeProposalsByArtefactCommand<T>,
  ) => Promise<ListChangeProposalsByArtefactResponse>;
}
