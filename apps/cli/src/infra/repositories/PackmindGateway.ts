import {
  IPackmindGateway,
  ListDetectionPrograms,
  ListDetectionProgramsResult,
  GetDraftDetectionProgramsForRule,
  GetDraftDetectionProgramsForRuleResult,
  GetActiveDetectionProgramsForRule,
  GetActiveDetectionProgramsForRuleResult,
  GetDetectionProgramsForPackages,
  GetDetectionProgramsForPackagesResult,
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
  CreateStandardCommand,
  CreateStandardResult,
  StandardRule,
  AddExampleCommand,
} from '../../domain/repositories/IPackmindGateway';
import { readSkillDirectory } from '../utils/readSkillDirectory';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  RuleId,
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

  constructor(private readonly apiKey: string) {
    this.httpClient = new PackmindHttpClient(apiKey);
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

  public listExecutionPrograms: Gateway<ListDetectionPrograms> =
    async (params: { gitRemoteUrl: string; branches: string[] }) => {
      // Decode the API key to get host and JWT
      const decodedApiKey = decodeApiKey(this.apiKey);

      if (!decodedApiKey.isValid) {
        if (decodedApiKey.error === 'NOT_LOGGED_IN') {
          throw new NotLoggedInError();
        }
        throw new Error(`Invalid API key: ${decodedApiKey.error}`);
      }

      const { host } = decodedApiKey.payload;

      // Make API call to get detection programs
      const url = `${host}/api/v0/list-detection-program`;
      const payload = {
        gitRemoteUrl: params.gitRemoteUrl,
        branches: params.branches,
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

        const result: ListDetectionProgramsResult = await response.json();
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
          `Failed to fetch detection programs: Error: ${err?.message || JSON.stringify(error)}`,
        );
      }
    };

  public getDraftDetectionProgramsForRule: Gateway<GetDraftDetectionProgramsForRule> =
    async (params: {
      standardSlug: string;
      ruleId: RuleId;
      language?: string;
    }) => {
      // Decode the API key to get host and JWT
      const decodedApiKey = decodeApiKey(this.apiKey);

      if (!decodedApiKey.isValid) {
        if (decodedApiKey.error === 'NOT_LOGGED_IN') {
          throw new NotLoggedInError();
        }
        throw new Error(`Invalid API key: ${decodedApiKey.error}`);
      }

      const { host } = decodedApiKey.payload;

      // Make API call to get draft detection programs
      const url = `${host}/api/v0/list-draft-detection-program`;
      const payload: {
        standardSlug: string;
        ruleId: RuleId;
        language?: string;
      } = {
        standardSlug: params.standardSlug,
        ruleId: params.ruleId,
      };

      if (params.language) {
        payload.language = params.language;
      }

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

        const result: {
          programs: Array<{
            id: string;
            code: string;
            language: string;
            mode: string;
            sourceCodeState: 'AST' | 'RAW';
            ruleId: string;
          }>;
          ruleContent: string;
          scope: string | null;
        } = await response.json();

        if (result.programs.length === 0) {
          const languageMsg = params.language
            ? ` for language ${params.language}`
            : '';
          throw new Error(
            `No draft detection programs found for rule ${params.ruleId} in standard ${params.standardSlug}${languageMsg}`,
          );
        }

        const transformedResult: GetDraftDetectionProgramsForRuleResult = {
          programs: result.programs.map((program) => ({
            language: program.language,
            code: program.code,
            mode: program.mode,
            sourceCodeState: program.sourceCodeState,
          })),
          ruleContent: result.ruleContent,
          standardSlug: params.standardSlug,
          scope: result.scope,
        };

        return transformedResult;
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
          `Failed to fetch draft detection programs: Error: ${err?.message || JSON.stringify(error)}`,
        );
      }
    };

  public getActiveDetectionProgramsForRule: Gateway<GetActiveDetectionProgramsForRule> =
    async (params: {
      standardSlug: string;
      ruleId: RuleId;
      language?: string;
    }) => {
      // Decode the API key to get host and JWT
      const decodedApiKey = decodeApiKey(this.apiKey);

      if (!decodedApiKey.isValid) {
        if (decodedApiKey.error === 'NOT_LOGGED_IN') {
          throw new NotLoggedInError();
        }
        throw new Error(`Invalid API key: ${decodedApiKey.error}`);
      }

      const { host } = decodedApiKey.payload;

      // Make API call to get active detection programs
      const url = `${host}/api/v0/list-active-detection-program`;
      const payload: {
        standardSlug: string;
        ruleId: RuleId;
        language?: string;
      } = {
        standardSlug: params.standardSlug,
        ruleId: params.ruleId,
      };

      if (params.language) {
        payload.language = params.language;
      }

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

        const result: {
          programs: Array<{
            id: string;
            code: string;
            language: string;
            mode: string;
            sourceCodeState: 'AST' | 'RAW';
            ruleId: string;
          }>;
          ruleContent: string;
          scope: string | null;
        } = await response.json();

        if (result.programs.length === 0) {
          const languageMsg = params.language
            ? ` for language ${params.language}`
            : '';
          throw new Error(
            `No active detection programs found for rule ${params.ruleId} in standard ${params.standardSlug}${languageMsg}`,
          );
        }

        const transformedResult: GetActiveDetectionProgramsForRuleResult = {
          programs: result.programs.map((program) => ({
            language: program.language,
            code: program.code,
            mode: program.mode,
            sourceCodeState: program.sourceCodeState,
          })),
          ruleContent: result.ruleContent,
          standardSlug: params.standardSlug,
          scope: result.scope,
        };

        return transformedResult;
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
          `Failed to fetch active detection programs: Error: ${err?.message || JSON.stringify(error)}`,
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

  public getDetectionProgramsForPackages: Gateway<GetDetectionProgramsForPackages> =
    async (params: { packagesSlugs: string[] }) => {
      const decodedApiKey = decodeApiKey(this.apiKey);

      if (!decodedApiKey.isValid) {
        if (decodedApiKey.error === 'NOT_LOGGED_IN') {
          throw new NotLoggedInError();
        }
        throw new Error(`Invalid API key: ${decodedApiKey.error}`);
      }

      const { host } = decodedApiKey.payload;

      const url = `${host}/api/v0/detection-programs-for-packages`;
      const payload = {
        packagesSlugs: params.packagesSlugs,
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
          // 404 means the endpoint doesn't exist - this is a community edition
          if (response.status === 404) {
            throw new CommunityEditionError('local linting with packages');
          }

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

        const result: GetDetectionProgramsForPackagesResult =
          await response.json();
        return result;
      } catch (error: unknown) {
        // Re-throw CommunityEditionError as-is
        if (error instanceof CommunityEditionError) {
          throw error;
        }

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
          `Failed to fetch detection programs for packages: Error: ${err?.message || JSON.stringify(error)}`,
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

  public createStandardFromPlaybook = async (playbook: {
    name: string;
    description: string;
    scope: string;
    rules: Array<{
      content: string;
      examples?: {
        positive: string;
        negative: string;
        language: string;
      };
    }>;
  }): Promise<{
    success: boolean;
    standardId?: string;
    name?: string;
    error?: string;
  }> => {
    const decodedApiKey = decodeApiKey(this.apiKey);

    if (!decodedApiKey.isValid) {
      if (decodedApiKey.error === 'NOT_LOGGED_IN') {
        return {
          success: false,
          error: 'Not logged in. Please run `packmind-cli login` first.',
        };
      }
      return {
        success: false,
        error: `Invalid API key: ${decodedApiKey.error}`,
      };
    }

    const { host, jwt } = decodedApiKey.payload;
    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      return {
        success: false,
        error: 'Invalid API key: missing organizationId in JWT',
      };
    }

    const organizationId = jwtPayload.organization.id;

    try {
      // Step 1: Resolve 'global' space slug to UUID
      const spacesUrl = `${host}/api/v0/organizations/${organizationId}/spaces/global`;
      const spaceResponse = await fetch(spacesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!spaceResponse.ok) {
        return {
          success: false,
          error: `Failed to resolve global space: ${spaceResponse.status} ${spaceResponse.statusText}`,
        };
      }

      const space = await spaceResponse.json();
      const spaceId = space.id;

      // Step 2: Create the standard via API
      const standardsUrl = `${host}/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards`;

      const createResponse = await fetch(standardsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          name: playbook.name,
          description: playbook.description,
          scope: playbook.scope,
          rules: playbook.rules.map((rule) => ({
            content: rule.content,
          })),
        }),
      });

      if (!createResponse.ok) {
        let errorMsg = `${createResponse.status} ${createResponse.statusText}`;
        try {
          const errorBody = await createResponse.json();
          if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // ignore
        }
        return {
          success: false,
          error: `Failed to create standard: ${errorMsg}`,
        };
      }

      const createdStandard = await createResponse.json();
      const standardId = createdStandard.id;

      // Step 3: Check if any rules have examples
      const rulesWithExamples = playbook.rules.filter((rule) => rule.examples);

      if (rulesWithExamples.length > 0) {
        // Step 4: Fetch the created rules to get their IDs
        const rulesUrl = `${host}/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules`;
        const rulesResponse = await fetch(rulesUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (rulesResponse.ok) {
          const createdRules = (await rulesResponse.json()) as Array<{
            id: string;
            content: string;
          }>;

          // Step 5: Match rules by index and create examples
          for (let i = 0; i < playbook.rules.length; i++) {
            const playbookRule = playbook.rules[i];
            if (playbookRule.examples && createdRules[i]) {
              const ruleId = createdRules[i].id;
              const examplesUrl = `${host}/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`;

              await fetch(examplesUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                  lang: playbookRule.examples.language,
                  positive: playbookRule.examples.positive,
                  negative: playbookRule.examples.negative,
                }),
              });
              // Note: We don't fail if example creation fails - the standard is still created
            }
          }
        }
      }

      return {
        success: true,
        standardId: standardId,
        name: createdStandard.name,
      };
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
        return {
          success: false,
          error: `Packmind server is not accessible at ${host}. Please check your network connection or the server URL.`,
        };
      }

      return {
        success: false,
        error: `Error: ${err?.message || JSON.stringify(error)}`,
      };
    }
  };

  public getGlobalSpace = async (): Promise<GetGlobalSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GetGlobalSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };

  public createStandard = async (
    spaceId: string,
    data: CreateStandardCommand,
  ): Promise<CreateStandardResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateStandardResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards`,
      { method: 'POST', body: data },
    );
  };

  public getRulesForStandard = async (
    spaceId: string,
    standardId: string,
  ): Promise<StandardRule[]> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<StandardRule[]>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules`,
    );
  };

  public addExampleToRule = async (
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: AddExampleCommand,
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
}
