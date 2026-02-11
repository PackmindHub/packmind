export type FileSection = {
  key: string;
  content: string;
};

export type ArtifactType = 'command' | 'standard' | 'skill';

export type FileModification =
  | {
      path: string;
      content: string;
      isBase64?: boolean;
      sections?: never;
      artifactType?: ArtifactType;
      artifactName?: string;
    }
  | {
      path: string;
      content?: never;
      sections: FileSection[];
      artifactType?: ArtifactType;
      artifactName?: string;
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
