import {
  Gateway,
  IDeployDefaultSkillsUseCase,
  IListSkillsBySpaceUseCase,
  IUploadSkillUseCase,
} from '@packmind/types';

export type ListedSkill = {
  id: string;
  slug: string;
  name: string;
};

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  getDefaults: Gateway<IDeployDefaultSkillsUseCase>;
  list: Gateway<IListSkillsBySpaceUseCase>;
  getBySlug(slug: string): Promise<ListedSkill | null>;
}
