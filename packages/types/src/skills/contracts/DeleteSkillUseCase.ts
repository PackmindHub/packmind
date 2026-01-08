import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';

export type DeleteSkillCommand = PackmindCommand & {
  skillId: string;
};

export type DeleteSkillResponse = PackmindResult;

export type IDeleteSkillUseCase = IUseCase<
  DeleteSkillCommand,
  DeleteSkillResponse
>;
