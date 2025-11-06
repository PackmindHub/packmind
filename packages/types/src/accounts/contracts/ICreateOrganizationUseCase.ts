import { IPublicUseCase } from '../../UseCase';
import { Organization } from '../Organization';
import { UserId } from '../User';

export type CreateOrganizationCommand = {
  userId: UserId;
  name: string;
};

export type CreateOrganizationResponse = {
  organization: Organization;
};

export type ICreateOrganizationUseCase = IPublicUseCase<
  CreateOrganizationCommand,
  CreateOrganizationResponse
>;
