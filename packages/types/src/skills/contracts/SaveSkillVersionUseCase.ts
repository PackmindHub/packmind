import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillVersion } from '../SkillVersion';

export type SkillVersionInput = Omit<SkillVersion, 'id' | 'version'>;

export type SaveSkillVersionCommand = PackmindCommand & {
  spaceId: SpaceId;
  skillVersion: SkillVersionInput;
};

export type SaveSkillVersionResponse = SkillVersion;

export type ISaveSkillVersionUseCase = IUseCase<
  SaveSkillVersionCommand,
  SaveSkillVersionResponse
>;
