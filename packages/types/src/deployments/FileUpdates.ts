export type FileSection = {
  key: string;
  content: string;
};

export type FileModification =
  | {
      path: string;
      content: string;
      sections?: never;
    }
  | {
      path: string;
      content?: never;
      sections: FileSection[];
    };

export type FileUpdates = {
  createOrUpdate: FileModification[];
  delete: { path: string }[];
};
