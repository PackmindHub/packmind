import {
  readPlaybookFile,
  parseAndValidatePlaybook,
  ReadPlaybookResult,
} from '../utils/readPlaybookFile';
import { readStdin } from '../utils/readStdin';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export interface ICreateStandardHandlerResult {
  success: boolean;
  standardId?: string;
  standardName?: string;
  error?: string;
}

export async function createStandardHandler(
  filePath: string | undefined,
  useCase: ICreateStandardFromPlaybookUseCase,
  originSkill?: string,
): Promise<ICreateStandardHandlerResult> {
  let readResult: ReadPlaybookResult;

  if (filePath) {
    readResult = await readPlaybookFile(filePath);
  } else {
    try {
      const content = await readStdin();
      readResult = parseAndValidatePlaybook(content);
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
      error: 'Failed to read playbook data',
    };
  }

  try {
    const result = await useCase.execute({
      ...readResult.data,
      originSkill,
    });

    return {
      success: true,
      standardId: result.standardId,
      standardName: result.name,
    };
  } catch (e) {
    return {
      success: false,
      error: `Error creating standard: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}
