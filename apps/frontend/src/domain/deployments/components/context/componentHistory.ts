/**
 * What has happened to one component, read off the versions the API sends.
 *
 * Pure, beside `componentMaintenance` and `packageActivity`, and for the same
 * reason: three entities disagree about what a version carries, and the pane is
 * the wrong place to work that out.
 */

/** A commit a version came out of, as much of it as is worth a row. */
export type HistoryCommit = {
  sha: string;
  /** The first seven characters, which is how a sha is read. */
  shortSha: string;
  author: string;
  /** The first line only. A body belongs on the commit, not in a list. */
  subject: string;
  /** Null when the payload carries no link to follow. */
  url: string | null;
};

export type HistoryEntry = {
  key: string;
  version: number;
  /** Null when the payload sent no date, which no version type declares. */
  createdAt: string | null;
  /** Null when this version did not come out of a commit. */
  commit: HistoryCommit | null;
  /**
   * Who cut this version, when the version says. An id and not a name: the
   * version carries one and the name lives with the organisation's members,
   * which is a query away. `historyAuthor` puts the two together.
   */
  userId: string | null;
  /**
   * The name this component had one version ago, when this version changed it.
   *
   * The one thing a history can say about *what* changed without reading two
   * blobs of prose against each other. It does not claim the rename was the
   * only change in the version, only that it happened in it.
   */
  renamedFrom: string | null;
};

/**
 * The three version types, as loosely as they agree.
 *
 * `createdAt` is optional because none of `StandardVersion`, `CommandVersion`
 * or `SkillVersion` declares it, even though all three tables are
 * `WithTimestamps` and all three payloads carry it. `CommandVersionsListDrawer`
 * casts to reach it; this reads it and does not insist.
 *
 * `gitCommit` is optional because only two of the three can have one:
 * `SkillVersion` has no such field, so a skill's history is dates and numbers
 * and nothing else.
 */
type VersionLike = {
  id: string;
  version: number;
  name?: string;
  userId?: string | null;
  createdAt?: Date | string | null;
  gitCommit?: {
    sha: string;
    message: string;
    author: string;
    url: string;
  } | null;
};

/**
 * The versions as rows, newest first.
 *
 * Ordered by version number and not by date. The number is the one field every
 * version type declares and the one the API cannot omit, and it is what the
 * reader is matching against the `v4` in the header. Dates break the tie only
 * when two rows claim the same number, which should not happen and is not worth
 * an unstable order if it does.
 */
export function historyEntries(
  versions: readonly VersionLike[] | undefined,
): HistoryEntry[] {
  if (!versions) return [];

  return [...versions]
    .sort((first, second) => {
      if (second.version !== first.version) {
        return second.version - first.version;
      }
      return (
        (readDate(second.createdAt) ?? 0) - (readDate(first.createdAt) ?? 0)
      );
    })
    .map((version, index, ordered) => ({
      key: version.id,
      version: version.version,
      createdAt: readIso(version.createdAt),
      commit: readCommit(version.gitCommit),
      userId: version.userId ?? null,
      /*
       * Against the next row down, which is the version before this one now
       * that the list is ordered. The oldest row has nothing to compare
       * against, so it never claims a rename: a component being created with
       * the name it has is not a rename.
       */
      renamedFrom: readRename(version.name, ordered[index + 1]?.name),
    }));
}

function readRename(
  name: string | undefined,
  previous: string | undefined,
): string | null {
  if (!name || !previous) return null;
  return name === previous ? null : previous;
}

/**
 * The name to print beside a version, or nothing.
 *
 * The commit's author wins when there is one, because it is the identity that
 * actually made the change: a version cut by a push belongs to whoever pushed,
 * not to whoever happened to be holding the session.
 */
export function historyAuthor(
  entry: HistoryEntry,
  displayNames: ReadonlyMap<string, string>,
): string | null {
  if (entry.commit?.author) return entry.commit.author;
  if (entry.userId) return displayNames.get(entry.userId) ?? null;
  return null;
}

/**
 * The organisation's members by id, so a version's `userId` can be read as a
 * person. An empty map while the query is in flight, which reads as "no name
 * yet" rather than as "nobody".
 */
export function displayNamesById(
  users: readonly { userId: string; displayName: string }[] | undefined,
): Map<string, string> {
  return new Map((users ?? []).map((user) => [user.userId, user.displayName]));
}

function readDate(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Nothing rather than a fallback, the rule the rest of this surface follows: a
 * row with no date says less, and never says the version was cut just now.
 */
function readIso(value: Date | string | null | undefined): string | null {
  const parsed = readDate(value);
  return parsed === null ? null : new Date(parsed).toISOString();
}

function readCommit(commit: VersionLike['gitCommit']): HistoryCommit | null {
  if (!commit?.sha) return null;

  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    author: commit.author,
    subject: firstLine(commit.message),
    url: commit.url || null,
  };
}

function firstLine(message: string | undefined): string {
  if (!message) return '';
  const [line] = message.split('\n');
  return line.trim();
}
