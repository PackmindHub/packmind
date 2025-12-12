import {
  Gateway,
  Space,
  Organization,
  ICreateStandardUseCase,
  ICreatePackageUseCase,
  INotifyDistributionUseCase,
} from '@packmind/types';
import { IPackmindApi } from '../../domain/api/IPackmindApi';
import { APIRequestContext, expect } from '@playwright/test';

interface ApiKeyPayload {
  host: string;
  jwt: string;
}

interface DecodedApiKey {
  payload: ApiKeyPayload;
  isValid: boolean;
  error?: string;
}

interface JwtPayload {
  organization: Organization;
}

function decodeJwt(jwt: string): JwtPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8'),
    );
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function decodeApiKey(apiKey: string): DecodedApiKey {
  if (!apiKey) {
    return {
      payload: { host: '', jwt: '' },
      isValid: false,
      error: 'NOT_LOGGED_IN',
    };
  }

  try {
    const trimmedKey = apiKey.trim();

    const jsonString = Buffer.from(trimmedKey, 'base64').toString('utf-8');

    const payload = JSON.parse(jsonString) as ApiKeyPayload;

    if (!payload.host || typeof payload.host !== 'string') {
      return {
        payload: payload,
        isValid: false,
        error: 'Invalid API key: missing or invalid host field',
      };
    }

    if (!payload.jwt || typeof payload.jwt !== 'string') {
      return {
        payload: payload,
        isValid: false,
        error: 'Invalid API key: missing or invalid jwt field',
      };
    }

    return {
      payload,
      isValid: true,
    };
  } catch (error) {
    return {
      payload: { host: '', jwt: '' },
      isValid: false,
      error: `Failed to decode API key: ${error}`,
    };
  }
}

export class PackmindApi implements IPackmindApi {
  constructor(
    private readonly request: APIRequestContext,
    public readonly apiKey: string,
  ) {}

  async listSpaces(): Promise<Space[]> {
    return this.get(`/spaces`);
  }

  createStandard: Gateway<ICreateStandardUseCase> = async (command) => {
    return this.post(`/spaces/${command.spaceId}/standards`, command, 201);
  };

  createPackage: Gateway<ICreatePackageUseCase> = async (command) => {
    return this.post(`/spaces/${command.spaceId}/packages`, command, 201);
  };

  notifyDistribution: Gateway<INotifyDistributionUseCase> = async (command) => {
    return this.post('/deployments', command, 201);
  };

  private async get<T>(url: string, expectedStatus = 200): Promise<T> {
    const response = await this.request.get(this.buildUrl(url), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    expect(response.status()).toBe(expectedStatus);
    return response.json();
  }

  private async post<T>(
    url: string,
    data: object,
    expectedStatus = 200,
  ): Promise<T> {
    const response = await this.request.post(this.buildUrl(url), {
      data,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    expect(response.status()).toBe(expectedStatus);
    return response.json();
  }

  private getOrganizationId() {
    const decodedApiKey = decodeApiKey(this.apiKey);
    const decodedJwt = decodeJwt(decodedApiKey.payload.jwt);

    return decodedJwt?.organization.id;
  }

  private buildUrl(url: string) {
    return `/api/v0/organizations/${this.getOrganizationId()}${url}`;
  }
}
