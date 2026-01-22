import { z } from 'zod';

const playbookRuleExampleSchema = z.object({
  positive: z.string().describe('Valid example of the rule'),
  negative: z.string().describe('Invalid example of the rule'),
  language: z.string().describe('Programming language'),
});

const playbookRuleSchema = z.object({
  content: z
    .string()
    .min(1)
    .describe('Rule description starting with action verb'),
  examples: playbookRuleExampleSchema.optional(),
});

export const playbookDTOSchema = z.object({
  name: z.string().min(1).describe('Standard name'),
  description: z.string().min(1).describe('Standard description'),
  scope: z.string().min(1).describe('Standard scope/context'),
  rules: z
    .array(playbookRuleSchema)
    .min(1)
    .describe('Array of rules (minimum 1)'),
});

export type PlaybookDTO = z.infer<typeof playbookDTOSchema>;
