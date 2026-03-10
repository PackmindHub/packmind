import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillId } from '../SkillId';

export type DeleteSkillsBatchCommand = PackmindCommand & {
  skillIds: SkillId[];
  spaceId: SpaceId;
};

export type DeleteSkillsBatchResponse = PackmindResult;

export type IDeleteSkillsBatchUseCase = IUseCase<
  DeleteSkillsBatchCommand,
  DeleteSkillsBatchResponse
>;
