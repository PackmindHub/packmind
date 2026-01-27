export interface ICommandStep {
  name: string;
  description: string;
  codeSnippet?: string;
}

export interface ICommandPlaybookInput {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: ICommandStep[];
}

export interface ICreateCommandResult {
  commandId: string;
  name: string;
  slug: string;
}

export interface ICreateCommandFromPlaybookUseCase {
  execute(playbook: ICommandPlaybookInput): Promise<ICreateCommandResult>;
}
