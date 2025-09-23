import { ProgrammingLanguage } from '../languages/Language';

export type RuleExampleInput = {
  positive: string;
  negative: string;
  language: ProgrammingLanguage;
};

export type RuleWithExamples = {
  content: string;
  examples?: RuleExampleInput[];
};
