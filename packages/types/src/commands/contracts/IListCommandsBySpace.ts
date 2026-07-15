import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Command } from '../Command';
import { SpaceId } from '../../spaces/SpaceId';

export type ListCommandsBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  organizationId: OrganizationId;
  includeDeleted?: boolean;
};

export type ListCommandsBySpaceResponse = {
  recipes: Command[];
};

export type IListCommandsBySpaceUseCase = IUseCase<
  ListCommandsBySpaceCommand,
  ListCommandsBySpaceResponse
>;
