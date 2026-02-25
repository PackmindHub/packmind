import {
  readCommandPlaybookFile,
  parseAndValidateCommandPlaybook,
  ReadCommandPlaybookResult,
} from '../utils/readCommandPlaybookFile';
import { readStdin } from '../utils/readStdin';
import { ICreateCommandFromPlaybookUseCase } from '../../domain/useCases/ICreateCommandFromPlaybookUseCase';
import { loadApiKey, decodeApiKey } from '../utils/credentials';

export interface ICreateCommandHandlerResult {
  success: boolean;
  commandId?: string;
  commandName?: string;
  webappUrl?: string;
  error?: string;
}

function buildWebappUrl(
  host: string,
  orgSlug: string,
  commandId: string,
): string {
  return `${host}/org/${orgSlug}/space/global/commands/${commandId}`;
}

export async function createCommandHandler(
  filePath: string | undefined,
  useCase: ICreateCommandFromPlaybookUseCase,
  originSkill?: string,
): Promise<ICreateCommandHandlerResult> {
  let readResult: ReadCommandPlaybookResult;

  if (filePath) {
    readResult = await readCommandPlaybookFile(filePath);
  } else {
    try {
      const content = await readStdin();
      readResult = parseAndValidateCommandPlaybook(content);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to read from stdin',
      };
    }
  }

  if (!readResult.isValid) {
    return {
      success: false,
      error: `Validation failed: ${readResult.errors?.join(', ')}`,
    };
  }

  if (!readResult.data) {
    return {
      success: false,
      error: 'Failed to read command playbook data',
    };
  }

  try {
    const result = await useCase.execute({
      ...readResult.data,
      originSkill,
    });

    // Try to build webapp URL from credentials
    let webappUrl: string | undefined;
    const apiKey = loadApiKey();
    if (apiKey) {
      const decoded = decodeApiKey(apiKey);
      if (decoded?.host && decoded?.jwt?.organization?.slug) {
        webappUrl = buildWebappUrl(
          decoded.host,
          decoded.jwt.organization.slug,
          result.commandId,
        );
      }
    }

    return {
      success: true,
      commandId: result.commandId,
      commandName: result.name,
      webappUrl,
    };
  } catch (e) {
    return {
      success: false,
      error: `Error creating command: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}
