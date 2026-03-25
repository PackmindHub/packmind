import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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

export function resolveSkillDirectoryRoot(absolutePath: string): string {
  if (path.basename(absolutePath) === SKILL_FILE_NAME) {
    return path.dirname(absolutePath);
  }

  try {
    if (fs.statSync(absolutePath).isDirectory()) {
      return absolutePath;
    }
  } catch {
    return absolutePath;
  }

  let current = path.dirname(absolutePath);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, SKILL_FILE_NAME))) {
      return current;
    }
    current = path.dirname(current);
  }

  return absolutePath;
}

async function findNestedSkillDirectories(
  directoryPath: string,
): Promise<string[]> {
  const entries = await fsPromises.readdir(directoryPath, {
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

export async function resolveSkillInputPaths(
  inputPaths: readonly string[],
  cwd: string,
): Promise<string[]> {
  const resolvedSkillPaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const inputPath of inputPaths) {
    const absoluteInputPath = path.resolve(cwd, inputPath);
    const skillDirectoryRoot = resolveSkillDirectoryRoot(absoluteInputPath);

    try {
      const stat = await fsPromises.stat(skillDirectoryRoot);
      if (stat.isDirectory()) {
        const discoveredSkillDirectories =
          await findNestedSkillDirectories(skillDirectoryRoot);

        for (const candidatePath of discoveredSkillDirectories) {
          if (!seenPaths.has(candidatePath)) {
            seenPaths.add(candidatePath);
            resolvedSkillPaths.push(candidatePath);
          }
        }
        continue;
      }
    } catch {
      // Preserve the previous behavior for missing or unreadable inputs by
      // passing the resolved path through to the upload flow, which will
      // surface the underlying filesystem error consistently.
    }

    if (!seenPaths.has(skillDirectoryRoot)) {
      seenPaths.add(skillDirectoryRoot);
      resolvedSkillPaths.push(skillDirectoryRoot);
    }
  }

  return resolvedSkillPaths;
}
