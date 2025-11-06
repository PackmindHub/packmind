import { IUseCase } from '@packmind/types';
import { Standard } from '../Standard';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '../../spaces/Space';

export type ListStandardsBySpaceCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type ListStandardsBySpaceResponse = {
  standards: Standard[];
};

export type IListStandardsBySpaceUseCase = IUseCase<
  ListStandardsBySpaceCommand,
  ListStandardsBySpaceResponse
>;
