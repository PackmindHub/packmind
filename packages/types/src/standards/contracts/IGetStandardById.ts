import { IUseCase } from '../../UseCase';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

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
