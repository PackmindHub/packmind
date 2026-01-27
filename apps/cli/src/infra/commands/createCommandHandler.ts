import { readCommandPlaybookFile } from '../utils/readCommandPlaybookFile';
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
  filePath: string,
  useCase: ICreateCommandFromPlaybookUseCase,
): Promise<ICreateCommandHandlerResult> {
  const readResult = await readCommandPlaybookFile(filePath);

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
    const result = await useCase.execute(readResult.data);

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
