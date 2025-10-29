import {
  IPackmindGateway,
  ListDetectionPrograms,
  ListDetectionProgramsResult,
  GetDraftDetectionProgramsForRule,
  GetDraftDetectionProgramsForRuleResult,
  GetActiveDetectionProgramsForRule,
  GetActiveDetectionProgramsForRuleResult,
} from '../../domain/repositories/IPackmindGateway';
import { Gateway, RuleId } from '@packmind/shared';
interface ApiKeyPayload {
  host: string;
  jwt: string;
}

interface DecodedApiKey {
  payload: ApiKeyPayload;
  isValid: boolean;
  error?: string;
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
}
