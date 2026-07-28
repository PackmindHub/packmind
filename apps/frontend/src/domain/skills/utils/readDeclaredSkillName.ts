import { parse as parseYaml } from 'yaml';

import { DetectedSkill } from './collectSkillsFromFiles';

const SKILL_MANIFEST = 'SKILL.md';
const FRONTMATTER_DELIMITER = '---';

const readAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read "${file.name}"`));
    reader.readAsText(file);
  });

/**
 * Extracts the frontmatter block, delimited the way parseSkillMdContent in
 * @packmind/node-utils does it — the parser the server actually runs.
 */
const frontmatterOf = (content: string): string | undefined => {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) return undefined;

  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER,
  );
  if (closing === -1) return undefined;

  return lines.slice(1, closing).join('\n');
};

/**
 * Reads the `name` a skill declares in its SKILL.md frontmatter.
 *
 * This — not the directory name — is the identity the upload endpoint uses: it
 * resolves an existing skill by `slug(name)` taken from the frontmatter and
 * never looks at the folder. Anything that compares names (conflict detection,
 * duplicate detection, what the user is shown) has to key off this, or a folder
 * whose name differs from what it declares slips past every check and silently
 * updates an unrelated skill.
 *
 * Returns undefined when there is no readable frontmatter name, in which case
 * the caller should fall back to the directory name and let the server reject
 * it — its parse errors are clearer than anything guessed here.
 */
export async function readDeclaredSkillName(
  skill: DetectedSkill,
): Promise<string | undefined> {
  const manifest = skill.files.find(
    (file) => file.relativePath === SKILL_MANIFEST,
  );
  if (!manifest) return undefined;

  let frontmatter: string | undefined;
  try {
    frontmatter = frontmatterOf(await readAsText(manifest.file));
  } catch {
    return undefined;
  }
  if (frontmatter === undefined) return undefined;

  try {
    const properties = parseYaml(frontmatter);
    const name = (properties as Record<string, unknown> | null)?.['name'];
    return typeof name === 'string' && name.trim() !== ''
      ? name.trim()
      : undefined;
  } catch {
    // Malformed YAML — the server reports it far better than a guess would.
    return undefined;
  }
}
