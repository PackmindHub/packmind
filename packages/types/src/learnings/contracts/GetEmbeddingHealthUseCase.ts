import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';

export type GetEmbeddingHealthCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type GetEmbeddingHealthResponse = {
  totalStandards: number;
  embeddedStandards: number;
  totalRecipes: number;
  embeddedRecipes: number;
  coveragePercent: number;
};

export type IGetEmbeddingHealthUseCase = IUseCase<
  GetEmbeddingHealthCommand,
  GetEmbeddingHealthResponse
>;
