import {
  Gateway,
  IListChangeProposalsByArtefact,
  IListChangeProposalsBySpace,
  RecipeId,
} from '@packmind/types';
import { PackmindHttpClient } from './PackmindHttpClient';

export interface IChangeProposalGateway {
  listBySpace: Gateway<IListChangeProposalsBySpace>;
  listChangeProposalsByRecipe: Gateway<
    IListChangeProposalsByArtefact<RecipeId>
  >;
}

export class ChangeProposalGateway implements IChangeProposalGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  listBySpace: Gateway<IListChangeProposalsBySpace> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/grouped`,
    );
  };

  listChangeProposalsByRecipe: Gateway<
    IListChangeProposalsByArtefact<RecipeId>
  > = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes/${command.artefactId}/change-proposals`,
    );
  };
}
