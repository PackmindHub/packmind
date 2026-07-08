import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { SpaceId } from '../../spaces/SpaceId';
import { CommandId } from '../CommandId';
import { Command } from '../Command';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type UpdateCommandFromUICommand = PackmindCommand & {
  recipeId: CommandId;
  name: string;
  content: string;
  summary?: string;
  userId: UserId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
};

export type UpdateCommandFromUIResponse = {
  recipe: Command;
};

export type IUpdateCommandFromUIUseCase = IUseCase<
  UpdateCommandFromUICommand,
  UpdateCommandFromUIResponse
>;
