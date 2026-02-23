import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillVersion } from '../SkillVersion';
import { SkillFile } from '../SkillFile';

export type SkillVersionInput = Omit<SkillVersion, 'id' | 'version'> & {
  files: Omit<SkillFile, 'id' | 'skillVersionId'>[];
};

export type SaveSkillVersionCommand = PackmindCommand & {
  spaceId: SpaceId;
  skillVersion: SkillVersionInput;
};

export type SaveSkillVersionResponse = SkillVersion;

export type ISaveSkillVersionUseCase = IUseCase<
  SaveSkillVersionCommand,
  SaveSkillVersionResponse
>;
