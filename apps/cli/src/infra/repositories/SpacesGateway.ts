import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { ListUserSpacesResponse, Space } from '@packmind/types';

export class SpacesGateway implements ISpacesGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getUserSpaces = async () => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<ListUserSpacesResponse>(
      `/api/v0/organizations/${organizationId}/user-spaces`,
    );
  };

  async getSpaceBySlug(slug: string): Promise<Space | null> {
    const { organizationId } = this.httpClient.getAuthContext();
    try {
      return await this.httpClient.request<Space>(
        `/api/v0/organizations/${organizationId}/spaces/${slug}`,
      );
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) return null;
      throw error;
    }
  }

  getApiContext(): { host: string; organizationId: string } {
    const { host, organizationId } = this.httpClient.getAuthContext();
    return { host, organizationId };
  }
}
