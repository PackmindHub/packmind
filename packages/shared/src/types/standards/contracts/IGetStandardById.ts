import { IUseCase } from '@packmind/types';
import { Standard, StandardId } from '../Standard';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '../../spaces/Space';

export type GetStandardByIdCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  standardId: StandardId;
};

export type GetStandardByIdResponse = {
  standard: Standard | null;
};

export type IGetStandardByIdUseCase = IUseCase<
  GetStandardByIdCommand,
  GetStandardByIdResponse
>;
