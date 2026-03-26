import fs from 'node:fs/promises';
import path from 'node:path';

const SKILL_FILE_NAME = 'SKILL.md';

const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  '.yarn',
  '.pnpm',
  '.pnpm-store',
  '.cache',
  '.git',
  '.svn',
  '.hg',
  '.turbo',
  '.nx',
]);

function isMissingPathError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return 'code' in error
    ? error.code === 'ENOENT' || error.code === 'ENOTDIR'
    : false;
}

export function addResolvedSkillPath(
  resolvedSkillPaths: string[],
  seenPaths: Set<string>,
  candidatePath: string,
): void {
  if (seenPaths.has(candidatePath)) {
    return;
  }

  seenPaths.add(candidatePath);
  resolvedSkillPaths.push(candidatePath);
}

async function skillFileExists(directoryPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(directoryPath, SKILL_FILE_NAME));
    return true;
  } catch {
    return false;
  }
}

export async function resolveSkillDirectoryRoot(
  absolutePath: string,
): Promise<string> {
  if (path.basename(absolutePath) === SKILL_FILE_NAME) {
    return path.dirname(absolutePath);
  }

  try {
    if ((await fs.stat(absolutePath)).isDirectory()) {
      return absolutePath;
    }
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }

    return absolutePath;
  }

  let current = path.dirname(absolutePath);
  const root = path.parse(current).root;

  while (current !== root) {
    if (await skillFileExists(current)) {
      return current;
    }
    current = path.dirname(current);
  }

  return absolutePath;
}

async function findNestedSkillDirectories(
  directoryPath: string,
): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });
  const containsSkillFile = entries.some(
    (entry) => entry.isFile() && entry.name === SKILL_FILE_NAME,
  );

  if (containsSkillFile) {
    return [directoryPath];
  }

  const nestedDirectories = entries
    .filter(
      (entry) =>
        entry.isDirectory() && !IGNORED_DIRECTORY_NAMES.has(entry.name),
    )
    .map((entry) => path.join(directoryPath, entry.name))
    .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));

  const discoveredSkillDirectories: string[] = [];

  for (const nestedDirectory of nestedDirectories) {
    const nestedSkillDirectories =
      await findNestedSkillDirectories(nestedDirectory);
    discoveredSkillDirectories.push(...nestedSkillDirectories);
  }

  return discoveredSkillDirectories;
}

async function addNestedSkillDirectories(
  skillDirectoryRoot: string,
  resolvedSkillPaths: string[],
  seenPaths: Set<string>,
): Promise<boolean> {
  let skillDirectoryRootStat: Awaited<ReturnType<typeof fs.stat>> | undefined;

  try {
    skillDirectoryRootStat = await fs.stat(skillDirectoryRoot);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }

    return false;
  }

  if (!skillDirectoryRootStat.isDirectory()) {
    return false;
  }

  const discoveredSkillDirectories =
    await findNestedSkillDirectories(skillDirectoryRoot);

  for (const candidatePath of discoveredSkillDirectories) {
    addResolvedSkillPath(resolvedSkillPaths, seenPaths, candidatePath);
  }

  return true;
}

export async function resolveSkillInputPaths(
  inputPaths: readonly string[],
  cwd: string,
): Promise<string[]> {
  const resolvedSkillPaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const inputPath of inputPaths) {
    const absoluteInputPath = path.resolve(cwd, inputPath);
    const skillDirectoryRoot =
      await resolveSkillDirectoryRoot(absoluteInputPath);

    const resolvedNestedDirectories = await addNestedSkillDirectories(
      skillDirectoryRoot,
      resolvedSkillPaths,
      seenPaths,
    );

    if (resolvedNestedDirectories) {
      continue;
    }

    addResolvedSkillPath(resolvedSkillPaths, seenPaths, skillDirectoryRoot);
  }

  return resolvedSkillPaths;
}
