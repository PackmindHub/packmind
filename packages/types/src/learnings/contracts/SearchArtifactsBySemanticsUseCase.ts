import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardVersion } from '../../standards/StandardVersion';
import { RecipeVersion } from '../../recipes/RecipeVersion';

export type SearchArtifactsBySemanticsCommand = PackmindCommand & {
  spaceId: SpaceId;
  queryText: string;
  threshold?: number;
};

export type ArtifactWithSimilarity<T> = T & {
  similarity: number;
};

export type SearchArtifactsBySemanticsResponse = {
  standards: Array<ArtifactWithSimilarity<StandardVersion>>;
  recipes: Array<ArtifactWithSimilarity<RecipeVersion>>;
};

export type ISearchArtifactsBySemanticsUseCase = IUseCase<
  SearchArtifactsBySemanticsCommand,
  SearchArtifactsBySemanticsResponse
>;
