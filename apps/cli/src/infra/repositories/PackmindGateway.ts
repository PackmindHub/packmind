import {
  IPackmindGateway,
  GetMcpTokenResult,
  GetMcpUrlResult,
  IGetMcpTokenUseCase,
  IGetMcpUrlUseCase,
  NotifyDistributionGateway,
  NotifyDistributionResult,
  IUploadSkillUseCase,
  UploadSkillResult,
  IGetDefaultSkillsUseCase,
  GetDefaultSkillsResult,
  GetGlobalSpaceResult,
  CreateStandardInSpaceCommand,
  CreateStandardInSpaceResult,
  RuleWithId,
  RuleExample,
  CreateCommandCommand,
  CreateCommandResult,
  CreatePackageCommand,
  CreatePackageResult,
} from '../../domain/repositories/IPackmindGateway';

import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';
import { readSkillDirectory } from '../utils/readSkillDirectory';
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

  constructor(private readonly apiKey: string) {
    this.httpClient = new PackmindHttpClient(apiKey);
    this.linter = new LinterGateway(this.httpClient);
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

  public getMcpToken: Gateway<IGetMcpTokenUseCase> = async () => {
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

    const url = `${host}/api/v0/organizations/${organizationId}/mcp/token`;

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
        throw new Error(errorMsg);
      }

      const result: GetMcpTokenResult = await response.json();
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
        `Failed to get MCP token: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public getMcpUrl: Gateway<IGetMcpUrlUseCase> = async () => {
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

    const url = `${host}/api/v0/organizations/${organizationId}/mcp/url`;

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
        throw new Error(errorMsg);
      }

      const result: GetMcpUrlResult = await response.json();
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
        `Failed to get MCP URL: Error: ${err?.message || JSON.stringify(error)}`,
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

  public uploadSkill: Gateway<IUploadSkillUseCase> = async (command) => {
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

    // Step 1: Resolve 'global' slug to UUID
    const spacesUrl = `${host}/api/v0/organizations/${organizationId}/spaces/global`;
    const spaceResponse = await fetch(spacesUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!spaceResponse.ok) {
      throw new Error(
        `Failed to resolve global space: ${spaceResponse.status} ${spaceResponse.statusText}`,
      );
    }

    const space = await spaceResponse.json();
    const spaceId = space.id;

    // Step 2: Read all files from skill directory
    const files = await readSkillDirectory(command.skillPath);

    // Validate SKILL.md exists
    if (!files.find((f) => f.relativePath === 'SKILL.md')) {
      throw new Error('SKILL.md not found in skill directory');
    }

    // Validate file count
    const MAX_FILES = 100;
    if (files.length > MAX_FILES) {
      throw new Error(
        `Skill contains ${files.length} files, but maximum allowed is ${MAX_FILES}`,
      );
    }

    // Calculate total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      throw new Error(`Skill size (${totalSize} bytes) exceeds 10MB limit`);
    }

    // Prepare payload
    const payload = {
      files: files.map((f) => ({
        path: f.relativePath,
        content: f.content,
        permissions: f.permissions || 'rw-r--r--',
        isBase64: f.isBase64,
      })),
    };

    // Step 3: Use resolved UUID in upload URL
    const url = `${host}/api/v0/organizations/${organizationId}/spaces/${spaceId}/skills/upload`;

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
          if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // ignore
        }

        // Special handling for conflict errors (409)
        if (response.status === 409) {
          throw new Error(`Skill already exists: ${errorMsg}`);
        }

        throw new Error(errorMsg);
      }

      const isNewSkill = response.status === 201;
      const result = await response.json();
      return {
        skillId: result.skill.id,
        name: result.skill.name,
        version: result.skill.version,
        isNewSkill,
        versionCreated: result.versionCreated,
        fileCount: files.length,
        totalSize,
      } as UploadSkillResult;
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
        `Failed to upload skill: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public getDefaultSkills: Gateway<IGetDefaultSkillsUseCase> = async () => {
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

    const url = `${host}/api/v0/organizations/${organizationId}/skills/default`;

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
          if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const result: GetDefaultSkillsResult = await response.json();
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
        `Failed to get default skills: Error: ${err?.message || JSON.stringify(error)}`,
      );
    }
  };

  public getGlobalSpace = async (): Promise<GetGlobalSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GetGlobalSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };

  public createStandardInSpace = async (
    spaceId: string,
    data: CreateStandardInSpaceCommand,
  ): Promise<CreateStandardInSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateStandardInSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards`,
      { method: 'POST', body: data },
    );
  };

  public getRulesForStandard = async (
    spaceId: string,
    standardId: string,
  ): Promise<RuleWithId[]> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<RuleWithId[]>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules`,
    );
  };

  public addExampleToRule = async (
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: RuleExample,
  ): Promise<void> => {
    const { organizationId } = this.httpClient.getAuthContext();
    await this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`,
      {
        method: 'POST',
        body: {
          lang: example.language,
          positive: example.positive,
          negative: example.negative,
        },
      },
    );
  };

  public createCommand = async (
    spaceId: string,
    data: CreateCommandCommand,
  ): Promise<CreateCommandResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateCommandResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/recipes`,
      { method: 'POST', body: data },
    );
  };

  public createPackage = async (
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreatePackageResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages`,
      { method: 'POST', body: data },
    );
  };

  public pushOnboardingBaseline = async (
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }> => {
    const space = await this.getGlobalSpace();
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
