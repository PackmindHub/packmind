import { IUseCase } from '../../UseCase';
import { Recipe } from '../Recipe';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/Space';

export type ListRecipesBySpaceCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type ListRecipesBySpaceResponse = {
  recipes: Recipe[];
};

export type IListRecipesBySpaceUseCase = IUseCase<
  ListRecipesBySpaceCommand,
  ListRecipesBySpaceResponse
>;
