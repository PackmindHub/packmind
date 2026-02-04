// Standard creation types (atomic)
export type CreateStandardInSpaceCommand = {
  name: string;
  description: string;
  scope: string;
  rules: Array<{
    content: string;
    examples?: Array<{
      lang: string;
      positive: string;
      negative: string;
    }>;
  }>;
};

export type CreateStandardInSpaceResult = {
  id: string;
  name: string;
};

export type RuleWithId = {
  id: string;
  content: string;
};

export type RuleExample = {
  language: string;
  positive: string;
  negative: string;
};

// List Standards types
export type ListedStandard = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type ListStandardsResult = ListedStandard[];

export interface IStandardsGateway {
  create(
    spaceId: string,
    data: CreateStandardInSpaceCommand,
  ): Promise<CreateStandardInSpaceResult>;

  getRules(spaceId: string, standardId: string): Promise<RuleWithId[]>;

  addExampleToRule(
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: RuleExample,
  ): Promise<void>;

  list(): Promise<ListStandardsResult>;

  getBySlug(slug: string): Promise<ListedStandard | null>;
}
