import { NewSkillPayload } from '@packmind/types';
import { parseSkillMdContent } from '@packmind/node-utils';

const SKILL_MD_FILENAME = 'SKILL.md';

type SkillFile = {
  relativePath: string;
  content: string;
  permissions: string;
  isBase64: boolean;
};

type ParseSkillDirectorySuccess = {
  success: true;
  payload: NewSkillPayload;
};

type ParseSkillDirectoryFailure = {
  success: false;
  error: string;
};

export type ParseSkillDirectoryResult =
  | ParseSkillDirectorySuccess
  | ParseSkillDirectoryFailure;

/**
 * Parses a skill directory's files into a NewSkillPayload.
 *
 * Expects at least a SKILL.md file with valid frontmatter containing
 * `name` and `description`, plus a non-empty body (prompt).
 * Additional files are mapped as supporting skill files.
 */
export function parseSkillDirectory(
  files: SkillFile[],
): ParseSkillDirectoryResult {
  const skillMdFile = files.find((f) => f.relativePath === SKILL_MD_FILENAME);

  if (!skillMdFile) {
    return {
      success: false,
      error: 'Skill directory does not contain a SKILL.md file.',
    };
  }

  const parsed = parseSkillMdContent(skillMdFile.content);
  if (!parsed) {
    return {
      success: false,
      error: 'Failed to parse SKILL.md: file must have valid YAML frontmatter.',
    };
  }

  const { properties, body } = parsed;

  const name = properties.name;
  if (typeof name !== 'string' || name.trim().length === 0) {
    return {
      success: false,
      error: 'SKILL.md is missing a required "name" property in frontmatter.',
    };
  }

  const description = properties.description;
  if (typeof description !== 'string' || description.trim().length === 0) {
    return {
      success: false,
      error:
        'SKILL.md is missing a required "description" property in frontmatter.',
    };
  }

  if (body.trim().length === 0) {
    return {
      success: false,
      error: 'SKILL.md body (prompt) cannot be empty.',
    };
  }

  const payload: NewSkillPayload = {
    name: name.trim(),
    description: description.trim(),
    prompt: body,
    skillMdPermissions: skillMdFile.permissions,
  };

  if (typeof properties.license === 'string') {
    payload.license = properties.license;
  }

  if (typeof properties.compatibility === 'string') {
    payload.compatibility = properties.compatibility;
  }

  if (typeof properties.allowedTools === 'string') {
    payload.allowedTools = properties.allowedTools;
  }

  const supportingFiles = files.filter(
    (f) => f.relativePath !== SKILL_MD_FILENAME,
  );
  payload.files = supportingFiles.map((f) => ({
    path: f.relativePath,
    content: f.content,
    permissions: f.permissions,
    isBase64: f.isBase64,
  }));

  return { success: true, payload };
}
