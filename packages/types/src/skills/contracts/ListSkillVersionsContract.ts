import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillId } from '../SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillVersion } from '../SkillVersion';

export type ListSkillVersionsCommand = PackmindCommand & {
  skillId: SkillId;
  spaceId: SpaceId;
};

export type ListSkillVersionsResponse = {
  versions: SkillVersion[];
};

export type IListSkillVersionsUseCase = IUseCase<
  ListSkillVersionsCommand,
  ListSkillVersionsResponse
>;
