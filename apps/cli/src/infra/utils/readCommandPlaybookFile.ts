import * as fs from 'fs/promises';
import {
  validateCommandPlaybook,
  CommandValidationResult,
} from './commandPlaybookValidator';
import { CommandPlaybookDTO } from '../../domain/entities/CommandPlaybookDTO';

export interface ReadCommandPlaybookResult extends CommandValidationResult {
  data?: CommandPlaybookDTO;
}

export async function readCommandPlaybookFile(
  filePath: string,
): Promise<ReadCommandPlaybookResult> {
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

    return validateCommandPlaybook(parsed);
  } catch (e) {
    return {
      isValid: false,
      errors: [
        `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ],
    };
  }
}
