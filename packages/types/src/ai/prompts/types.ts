export type TokensUsed = {
  input: number;
  output: number;
  details?: TokensUsedByOperation[];
};

export type TokensUsedByOperation = {
  operation?: string;
  input: number;
  output: number;
};
