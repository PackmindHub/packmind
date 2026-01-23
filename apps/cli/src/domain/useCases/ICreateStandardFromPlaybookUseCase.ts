export interface IPlaybookInput {
  name: string;
  description: string;
  scope: string;
  rules: Array<{
    content: string;
    examples?: {
      positive: string;
      negative: string;
      language: string;
    };
  }>;
}

export interface ICreateStandardResult {
  standardId: string;
  name: string;
}

export interface ICreateStandardFromPlaybookUseCase {
  execute(playbook: IPlaybookInput): Promise<ICreateStandardResult>;
}
