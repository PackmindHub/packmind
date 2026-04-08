import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';
import { SpaceId } from '../../spaces/SpaceId';

export type BrowsableSpace = {
  id: SpaceId;
  name: string;
  type: SpaceType;
};

export type BrowseSpacesCommand = PackmindCommand;

export type BrowseSpacesResponse = {
  mySpaces: Space[];
  allSpaces: BrowsableSpace[];
};

export type IBrowseSpacesUseCase = IUseCase<
  BrowseSpacesCommand,
  BrowseSpacesResponse
>;
