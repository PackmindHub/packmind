export type FileSection = {
  key: string;
  content: string;
};

export type FileModification =
  | {
      path: string;
      content: string;
      isBase64?: boolean;
      sections?: never;
    }
  | {
      path: string;
      content?: never;
      sections: FileSection[];
    };

export enum DeleteItemType {
  File = 'file',
  Directory = 'directory',
}

export type DeleteItem = {
  path: string;
  type: DeleteItemType;
};

export type FileUpdates = {
  createOrUpdate: FileModification[];
  delete: DeleteItem[];
};
