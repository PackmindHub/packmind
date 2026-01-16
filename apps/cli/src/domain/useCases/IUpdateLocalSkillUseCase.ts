import { AgentType } from '../constants/AgentPaths';

export type IUpdateLocalSkillCommand = {
  baseDirectory: string;
  skillName: string;
  sourcePath: string;
  agents?: AgentType[];
};

export type IUpdateLocalSkillResult = {
  updatedPaths: string[];
  notFoundPaths: string[];
  filesUpdated: number;
  filesCreated: number;
  filesDeleted: number;
  errors: string[];
};

export interface IUpdateLocalSkillUseCase {
  execute(command: IUpdateLocalSkillCommand): Promise<IUpdateLocalSkillResult>;
}
