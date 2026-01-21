import {
  playbookDTOSchema,
  PlaybookDTO,
} from '../../domain/entities/PlaybookDTO';

export interface ValidationResult {
  isValid: boolean;
  data?: PlaybookDTO;
  errors?: string[];
}

export function validatePlaybook(data: unknown): ValidationResult {
  const result = playbookDTOSchema.safeParse(data);

  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
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
