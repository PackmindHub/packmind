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
       * Origin discriminator propagated to the lockfile entry.
       *
       * When set to `'default'`, `PackmindLockFileService.buildLockFile` emits
       * the entry under the `default:${type}:${slug}` key (default skills
       * shipped by the CLI server). Otherwise the entry is emitted under the
       * `user:${type}:${slug}` key (user-authored skills and
       * package-distributed artifacts).
       *
       * See `PackmindLockFileEntrySource` in `PackmindLockFile.ts`.
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
       * Origin discriminator propagated to the lockfile entry.
       *
       * When set to `'default'`, `PackmindLockFileService.buildLockFile` emits
       * the entry under the `default:${type}:${slug}` key (default skills
       * shipped by the CLI server). Otherwise the entry is emitted under the
       * `user:${type}:${slug}` key (user-authored skills and
       * package-distributed artifacts).
       *
       * See `PackmindLockFileEntrySource` in `PackmindLockFile.ts`.
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
