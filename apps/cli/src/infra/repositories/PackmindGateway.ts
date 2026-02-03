import {
  IPackmindGateway,
  NotifyDistributionGateway,
  NotifyDistributionResult,
  CreatePackageCommand,
  CreatePackageResult,
} from '../../domain/repositories/IPackmindGateway';

import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  Gateway,
  PublicGateway,
  IPullContentResponse,
  IPullContentUseCase,
  ListPackagesResponse,
  GetPackageSummaryResponse,
  Organization,
  IGetPackageSummaryUseCase,
} from '@packmind/types';
import { IListPackagesUseCase } from '../../domain/useCases/IListPackagesUseCase';
import { LinterGateway } from './LinterGateway';
import { ILinterGateway } from '../../domain/repositories/ILinterGateway';
import { McpGateway } from './McpGateway';
import { IMcpGateway } from '../../domain/repositories/IMcpGateway';
import { SpacesGateway } from './SpacesGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { SkillsGateway } from './SkillsGateway';
import { ISkillsGateway } from '../../domain/repositories/ISkillsGateway';
import { CommandsGateway } from './CommandsGateway';
import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { StandardsGateway } from './StandardsGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';
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

export class PackmindGateway implements IPackmindGateway {
  private readonly httpClient: PackmindHttpClient;
  readonly linter: ILinterGateway;
  readonly mcp: IMcpGateway;
  readonly spaces: ISpacesGateway;
  readonly skills: ISkillsGateway;
  readonly commands: ICommandsGateway;
  readonly standards: IStandardsGateway;

  constructor(private readonly apiKey: string) {
    this.httpClient = new PackmindHttpClient(apiKey);
    this.linter = new LinterGateway(this.httpClient);
    this.mcp = new McpGateway(apiKey);
    this.spaces = new SpacesGateway(this.httpClient);
    this.skills = new SkillsGateway(apiKey, this.httpClient, this.spaces);
    this.commands = new CommandsGateway(this.httpClient, this.spaces);
    this.standards = new StandardsGateway(this.httpClient, this.spaces);
  }

  public getPullData: Gateway<IPullContentUseCase> = async (command) => {
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

    // Build query parameters for package slugs
    const queryParams = new URLSearchParams();
    if (command.packagesSlugs && command.packagesSlugs.length > 0) {
      command.packagesSlugs.forEach((slug) => {
        queryParams.append('packageSlug', slug);
      });
    }

    // Add previous package slugs for change detection
    if (
      command.previousPackagesSlugs &&
      command.previousPackagesSlugs.length > 0
    ) {
      command.previousPackagesSlugs.forEach((slug) => {
        queryParams.append('previousPackageSlug', slug);
      });
    }

    // Add git target info for distribution history lookup
    if (command.gitRemoteUrl) {
      queryParams.append('gitRemoteUrl', command.gitRemoteUrl);
    }
    if (command.gitBranch) {
      queryParams.append('gitBranch', command.gitBranch);
    }
    if (command.relativePath) {
      queryParams.append('relativePath', command.relativePath);
    }

    // Make API call to pull all content
    const url = `${host}/api/v0/organizations/${organizationId}/pull?${queryParams.toString()}`;

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

      const result: IPullContentResponse = await response.json();
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
        `Failed to fetch content: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public listPackages: PublicGateway<IListPackagesUseCase> = async () => {
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

    // Make API call to list packages
    const url = `${host}/api/v0/organizations/${organizationId}/packages`;

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

      const result: ListPackagesResponse = await response.json();
      return result.packages;
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
        `Failed to list packages: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public getPackageSummary: PublicGateway<IGetPackageSummaryUseCase> = async ({
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

  public notifyDistribution: NotifyDistributionGateway = async (params) => {
    const decodedApiKey = decodeApiKey(this.apiKey);

    if (!decodedApiKey.isValid) {
      if (decodedApiKey.error === 'NOT_LOGGED_IN') {
        throw new NotLoggedInError();
      }
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid API key: missing organizationId in JWT');
    }

    const organizationId = jwtPayload.organization.id;

    const url = `${host}/api/v0/organizations/${organizationId}/deployments`;

    const payload = {
      distributedPackages: params.distributedPackages,
      gitRemoteUrl: params.gitRemoteUrl,
      gitBranch: params.gitBranch,
      relativePath: params.relativePath,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
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
        throw new Error(errorMsg);
      }

      const result: NotifyDistributionResult = await response.json();
      return result;
    } catch (error: unknown) {
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
        `Failed to notify distribution: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public createPackage = async (
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

  public pushOnboardingBaseline = async (
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }> => {
    const space = await this.spaces.getGlobal();
    const { organizationId } = this.httpClient.getAuthContext();

    await this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${space.id}/onboarding/baseline`,
      {
        method: 'POST',
        body: {
          meta: draft.meta,
          summary: draft.summary,
          baseline_items: draft.baseline_items,
        },
      },
    );

    return { success: true };
  };
}
