import {
  ArtifactType,
  CodingAgent,
  ChangeProposalType,
  ChangeProposalPayload,
  IPublicUseCase,
  TargetId,
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
  targetId?: TargetId;
};

export type IDiffArtefactsResult = ArtefactDiff[];

export type IDiffArtefactsUseCase = IPublicUseCase<
  IDiffArtefactsCommand,
  IDiffArtefactsResult
>;
