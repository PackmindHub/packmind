import { routes } from '../../../shared/utils/routes';

const ABSOLUTE_URI_PATTERN = /^[a-z][a-z0-9+\-.]*:/i;

const isExternalOrAbsolute = (href: string): boolean =>
  ABSOLUTE_URI_PATTERN.test(href) ||
  href.startsWith('//') ||
  href.startsWith('#') ||
  href.startsWith('/');

export const resolveRelativeSkillPath = (
  baseDir: string,
  relativePath: string,
): string => {
  const segments = (baseDir ? baseDir.split('/') : []).concat(
    relativePath.split('/'),
  );
  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join('/');
};

interface SkillLinkContext {
  orgSlug: string | undefined;
  spaceSlug: string | undefined;
  skillSlug: string | undefined;
  currentFilePath: string;
}

export const buildSkillLinkTransformer = (
  ctx: SkillLinkContext,
): ((href: string) => string) => {
  return (href: string): string => {
    if (isExternalOrAbsolute(href)) return href;
    const { orgSlug, spaceSlug, skillSlug, currentFilePath } = ctx;
    if (!orgSlug || !spaceSlug || !skillSlug) return href;

    const lastSlash = currentFilePath.lastIndexOf('/');
    const baseDir = lastSlash >= 0 ? currentFilePath.slice(0, lastSlash) : '';

    const [pathPart, ...rest] = href.split(/(?=[?#])/);
    const resolved = resolveRelativeSkillPath(baseDir, pathPart);
    if (!resolved) return href;

    return (
      routes.space.toSkillFileWithPath(
        orgSlug,
        spaceSlug,
        skillSlug,
        resolved,
      ) + rest.join('')
    );
  };
};
