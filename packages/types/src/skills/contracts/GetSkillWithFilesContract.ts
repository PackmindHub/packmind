import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillWithFiles } from '../SkillWithFiles';

export type GetSkillWithFilesCommand = PackmindCommand & {
  slug: string;
  spaceId: SpaceId;
};

export type GetSkillWithFilesResponse = {
  skillWithFiles: SkillWithFiles | null;
};

export type IGetSkillWithFilesUseCase = IUseCase<
  GetSkillWithFilesCommand,
  GetSkillWithFilesResponse
>;
