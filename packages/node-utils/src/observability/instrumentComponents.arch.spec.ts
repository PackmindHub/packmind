import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

// packages/node-utils/src/observability -> the repo root.
const repoRoot = resolve(__dirname, '../../../..');
const packagesRoot = join(repoRoot, 'packages');

/**
 * Services and repositories have no adapter to sweep them the way use cases
 * do, so they opt in from their aggregator - `SkillsServices`,
 * `SkillsRepositories` and the like - with an explicit
 * `instrumentComponents([...])` list.
 *
 * Nothing about forgetting that call fails at runtime; the traces just stop
 * one level short, silently. That is the same failure mode
 * `instrumentUseCases.arch.spec.ts` guards against at the use-case level, and
 * it happened here too - three aggregators shipped without the call - so the
 * rule is checked rather than left to review.
 *
 * Only `packages/` is walked: `apps/api` holds no aggregator, and `apps/cli`
 * starts no OTel SDK.
 */
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === 'dist'
        ? []
        : sourceFiles(path);
    }

    return entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
      ? [path]
      : [];
  });

const allSources = sourceFiles(packagesRoot);
const posix = (path: string): string =>
  relative(repoRoot, path).split('\\').join('/');

/** The package a repo-relative path belongs to, e.g. `packages/skills`. */
const packageOf = (relativePath: string): string =>
  relativePath.split('/').slice(0, 2).join('/');

/** Every package's sources, concatenated, so a lookup is one string scan. */
const sourcesByPackage = allSources.reduce<Record<string, string>>(
  (byPackage, path) => {
    const key = packageOf(posix(path));
    byPackage[key] = (byPackage[key] ?? '') + readFileSync(path, 'utf8');
    return byPackage;
  },
  {},
);

describe('instrumentComponents coverage', () => {
  describe('aggregators', () => {
    const aggregators = allSources.filter((path) => {
      const relativePath = posix(path);
      return (
        /\/application\/services\/[A-Za-z0-9_]*Services\.ts$/.test(
          relativePath,
        ) ||
        /\/infra\/repositories\/[A-Za-z0-9_]*Repositories\.ts$/.test(
          relativePath,
        )
      );
    });

    it('finds the aggregators', () => {
      // A guard on the guard: a refactor that renames or relocates them would
      // otherwise make the assertion below vacuous.
      expect(aggregators.length).toBeGreaterThan(5);
    });

    it.each(aggregators.map(posix))('%s instruments its components', (path) => {
      expect(readFileSync(join(repoRoot, path), 'utf8')).toContain(
        'instrumentComponents(',
      );
    });
  });

  describe('repositories', () => {
    /**
     * Bases whose constructor calls `instrumentMethods(this)`, directly or
     * through a parent. A repository extending one of these needs no list
     * entry.
     */
    const INSTRUMENTED_BASES = [
      'AbstractRepository',
      'OrganizationScopedRepository',
      'SpaceScopedRepository',
    ];

    /**
     * Top level of `infra/repositories` only. The vendor clients nested a
     * directory deeper - `git/.../github/GithubRepository.ts` - are remote-API
     * wrappers rather than persistence, and their calls already surface
     * through the `undici` auto-instrumentation.
     */
    const repositories = allSources.filter((path) => {
      const relativePath = posix(path);
      const name = basename(relativePath);

      return (
        /\/infra\/repositories\/[A-Za-z0-9_]+\.ts$/.test(relativePath) &&
        name.endsWith('Repository.ts') &&
        !/^I[A-Z]/.test(name)
      );
    });

    it('finds the repositories', () => {
      expect(repositories.length).toBeGreaterThan(20);
    });

    it.each(repositories.map(posix))(
      '%s extends an instrumented base or is listed by its package',
      (path) => {
        const source = readFileSync(join(repoRoot, path), 'utf8');
        const extendsAnInstrumentedBase = INSTRUMENTED_BASES.some((base) =>
          source.includes(`extends ${base}`),
        );

        if (extendsAnInstrumentedBase) {
          return;
        }

        // Field name the package would list it under: PluginInstallationRepository
        // is held as `pluginInstallationRepository`.
        const className = basename(path, '.ts');
        const field = className[0].toLowerCase() + className.slice(1);
        const listed = new RegExp(
          `instrumentComponents\\(\\[[^\\]]*\\b${field}\\b`,
        ).test(sourcesByPackage[packageOf(path)] ?? '');

        expect(listed).toBe(true);
      },
    );
  });
});
