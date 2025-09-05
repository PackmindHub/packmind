export type LintViolation = {
  file: string;
  violations: {
    line: number;
    character: number;
    rule: string;
    standard: string;
  }[];
};
