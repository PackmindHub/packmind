import {
  commandPlaybookDTOSchema,
  CommandPlaybookDTO,
} from '../../domain/entities/CommandPlaybookDTO';

export interface CommandValidationResult {
  isValid: boolean;
  data?: CommandPlaybookDTO;
  errors?: string[];
}

export function validateCommandPlaybook(
  data: unknown,
): CommandValidationResult {
  const result = commandPlaybookDTOSchema.safeParse(data);

  if (!result.success) {
    const errorList = result.error.issues;
    return {
      isValid: false,
      errors: errorList.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  return {
    isValid: true,
    data: result.data,
  };
}
