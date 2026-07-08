import { IUseCase } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Command } from '../Command';
import { CommandId } from '../CommandId';
import { SpaceId } from '../../spaces/SpaceId';

export type GetCommandByIdCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  recipeId: CommandId;
};

export type GetCommandByIdResponse = {
  recipe: Command | null;
};

export type IGetCommandByIdUseCase = IUseCase<
  GetCommandByIdCommand,
  GetCommandByIdResponse
>;
