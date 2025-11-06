import { ProgrammingLanguage } from '../languages/ProgrammingLanguage';

export type RuleExampleInput = {
  positive: string;
  negative: string;
  language: ProgrammingLanguage;
};

export type RuleWithExamples = {
  content: string;
  examples?: RuleExampleInput[];
};
