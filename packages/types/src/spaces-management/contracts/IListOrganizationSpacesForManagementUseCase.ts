import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../../spaces/Space';
import { UserId } from '../../accounts/User';

export const ORGA_SPACE_MANAGEMENT_PAGE_SIZE = 1000;

export type SpaceManagementListItemAdmin = {
  id: UserId;
  displayName: string;
};

export type SpaceManagementListItem = Space & {
  admins: SpaceManagementListItemAdmin[];
  memberIds: UserId[];
  membersCount: number;
  artifactsCount: number;
};

export type ListOrganizationSpacesForManagementCommand = PackmindCommand & {
  page: number;
};

export type ListOrganizationSpacesForManagementResponse = {
  items: SpaceManagementListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type IListOrganizationSpacesForManagementUseCase = IUseCase<
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse
>;
