import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type GetDashboardNonLiveCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type NonLiveArtifact = {
  id: string;
  name: string;
};

export type NonLiveSkillArtifact = NonLiveArtifact & {
  slug: string;
};

export type DashboardNonLiveResponse = {
  standards: NonLiveArtifact[];
  recipes: NonLiveArtifact[];
  skills: NonLiveSkillArtifact[];
};

export type IGetDashboardNonLive = IUseCase<
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse
>;
