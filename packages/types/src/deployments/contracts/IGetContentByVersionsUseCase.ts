import { IUseCase, PackmindCommand } from '../../UseCase';
import { IPullContentResponse } from './IPullContentUseCase';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { ArtifactType } from '../FileUpdates';

export type ArtifactVersionEntry = {
  name: string;
  type: ArtifactType;
  id: string;
  version: number;
  spaceId: string;
};

export type GetContentByVersionsCommand = PackmindCommand & {
  artifacts: ArtifactVersionEntry[];
  agents?: CodingAgent[];
};

export type GetContentByVersionsResponse = IPullContentResponse;

export type IGetContentByVersionsUseCase = IUseCase<
  GetContentByVersionsCommand,
  GetContentByVersionsResponse
>;
