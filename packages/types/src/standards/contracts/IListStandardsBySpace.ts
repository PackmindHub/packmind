import { IUseCase } from '../../UseCase';
import { Standard } from '../Standard';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type ListStandardsBySpaceCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  includeDeleted?: boolean;
};

export type ListStandardsBySpaceResponse = {
  standards: Standard[];
};

export type IListStandardsBySpaceUseCase = IUseCase<
  ListStandardsBySpaceCommand,
  ListStandardsBySpaceResponse
>;
