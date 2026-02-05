import {
  IPackagesGateway,
  CreatePackageCommand,
  CreatePackageResult,
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResult,
} from '../../domain/repositories/IPackagesGateway';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  PublicGateway,
  GetPackageSummaryResponse,
  Organization,
  IGetPackageSummaryUseCase,
  IListPackagesUseCase,
  Gateway,
} from '@packmind/types';

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

export class PackagesGateway implements IPackagesGateway {
  constructor(
    private readonly apiKey: string,
    private readonly httpClient: PackmindHttpClient,
  ) {}

  public list: Gateway<IListPackagesUseCase> = async () => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/packages`,
    );
  };

  public getSummary: PublicGateway<IGetPackageSummaryUseCase> = async ({
    slug,
  }) => {
    // Decode the API key to get host and JWT
    const decodedApiKey = decodeApiKey(this.apiKey);

    if (!decodedApiKey.isValid) {
      if (decodedApiKey.error === 'NOT_LOGGED_IN') {
        throw new NotLoggedInError();
      }
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    // Decode JWT to extract organizationId
    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid API key: missing organizationId in JWT');
    }

    const organizationId = jwtPayload.organization.id;

    // Make API call to get package summary
    const url = `${host}/api/v0/organizations/${organizationId}/packages/${encodeURIComponent(slug)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        let errorMsg = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorMsg = `${errorBody.message}`;
          }
        } catch {
          // ignore if body is not json
        }
        const error: Error & { statusCode?: number } = new Error(errorMsg);
        error.statusCode = response.status;
        throw error;
      }

      const result: GetPackageSummaryResponse = await response.json();
      return result;
    } catch (error: unknown) {
      // Specific handling if the server is not accessible
      const err = error as {
        code?: string;
        name?: string;
        message?: string;
        cause?: { code?: string };
      };
      const code = err?.code || err?.cause?.code;
      if (
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        err?.name === 'FetchError' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('Failed to fetch') ||
            err.message.includes('network') ||
            err.message.includes('NetworkError')))
      ) {
        throw new Error(
          `Packmind server is not accessible at ${host}. Please check your network connection or the server URL.`,
        );
      }

      throw new Error(
        `Failed to get package '${slug}': Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public create = async (
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    const response = await this.httpClient.request<{
      package: CreatePackageResult;
    }>(`/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages`, {
      method: 'POST',
      body: data,
    });
    return response.package;
  };

  public addArtefacts = async (
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    const { packageSlug, spaceId, standardIds, commandIds, skillIds } = command;

    const body: Record<string, string[] | undefined> = {};
    if (standardIds?.length) body.standardIds = standardIds;
    if (commandIds?.length) body.commandIds = commandIds;
    if (skillIds?.length) body.skillIds = skillIds;

    const response = await this.httpClient.request<{
      added: { standards: string[]; commands: string[]; skills: string[] };
      skipped: { standards: string[]; commands: string[]; skills: string[] };
    }>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages/${encodeURIComponent(packageSlug)}/add-artifacts`,
      {
        method: 'POST',
        body,
      },
    );

    return {
      added: response.added,
      skipped: response.skipped,
    };
  };
}
