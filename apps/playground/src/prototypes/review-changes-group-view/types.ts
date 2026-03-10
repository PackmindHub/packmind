export type ArtefactType = 'standard' | 'command' | 'skill';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';
export type ReviewMode = 'artifact' | 'group';

export interface StubProposal {
  id: string;
  field: string;
  summary: string;
  status: ProposalStatus;
  type: 'add' | 'update' | 'delete';
  /** For skills: file path this proposal belongs to */
  filePath?: string;
}

export interface StubGroupArtefact {
  id: string;
  name: string;
  artefactType: ArtefactType;
  proposals: StubProposal[];
}

export interface StubGroup {
  id: string;
  message: string;
  author: string;
  createdAt: string;
  artefacts: StubGroupArtefact[];
}

export const ARTEFACT_TYPE_LABEL: Record<ArtefactType, string> = {
  standard: 'Standard',
  command: 'Command',
  skill: 'Skill',
};
