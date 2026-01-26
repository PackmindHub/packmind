import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { SkillId } from '../SkillId';

export type DeleteSkillsBatchCommand = PackmindCommand & {
  skillIds: SkillId[];
};

export type DeleteSkillsBatchResponse = PackmindResult;

export type IDeleteSkillsBatchUseCase = IUseCase<
  DeleteSkillsBatchCommand,
  DeleteSkillsBatchResponse
>;
