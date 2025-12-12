import {
  PublicGateway,
  ISignUpWithOrganizationUseCase,
  ISignInUserUseCase,
} from '@packmind/types';
import { IPackmindPublicApi } from '../../domain/api/IPackmindPublicApi';
import { APIRequestContext, expect } from '@playwright/test';

export class PackmindPublicApi implements IPackmindPublicApi {
  constructor(private readonly request: APIRequestContext) {}

  signIn: PublicGateway<ISignInUserUseCase> = async (cmd) => {
    throw new Error(`Unable to sign-in: ${cmd}`);
  };

  signUp: PublicGateway<ISignUpWithOrganizationUseCase> = async (cmd) => {
    const response = await this.request.post('/api/v0/auth/signup/', {
      data: cmd,
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
}
