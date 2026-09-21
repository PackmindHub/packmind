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
      artifactSlug?: string;
      artifactId?: string;
      artifactVersion?: number;
      spaceId?: string;
      packageIds?: string[];
      skillFileId?: string;
      skillFilePermissions?: string;
      /**
       * Picks which half of the lockfile's `artifacts` keyspace the entry lands
       * in: `PackmindLockFileService.buildLockFile` emits `default:${type}:${slug}`
       * for `'default'` and `user:${type}:${slug}` otherwise. See
       * `PackmindLockFileEntrySource`.
       */
      source?: 'default' | 'user';
    }
  | {
      path: string;
      content?: never;
      sections: FileSection[];
      artifactType?: ArtifactType;
      artifactName?: string;
      artifactSlug?: string;
      artifactId?: string;
      artifactVersion?: number;
      spaceId?: string;
      packageIds?: string[];
      skillFileId?: string;
      skillFilePermissions?: string;
      /**
       * Picks which half of the lockfile's `artifacts` keyspace the entry lands
       * in: `PackmindLockFileService.buildLockFile` emits `default:${type}:${slug}`
       * for `'default'` and `user:${type}:${slug}` otherwise. See
       * `PackmindLockFileEntrySource`.
       */
      source?: 'default' | 'user';
    };

export enum DeleteItemType {
  File = 'file',
  Directory = 'directory',
}

export type DeleteItem = {
  path: string;
  type: DeleteItemType;
};

export type SkillFileOutput = {
  path: string;
  content: string;
  isBase64?: boolean;
  skillFileId?: string;
  skillFilePermissions?: string;
};

export type FileUpdates = {
  createOrUpdate: FileModification[];
  delete: DeleteItem[];
};
