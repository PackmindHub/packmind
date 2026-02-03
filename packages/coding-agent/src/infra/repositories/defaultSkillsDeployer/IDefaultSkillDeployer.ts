import { FileUpdates } from '@packmind/types';

type IntString = `${bigint}`;
type SemVer = `${IntString}.${IntString}.${IntString}`;

export interface ISkillDeployer {
  minimumVersion: SemVer | 'unreleased';
  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
