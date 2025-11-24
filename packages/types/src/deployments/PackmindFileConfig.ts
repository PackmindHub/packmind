export type PackmindFileConfig = {
  packages: {
    [slug: string]: string;
  };
};

export type HierarchicalConfigResult = {
  packages: {
    [slug: string]: string;
  };
  configPaths: string[];
  hasConfigs: boolean;
};
