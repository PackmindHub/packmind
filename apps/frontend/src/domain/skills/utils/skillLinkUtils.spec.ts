import {
  buildSkillLinkTransformer,
  resolveRelativeSkillPath,
} from './skillLinkUtils';

describe('resolveRelativeSkillPath', () => {
  it('resolves a sibling reference from the skill root', () => {
    expect(resolveRelativeSkillPath('', './helpers/foo.md')).toBe(
      'helpers/foo.md',
    );
  });

  it('resolves a path that does not start with ./', () => {
    expect(resolveRelativeSkillPath('', 'helpers/foo.md')).toBe(
      'helpers/foo.md',
    );
  });

  it('resolves a sibling within a sub-directory', () => {
    expect(resolveRelativeSkillPath('subdir', './page.md')).toBe(
      'subdir/page.md',
    );
  });

  it('walks up with ..', () => {
    expect(resolveRelativeSkillPath('subdir', '../other/foo.md')).toBe(
      'other/foo.md',
    );
  });

  it('collapses multiple .. segments', () => {
    expect(resolveRelativeSkillPath('a/b/c', '../../x.md')).toBe('a/x.md');
  });
});

describe('buildSkillLinkTransformer', () => {
  const ctx = {
    orgSlug: 'acme',
    spaceSlug: 'team',
    skillSlug: 'my-skill',
    currentFilePath: 'SKILL.md',
  };

  it('rewrites a relative link to the skill file route', () => {
    const transform = buildSkillLinkTransformer(ctx);
    expect(transform('./helpers/foo.md')).toBe(
      '/org/acme/space/team/skills/my-skill/files/helpers/foo.md',
    );
  });

  it('preserves the query and hash on a relative link', () => {
    const transform = buildSkillLinkTransformer(ctx);
    expect(transform('./helpers/foo.md#section?x=1')).toBe(
      '/org/acme/space/team/skills/my-skill/files/helpers/foo.md#section?x=1',
    );
  });

  it('resolves relative links from a sub-directory file', () => {
    const transform = buildSkillLinkTransformer({
      ...ctx,
      currentFilePath: 'subdir/page.md',
    });
    expect(transform('./neighbor.md')).toBe(
      '/org/acme/space/team/skills/my-skill/files/subdir/neighbor.md',
    );
    expect(transform('../top.md')).toBe(
      '/org/acme/space/team/skills/my-skill/files/top.md',
    );
  });

  it('leaves http(s), mailto, root-absolute, and anchor hrefs unchanged', () => {
    const transform = buildSkillLinkTransformer(ctx);
    expect(transform('https://example.com/x')).toBe('https://example.com/x');
    expect(transform('http://example.com/x')).toBe('http://example.com/x');
    expect(transform('mailto:foo@bar.com')).toBe('mailto:foo@bar.com');
    expect(transform('//cdn.example.com/x')).toBe('//cdn.example.com/x');
    expect(transform('/some/other/path')).toBe('/some/other/path');
    expect(transform('#section')).toBe('#section');
  });

  it('returns the href unchanged when slugs are missing', () => {
    const transform = buildSkillLinkTransformer({
      ...ctx,
      orgSlug: undefined,
    });
    expect(transform('./helpers/foo.md')).toBe('./helpers/foo.md');
  });
});
