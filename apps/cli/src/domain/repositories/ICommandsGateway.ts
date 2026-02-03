// Create command types
export type CreateCommandCommand = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
};

export type CreateCommandResult = {
  id: string;
  name: string;
  slug: string;
};

// List Commands types
export type ListedCommand = {
  id: string;
  slug: string;
  name: string;
};

export type ListCommandsResult = ListedCommand[];

export interface ICommandsGateway {
  create(
    spaceId: string,
    data: CreateCommandCommand,
  ): Promise<CreateCommandResult>;
  list(): Promise<ListCommandsResult>;
}
