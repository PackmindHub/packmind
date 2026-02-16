import {
  ArtifactType,
  CodingAgent,
  ChangeProposalType,
  ChangeProposalPayload,
  IPublicUseCase,
} from '@packmind/types';

export type IDiffArtefactsCommand = {
  baseDirectory?: string;
  packagesSlugs: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
  agents?: CodingAgent[];
};

export type ArtefactDiff<T extends ChangeProposalType = ChangeProposalType> = {
  filePath: string;
  type: T;
  payload: ChangeProposalPayload<T>;
  artifactName: string;
  artifactType: ArtifactType;
  artifactId?: string;
  spaceId?: string;
};

export type IDiffArtefactsResult = ArtefactDiff[];

export type IDiffArtefactsUseCase = IPublicUseCase<
  IDiffArtefactsCommand,
  IDiffArtefactsResult
>;
