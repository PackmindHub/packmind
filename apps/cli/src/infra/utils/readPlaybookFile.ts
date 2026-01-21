import * as fs from 'fs/promises';
import { validatePlaybook, ValidationResult } from './playbookValidator';
import { PlaybookDTO } from '../../domain/entities/PlaybookDTO';

export interface ReadPlaybookResult extends ValidationResult {
  data?: PlaybookDTO;
}

export async function readPlaybookFile(
  filePath: string,
): Promise<ReadPlaybookResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return {
        isValid: false,
        errors: [
          `Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
        ],
      };
    }

    return validatePlaybook(parsed);
  } catch (e) {
    return {
      isValid: false,
      errors: [
        `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ],
    };
  }
}
