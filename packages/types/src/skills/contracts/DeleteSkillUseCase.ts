import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';

export type DeleteSkillCommand = PackmindCommand & {
  skillId: string;
  spaceId: SpaceId;
};

export type DeleteSkillResponse = PackmindResult;

export type IDeleteSkillUseCase = IUseCase<
  DeleteSkillCommand,
  DeleteSkillResponse
>;
