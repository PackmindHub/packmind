import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type GetDashboardKpiCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type ArtifactKpi = {
  total: number;
  active: number;
};

export type DashboardKpiResponse = {
  standards: ArtifactKpi;
  recipes: ArtifactKpi;
  skills: ArtifactKpi;
};

export type IGetDashboardKpi = IUseCase<
  GetDashboardKpiCommand,
  DashboardKpiResponse
>;
