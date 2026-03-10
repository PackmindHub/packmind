export type ArtefactType = 'standard' | 'command' | 'skill';
export type PoolStatus = 'pending' | 'accepted' | 'dismissed';

export interface StubPackage {
  id: string;
  name: string;
}

export interface StubRepository {
  id: string;
  name: string;
}

export interface StubRemovalProposal {
  id: string;
  number: number;
  artefactType: ArtefactType;
  artefactName: string;
  author: string;
  createdAt: string;
  poolStatus: PoolStatus;
  /** Packages the artifact currently belongs to (targets) */
  packageIds: string[];
  /** Repository the artifact was removed from */
  repositoryId: string;
  /** Path within the repository where the artifact is distributed (omit or empty for root) */
  targetPath?: string;
  /** Message from the author explaining why removal is proposed */
  message?: string;
  /** Decision made when accepted (null if pending/dismissed) */
  decision: RemoveArtefactDecision | null;
}

export type RemoveArtefactDecision =
  | { delete: true }
  | { delete: false; removeFromPackages: string[] };

export const ARTEFACT_TYPE_LABEL: Record<ArtefactType, string> = {
  standard: 'Standard',
  command: 'Command',
  skill: 'Skill',
};
