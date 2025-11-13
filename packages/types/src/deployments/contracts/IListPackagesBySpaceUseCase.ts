import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Package } from '../Package';
import { SpaceId } from '../../spaces/SpaceId';

export type ListPackagesBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  organizationId: OrganizationId;
};

export type ListPackagesBySpaceResponse = {
  packages: Package[];
};

export type IListPackagesBySpaceUseCase = IUseCase<
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse
>;
