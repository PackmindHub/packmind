import { Gateway, Organization } from '@packmind/types';
import {
  ISkillsGateway,
  IUploadSkillUseCase,
  UploadSkillResult,
  IGetDefaultSkillsUseCase,
  GetDefaultSkillsResult,
  ListSkillsResult,
} from '../../domain/repositories/ISkillsGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { readSkillDirectory } from '../utils/readSkillDirectory';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

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

export class SkillsGateway implements ISkillsGateway {
  constructor(
    private readonly apiKey: string,
    private readonly httpClient: PackmindHttpClient,
    private readonly spaces: ISpacesGateway,
  ) {}

  public upload: Gateway<IUploadSkillUseCase> = async (command) => {
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

  public getDefaults: Gateway<IGetDefaultSkillsUseCase> = async (command) => {
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
    const queryParams = new URLSearchParams();
    if (command.includeBeta) {
      queryParams.set('includeBeta', 'true');
    } else if (command.cliVersion) {
      queryParams.set('cliVersion', command.cliVersion);
    }

    // Add agents from packmind.json config
    if (command.agents && command.agents.length > 0) {
      command.agents.forEach((agent) => {
        queryParams.append('agent', agent);
      });
    }

    const queryString = queryParams.toString();
    const url = `${host}/api/v0/organizations/${organizationId}/skills/default${queryString ? `?${queryString}` : ''}`;

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

  public list = async (): Promise<ListSkillsResult> => {
    const space = await this.spaces.getGlobal();
    const { organizationId } = this.httpClient.getAuthContext();

    const skills = await this.httpClient.request<
      Array<{ slug: string; name: string; description: string }>
    >(`/api/v0/organizations/${organizationId}/spaces/${space.id}/skills`);

    return skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
    }));
  };
}
