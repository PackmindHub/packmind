import { AgentType } from '../constants/AgentPaths';

export type IDeleteLocalSkillCommand = {
  baseDirectory: string;
  skillName: string;
  agents?: AgentType[];
};

export type IDeleteLocalSkillResult = {
  deletedPaths: string[];
  notFoundPaths: string[];
  errors: string[];
};

export interface IDeleteLocalSkillUseCase {
  execute(command: IDeleteLocalSkillCommand): Promise<IDeleteLocalSkillResult>;
}
