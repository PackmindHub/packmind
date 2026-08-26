import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// packages/node-utils/src/observability -> the repo root.
const repoRoot = resolve(__dirname, '../../../..');

/**
 * Everywhere that runs with the OTel SDK started. `apps/api` builds no use
 * cases today, but it is in scope so that it cannot start to without the rule
 * noticing.
 */
const scanned = [
  join(repoRoot, 'packages'),
  join(repoRoot, 'apps', 'api', 'src'),
];

/**
 * A use case emits no span unless something opts it in, and nothing about
 * forgetting to do so fails at runtime - the traces just quietly stop one level
 * short. That is exactly how the gap this closes opened in the first place, so
 * the rule is checked here rather than left to review.
 *
 * `apps/cli` is deliberately out of scope: it builds 26 use cases of its own but
 * starts no OTel SDK, so instrumenting them would buy nothing today.
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

describe('instrumentUseCases coverage', () => {
  const buildsAUseCase = scanned
    .flatMap(sourceFiles)
    .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
    .filter(({ source }) => /new [A-Za-z0-9_]*UseCase\(/.test(source));

  it('finds the files that build use cases', () => {
    // A guard on the guard: a refactor that moves construction somewhere this
    // walk does not reach would otherwise make the assertion below vacuous.
    expect(buildsAUseCase.length).toBeGreaterThan(5);
  });

  it.each(buildsAUseCase.map(({ path }) => relative(repoRoot, path)))(
    '%s instruments the use cases it builds',
    (path) => {
      const source = readFileSync(join(repoRoot, path), 'utf8');

      expect(
        source.includes('instrumentUseCases(this)') ||
          source.includes('instrumentUseCase('),
      ).toBe(true);
    },
  );
});
