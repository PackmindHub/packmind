import {
  NewGateway,
  IListRecipesBySpaceUseCase,
  Space,
  Organization,
} from '@packmind/types';
import { IPackmindApi } from '../../domain/api/IPackmindApi';
import { APIRequestContext, expect } from '@playwright/test';

export class PackmindApi implements IPackmindApi {
  constructor(
    private readonly request: APIRequestContext,
    public readonly apiKey: string,
  ) {
    console.log(`Initialized Packmind API with: ${apiKey}`);
  }

  async listOrganizations(): Promise<Organization[]> {
    const response = await this.request.get('/api/v0/organizations/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    expect(response.status()).toBe(200);

    return response.json();
  }

  async listSpaces(): Promise<Space[]> {
    throw new Error('Not implemented');
  }

  getRecipesBySpace: NewGateway<IListRecipesBySpaceUseCase> = () => {
    throw new Error('Not implemented');
  };
}
