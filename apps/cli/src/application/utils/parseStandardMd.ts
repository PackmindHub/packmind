export type ParsedStandardMd = {
  name: string;
  description: string;
  scope: string;
  rules: string[];
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
  let rulesStartIndex = -1;
  for (let i = nameLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      rulesStartIndex = i + 1;
      break;
    }
    if (lines[i].startsWith('* ') || lines[i].startsWith('- ')) {
      rulesStartIndex = i;
      break;
    }
    descriptionLines.push(lines[i]);
  }

  const rules = extractRulesList(lines, rulesStartIndex);

  return {
    name,
    description: descriptionLines.join('\n').trim(),
    scope: '',
    rules,
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
    const stripped = rawScope.replace(/(?:^['"])|(?:['"]$)/g, '');
    scope = stripped === '**' ? '' : stripped;
  }
  return parseIdeStandardBody(body, scope);
}

// --- Shared helpers ---

const RULES_FALLBACK = 'No rules defined yet.';

function extractRulesList(lines: string[], startIndex: number): string[] {
  if (startIndex < 0) return [];
  const rules: string[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const content = line.slice(2).trim();
      if (content && content !== RULES_FALLBACK) {
        rules.push(content);
      }
    } else if (line.startsWith('Full standard is available')) {
      break;
    } else if (line.startsWith('## ')) {
      break;
    }
  }
  return rules;
}

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
  let rulesStartIndex = -1;
  for (let i = nameLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('* ') || lines[i].startsWith('- ')) {
      rulesStartIndex = i;
      break;
    }
    if (lines[i].startsWith('Full standard is available')) break;
    descriptionLines.push(lines[i]);
  }

  let description = descriptionLines.join('\n').trim();
  if (description.endsWith(' :')) {
    description = description.slice(0, -2).trim();
  }

  const rules = extractRulesList(lines, rulesStartIndex);

  return { name, description, scope, rules };
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
      const raw = trimmed.slice(key.length + 1).trim();
      return stripYamlQuotes(raw);
    }
  }
  return '';
}

function stripYamlQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
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
      .map((item) => item.trim().replace(/(?:^["'])|(?:["']$)/g, ''));
    return items.join(', ');
  }

  // Quoted string: "**/*.ts"
  return rawValue.replace(/(?:^["'])|(?:["']$)/g, '');
}
