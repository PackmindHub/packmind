import { Organization } from '../entities/Organization';

export type GetOrganizationByNameCommand = {
  name: string;
};

export type GetOrganizationByNameResponse = {
  organization: Organization | null;
};

export interface IGetOrganizationByNameUseCase {
  execute(
    command: GetOrganizationByNameCommand,
  ): Promise<GetOrganizationByNameResponse>;
}
