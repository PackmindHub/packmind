import { readPlaybookFile } from '../utils/readPlaybookFile';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export interface ICreateStandardHandlerResult {
  success: boolean;
  standardId?: string;
  standardName?: string;
  error?: string;
}

export async function createStandardHandler(
  filePath: string,
  useCase: ICreateStandardFromPlaybookUseCase,
): Promise<ICreateStandardHandlerResult> {
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

  try {
    const result = await useCase.execute(readResult.data);

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
