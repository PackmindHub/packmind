import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Recipe } from '../Recipe';
import { SpaceId } from '../../spaces/SpaceId';

export type ListRecipesBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  organizationId: OrganizationId;
  includeDeleted?: boolean;
};

export type ListRecipesBySpaceResponse = {
  recipes: Recipe[];
};

export type IListRecipesBySpaceUseCase = IUseCase<
  ListRecipesBySpaceCommand,
  ListRecipesBySpaceResponse
>;
