import { z } from 'zod';

export const commandStepSchema = z.object({
  name: z.string().min(1).describe('Step name/title'),
  description: z
    .string()
    .min(1)
    .describe('Step description with implementation details'),
  codeSnippet: z
    .string()
    .optional()
    .describe('Optional code snippet demonstrating the step'),
});

export const commandPlaybookDTOSchema = z.object({
  name: z.string().min(1).describe('Command name'),
  summary: z
    .string()
    .min(1)
    .describe('Command summary describing intent and value'),
  whenToUse: z
    .array(z.string().min(1))
    .min(1)
    .describe('Array of scenarios when this command is applicable (minimum 1)'),
  contextValidationCheckpoints: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Array of checkpoints to validate context before implementation (minimum 1)',
    ),
  steps: z
    .array(commandStepSchema)
    .min(1)
    .describe('Array of implementation steps (minimum 1)'),
});

export type CommandPlaybookDTO = z.infer<typeof commandPlaybookDTOSchema>;
