export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_SKILL = 100;

const SKILL_MANIFEST = 'SKILL.md';

const asMegabytes = (bytes: number): number => bytes / (1024 * 1024);

/**
 * Mirrors BLACKLIST_PATTERNS in apps/cli/src/infra/utils/readSkillDirectory.ts
 * ('**\/.DS_Store', '**\/node_modules', '**\/node_modules/**'). Expressed as
 * plain segment checks so the frontend needs no glob dependency — keep the two
 * lists in sync, since both feed the same upload endpoint.
 */
const BLACKLISTED_NAMES = ['.DS_Store'];
const BLACKLISTED_SEGMENTS = ['node_modules'];

export type DetectedSkillFile = {
  /** Path relative to the skill directory, e.g. `references/guide.md`. */
  relativePath: string;
  file: File;
};

export type DetectedSkill = {
  name: string;
  files: DetectedSkillFile[];
  totalSize: number;
  validationError?: string;
};

/**
 * A directory picker puts the path relative to the picked folder on
 * `webkitRelativePath`; a plain file input leaves only `name`.
 */
const pathOf = (file: File): string =>
  (
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
    file.name
  )
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

const isBlacklisted = (path: string): boolean => {
  const segments = path.split('/');
  return (
    BLACKLISTED_NAMES.includes(segments[segments.length - 1]) ||
    segments.some((segment) => BLACKLISTED_SEGMENTS.includes(segment))
  );
};

/**
 * Longest match wins, so a skill nested inside another skill's directory claims
 * its own files rather than leaking them into the outer skill.
 */
const rootFor = (path: string, roots: Set<string>): string | undefined => {
  let match: string | undefined;
  for (const root of roots) {
    if (!path.startsWith(`${root}/`)) continue;
    if (match === undefined || root.length > match.length) match = root;
  }
  return match;
};

const validate = (
  files: DetectedSkillFile[],
  totalSize: number,
): string | undefined => {
  if (!files.some((f) => f.relativePath === SKILL_MANIFEST)) {
    return `${SKILL_MANIFEST} is missing`;
  }

  const oversized = files.find((f) => f.file.size > MAX_FILE_SIZE_BYTES);
  if (oversized) {
    return `"${oversized.relativePath}" exceeds the maximum file size of ${asMegabytes(MAX_FILE_SIZE_BYTES)} MB`;
  }

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return `Skill total size exceeds ${asMegabytes(MAX_TOTAL_SIZE_BYTES)} MB`;
  }

  if (files.length > MAX_FILES_PER_SKILL) {
    return `Skill contains ${files.length} files, but the maximum allowed is ${MAX_FILES_PER_SKILL}`;
  }

  return undefined;
};

/**
 * Groups a flat file selection into the skills it represents.
 *
 * A skill is the directory that directly contains a `SKILL.md`. Resolving those
 * roots first — rather than grouping each file under its immediate parent — is
 * what lets a skill keep its subdirectories: `references/guide.md` stays a file
 * of the skill instead of becoming a skill named "references". The relative
 * paths produced here are the ones the upload endpoint receives, and it expects
 * the manifest at exactly `SKILL.md`.
 */
export function collectSkillsFromFiles(files: File[]): DetectedSkill[] {
  const selection = files
    .map((file) => ({ file, path: pathOf(file) }))
    .filter(({ path }) => !isBlacklisted(path));

  const roots = new Set<string>();
  for (const { path } of selection) {
    const segments = path.split('/').filter(Boolean);
    if (segments[segments.length - 1] !== SKILL_MANIFEST) continue;
    // A bare SKILL.md with no directory above it carries no skill name.
    if (segments.length < 2) continue;
    roots.add(segments.slice(0, -1).join('/'));
  }

  // Keyed by directory path rather than by display name: two directories may
  // share a leaf name, and merging them would upload one skill built from both.
  const grouped = new Map<
    string,
    { name: string; files: DetectedSkillFile[] }
  >();

  const add = (key: string, name: string, entry: DetectedSkillFile): void => {
    const group = grouped.get(key) ?? { name, files: [] };
    group.files.push(entry);
    grouped.set(key, group);
  };

  for (const { file, path } of selection) {
    const root = rootFor(path, roots);

    if (root !== undefined) {
      add(root, root.split('/').pop() as string, {
        relativePath: path.slice(root.length + 1),
        file,
      });
      continue;
    }

    // No SKILL.md above this file. Group it by its immediate parent anyway so
    // the user gets a "SKILL.md is missing" row instead of silence.
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) continue;
    add(segments.slice(0, -1).join('/'), segments[segments.length - 2], {
      relativePath: segments[segments.length - 1],
      file,
    });
  }

  return [...grouped.values()].map(({ name, files: skillFiles }) => {
    const totalSize = skillFiles.reduce((sum, f) => sum + f.file.size, 0);
    return {
      name,
      files: skillFiles,
      totalSize,
      validationError: validate(skillFiles, totalSize),
    };
  });
}
