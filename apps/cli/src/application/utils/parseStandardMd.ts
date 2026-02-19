export type ParsedStandardMd = {
  name: string;
  description: string;
  scope: string;
  frontmatterName?: string;
  frontmatterDescription?: string;
};

type DeployerParser = {
  pattern: string;
  parse: (content: string) => ParsedStandardMd | null;
};

const DEPLOYER_PARSERS: DeployerParser[] = [
  { pattern: '.packmind/standards/', parse: parsePackmindStandard },
  { pattern: '.claude/rules/packmind/standard-', parse: parseClaudeStandard },
  { pattern: '.cursor/rules/packmind/standard-', parse: parseCursorStandard },
  {
    pattern: '.continue/rules/packmind/standard-',
    parse: parseContinueStandard,
  },
  { pattern: '.github/instructions/packmind-', parse: parseCopilotStandard },
];

export function parseStandardMd(
  content: string,
  filePath: string,
): ParsedStandardMd | null {
  const deployer = DEPLOYER_PARSERS.find((d) => filePath.includes(d.pattern));
  if (!deployer) {
    return null;
  }
  return deployer.parse(content);
}

function parsePackmindStandard(content: string): ParsedStandardMd | null {
  const lines = content.split('\n');
  let name: string | null = null;
  let nameLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ') && !lines[i].startsWith('## ')) {
      const extracted = lines[i].slice(2).trim();
      if (extracted) {
        name = extracted;
        nameLineIndex = i;
        break;
      }
    }
  }

  if (!name) {
    return null;
  }

  const descriptionLines: string[] = [];
  for (let i = nameLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    if (lines[i].startsWith('* ')) break;
    if (lines[i].startsWith('- ')) break;
    descriptionLines.push(lines[i]);
  }

  return {
    name,
    description: descriptionLines.join('\n').trim(),
    scope: '',
  };
}

function parseClaudeStandard(content: string): ParsedStandardMd | null {
  const { frontmatter, body } = extractFrontmatter(content);
  const scope = extractScopeFromKey(frontmatter, 'paths');
  const parsed = parseIdeStandardBody(body, scope);
  if (!parsed) return null;
  return addFrontmatterFields(parsed, frontmatter);
}

function parseCursorStandard(content: string): ParsedStandardMd | null {
  const { frontmatter, body } = extractFrontmatter(content);
  const scope = extractScopeFromKey(frontmatter, 'globs');
  return parseIdeStandardBody(body, scope);
}

function parseContinueStandard(content: string): ParsedStandardMd | null {
  const { frontmatter, body } = extractFrontmatter(content);
  const scope = extractScopeFromKey(frontmatter, 'globs');
  const parsed = parseIdeStandardBody(body, scope);
  if (!parsed) return null;
  return addFrontmatterFields(parsed, frontmatter);
}

function parseCopilotStandard(content: string): ParsedStandardMd | null {
  const { frontmatter, body } = extractFrontmatter(content);
  const rawScope = extractFrontmatterValue(frontmatter, 'applyTo');
  let scope = '';
  if (rawScope) {
    const stripped = rawScope.replace(/^['"]|['"]$/g, '');
    scope = stripped === '**' ? '' : stripped;
  }
  return parseIdeStandardBody(body, scope);
}

// --- Shared helpers ---

function extractFrontmatter(content: string): {
  frontmatter: string;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: '', body: content };
  }
  return {
    frontmatter: match[1],
    body: content.slice(match[0].length),
  };
}

function parseIdeStandardBody(
  body: string,
  scope: string,
): ParsedStandardMd | null {
  const lines = body.split('\n');
  let name: string | null = null;
  let nameLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## Standard: ')) {
      const extracted = lines[i].slice('## Standard: '.length).trim();
      if (extracted) {
        name = extracted;
        nameLineIndex = i;
        break;
      }
    }
  }

  if (!name) {
    return null;
  }

  const descriptionLines: string[] = [];
  for (let i = nameLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('* ')) break;
    if (lines[i].startsWith('- ')) break;
    if (lines[i].startsWith('Full standard is available')) break;
    descriptionLines.push(lines[i]);
  }

  let description = descriptionLines.join('\n').trim();
  if (description.endsWith(' :')) {
    description = description.slice(0, -2).trim();
  }

  return { name, description, scope };
}

function addFrontmatterFields(
  parsed: ParsedStandardMd,
  frontmatter: string,
): ParsedStandardMd {
  const fmName = extractFrontmatterValue(frontmatter, 'name');
  const fmDescription = extractFrontmatterValue(frontmatter, 'description');
  return {
    ...parsed,
    ...(fmName ? { frontmatterName: fmName } : {}),
    ...(fmDescription ? { frontmatterDescription: fmDescription } : {}),
  };
}

function extractFrontmatterValue(frontmatter: string, key: string): string {
  if (!frontmatter) return '';
  for (const line of frontmatter.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}:`)) {
      return trimmed.slice(key.length + 1).trim();
    }
  }
  return '';
}

function extractScopeFromKey(frontmatter: string, key: string): string {
  const rawValue = extractFrontmatterValue(frontmatter, key);
  if (!rawValue) return '';
  return normalizeScopeValue(rawValue);
}

function normalizeScopeValue(rawValue: string): string {
  if (!rawValue) return '';

  // YAML array: ["**/*.ts", "**/*.tsx"]
  if (rawValue.startsWith('[')) {
    const inner = rawValue.slice(1, -1);
    const items = inner
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''));
    return items.join(', ');
  }

  // Quoted string: "**/*.ts"
  return rawValue.replace(/^["']|["']$/g, '');
}
