import { readPlaybookFile } from '../utils/readPlaybookFile';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export interface CreateStandardResult {
  success: boolean;
  standardId?: string;
  standardName?: string;
  error?: string;
}

export async function createStandardHandler(
  filePath: string,
  gateway: IPackmindGateway,
): Promise<CreateStandardResult> {
  // Read and validate playbook
  const readResult = await readPlaybookFile(filePath);

  if (!readResult.isValid) {
    return {
      success: false,
      error: `Validation failed: ${readResult.errors?.join(', ')}`,
    };
  }

  if (!readResult.data) {
    return {
      success: false,
      error: 'Failed to read playbook data',
    };
  }

  const playbook = readResult.data;

  try {
    // Transform playbook to standard format
    const standardData = {
      name: playbook.name,
      description: playbook.description,
      scope: playbook.scope,
      rules: playbook.rules.map((rule) => ({
        content: rule.content,
        examples: rule.examples
          ? {
              positive: rule.examples.positive,
              negative: rule.examples.negative,
              language: rule.examples.language,
            }
          : undefined,
      })),
    };

    // Call gateway to create standard
    const result = await gateway.createStandardFromPlaybook(standardData);

    if (result.success) {
      return {
        success: true,
        standardId: result.standardId,
        standardName: result.name,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create standard',
      };
    }
  } catch (e) {
    return {
      success: false,
      error: `Error creating standard: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}
