export type LinterStatus = 'active' | 'draft' | 'not-configured';

export type DetectabilityStatus = 'success' | 'fail' | 'pending';

export type ProgramStatus = 'active' | 'draft-ok' | 'draft-fail' | 'none';

export type CodeExample = {
  id: string;
  positive: string;
  negative: string;
};

export type DetectionProgram = {
  status: ProgramStatus;
  canBeDetected: boolean;
  programGenerated: boolean;
  readyToUse: boolean;
};

export type LanguageLinterConfig = {
  language: string;
  linterStatus: LinterStatus;
  detectability: DetectabilityStatus;
  codeExamples: CodeExample[];
  activeProgram?: DetectionProgram;
  draftProgram?: DetectionProgram;
};

export type MockRule = {
  id: string;
  content: string;
  linterStatus: LinterStatus;
  languageConfigs: LanguageLinterConfig[];
};

export type MockStandard = {
  id: string;
  name: string;
  description: string;
  version: number;
  lastUpdated: string;
  packageName: string;
  rules: MockRule[];
};
