import { IUseCase, PackmindCommand } from '../../UseCase';
import { Organization } from '../Organization';

export type RenameOrganizationCommand = PackmindCommand & {
  name: string;
};

export type RenameOrganizationResponse = {
  organization: Organization;
};

export type IRenameOrganizationUseCase = IUseCase<
  RenameOrganizationCommand,
  RenameOrganizationResponse
>;
