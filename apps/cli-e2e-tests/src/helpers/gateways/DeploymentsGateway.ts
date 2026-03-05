import { PackmindHttpClient } from './PackmindHttpClient';
import {
  Gateway,
  IGetTargetsByOrganizationUseCase,
  IListChangeProposalsByArtefact,
  RecipeId,
} from '@packmind/types';

export interface IDeploymentsGateway {
  listChangeProposalsByRecipe: Gateway<
    IListChangeProposalsByArtefact<RecipeId>
  >;
  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase>;
}

export class DeploymentsGateway implements IDeploymentsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}
  listChangeProposalsByRecipe: Gateway<
    IListChangeProposalsByArtefact<RecipeId>
  > = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes/${command.artefactId}/change-proposals`,
    );
  };

  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase> =
    async () => {
      const organizationId = this.httpClient.getOrganizationId();
      return this.httpClient.request(
        `/api/v0/organizations/${organizationId}/deployments/targets`,
      );
    };
}
