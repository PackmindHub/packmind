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
} from '../../domain/repositories/IPackmindGateway';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
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
      error: 'Please set the PACKMIND_API_KEY_V3 environment variable',
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
  constructor(private readonly apiKey: string) {}
  public getPullData: Gateway<IPullContentUseCase> = async (command) => {
    // Decode the API key to get host and JWT
    const decodedApiKey = decodeApiKey(this.apiKey);

    if (!decodedApiKey.isValid) {
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    // Decode JWT to extract organizationId
    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid JWT: missing organizationId');
    }

    const organizationId = jwtPayload.organization.id;

    // Build query parameters for package slugs
    const queryParams = new URLSearchParams();
    if (command.packagesSlugs && command.packagesSlugs.length > 0) {
      command.packagesSlugs.forEach((slug) => {
        queryParams.append('packageSlug', slug);
      });
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
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    // Decode JWT to extract organizationId
    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid JWT: missing organizationId');
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
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    // Decode JWT to extract organizationId
    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid JWT: missing organizationId');
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
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid JWT: missing organizationId');
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
      throw new Error(`Invalid API key: ${decodedApiKey.error}`);
    }

    const { host, jwt } = decodedApiKey.payload;

    const jwtPayload = decodeJwt(jwt);

    if (!jwtPayload?.organization?.id) {
      throw new Error('Invalid JWT: missing organizationId');
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
}
