import { parse } from 'yaml';

const FRONTMATTER_DELIMITER = '---';

/**
 * What a command's leading YAML block turned out to be, and what is left of the
 * file once it is taken out.
 *
 * Unlike a skill, a command has no frontmatter columns: the whole file is kept
 * verbatim in `content`, so every surface that shows a command has to find the
 * block itself. Rendering `content` as Markdown is what the Context pane did,
 * and a closing `---` under a `description:` line is a setext heading, so the
 * description came out as the page's largest title.
 */
export type CommandFrontmatter = {
  /**
   * The block's keys in the order it declared them, or `null` when there is a
   * block and it is not a YAML mapping. The distinction matters: `null` is a
   * command whose frontmatter cannot be read, and the raw text is then the only
   * honest thing to show.
   */
  fields: ReadonlyArray<readonly [string, unknown]> | null;
  /** The block as written, without its delimiters. `null` when there is none. */
  raw: string | null;
  /** The Markdown that follows the closing delimiter. */
  body: string;
};

/**
 * Splits a command's stored content into its frontmatter and its instructions.
 *
 * The block is taken out of the body whether or not it parses: a block that
 * cannot be read is still not Markdown, and leaving it in is what produced the
 * heading. What changes with parsing is only how it is shown afterwards.
 */
export function parseCommandFrontmatter(content: string): CommandFrontmatter {
  const normalized = content.replace(/\r\n/g, '\n');

  if (!normalized.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    return { fields: null, raw: null, body: content };
  }

  const afterOpening = normalized.slice(FRONTMATTER_DELIMITER.length + 1);
  const closingIndex = afterOpening.indexOf(`\n${FRONTMATTER_DELIMITER}`);

  // An opening delimiter with no closing one is not a frontmatter block, it is
  // a document that happens to start with a horizontal rule.
  if (closingIndex === -1) {
    return { fields: null, raw: null, body: content };
  }

  const raw = afterOpening.slice(0, closingIndex);
  const body = afterOpening
    .slice(closingIndex + FRONTMATTER_DELIMITER.length + 1)
    .trimStart();

  return { fields: parseFields(raw), raw, body };
}

/**
 * The `description` key, which is the one field a command's frontmatter is
 * expected to carry and the one the rest of the app wants to show: it is a
 * command's summary in every list it appears in.
 *
 * Falls back to the first non-empty line of the instructions, so a command
 * written without frontmatter still says something about itself.
 */
export function commandSummary(content: string): string {
  const { fields, body } = parseCommandFrontmatter(content);

  const description = fields?.find(([key]) => key === 'description')?.[1];
  if (typeof description === 'string' && description.trim()) {
    return description.trim();
  }

  return firstProseLine(body);
}

function parseFields(
  raw: string,
): ReadonlyArray<readonly [string, unknown]> | null {
  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return Object.entries(parsed as Record<string, unknown>);
}

/**
 * The first line that reads as a sentence: headings, list bullets and fence
 * markers are the shape of the document rather than what it says, and a row
 * showing "# Release app" under the name "Release app" says it twice.
 */
function firstProseLine(body: string): string {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('```')) continue;
    if (/^[-*+]\s/.test(trimmed)) continue;
    if (/^\d+\.\s/.test(trimmed)) continue;
    return trimmed;
  }
  return '';
}
