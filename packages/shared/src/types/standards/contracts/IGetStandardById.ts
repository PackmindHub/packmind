import { IUseCase } from '../../UseCase';
import { Standard, StandardId } from '../Standard';
import { OrganizationId } from '../../accounts/Organization';
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
