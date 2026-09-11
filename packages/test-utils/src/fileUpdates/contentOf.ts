import { FileModification, FileUpdates } from '@packmind/types';

export class MissingFileContentError extends Error {
  constructor(path: string) {
    super(`Expected the file update for '${path}' to carry inline content`);
    this.name = 'MissingFileContentError';
  }
}

export class MissingFileUpdateError extends Error {
  constructor(path: string) {
    super(`Expected a file update for '${path}'`);
    this.name = 'MissingFileUpdateError';
  }
}

/**
 * Narrows a file update to the content-carrying variant of `FileModification`.
 *
 * `FileModification` is a union: one variant holds inline `content`, the other
 * a list of `sections` and no content at all. Assertions that need the rendered
 * text have to rule the section variant out, and a deployer that emitted
 * sections where the spec expected content is a failure worth reporting rather
 * than one to paper over with a default.
 */
export const contentOf = (fileUpdate: FileModification): string => {
  if (fileUpdate.content === undefined) {
    throw new MissingFileContentError(fileUpdate.path);
  }
  return fileUpdate.content;
};

/**
 * The rendered content of the file emitted at `path`, for specs that assert on
 * one file out of many.
 */
export const contentAt = (fileUpdates: FileUpdates, path: string): string => {
  const fileUpdate = fileUpdates.createOrUpdate.find((f) => f.path === path);
  if (!fileUpdate) {
    throw new MissingFileUpdateError(path);
  }
  return contentOf(fileUpdate);
};
