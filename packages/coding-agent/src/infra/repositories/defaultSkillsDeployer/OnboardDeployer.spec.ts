import { OnboardDeployer } from './OnboardDeployer';
import { DeleteItemType, FileUpdates } from '@packmind/types';

/**
 * CLI versions that only expose the legacy `packmind-cli` executable. The
 * `packmind` binary landed in 0.24.0, and `0.24.0-next` is a pre-release of it,
 * so it predates the rename too.
 */
const LEGACY_EXEC_CLI_VERSIONS = [
  '0.16.0',
  '0.21.0',
  '0.23.0',
  '0.23.1',
  '0.24.0-next',
];

/**
 * CLI versions that expose the canonical `packmind` executable. `undefined`
 * means the caller is not a CLI (the web app, for instance) and gets the
 * canonical name.
 */
const CANONICAL_EXEC_CLI_VERSIONS: (string | undefined)[] = [
  '0.24.0',
  '0.35.0',
  undefined,
];

const ALL_CLI_VERSIONS: (string | undefined)[] = [
  ...LEGACY_EXEC_CLI_VERSIONS,
  ...CANONICAL_EXEC_CLI_VERSIONS,
];

/**
 * Finds invocations of `execName`: the executable named at the start of a line,
 * in backticks, or in double quotes, followed by a subcommand or a flag. This
 * deliberately ignores prose ("the Packmind CLI"), `.packmind/` paths,
 * `packmind-versions/` directory names and artifact slugs, none of which are
 * things the user is told to run.
 */
const invocationsOf = (execName: string, content: string): string[] =>
  content.match(new RegExp(`(?:["\`]|^ *)${execName} (?:--)?[a-z]`, 'gm')) ??
  [];

describe('OnboardDeployer', () => {
  const deployer = new OnboardDeployer();
  const basePath = '.test/skills/packmind-onboard';

  const deploy = (
    options: { includeNext?: boolean; cliVersion?: string } = {},
  ): FileUpdates => deployer.deploy('TestAgent', '.test/skills/', options);

  const contentAt = (result: FileUpdates, path: string): string => {
    const file = result.createOrUpdate.find((f) => f.path === path);
    if (!file) throw new Error(`Missing emitted file: ${path}`);
    return file.content;
  };

  /**
   * Files that reach every install at or above the skill's `minimumVersion`,
   * as opposed to the version-pinned ones under `packmind-versions/`.
   */
  const unversionedFiles = (result: FileUpdates) =>
    result.createOrUpdate.filter(
      (file) => !file.path.includes('/packmind-versions/'),
    );

  const versionedFileNames = [
    'create-items.md',
    'list-packages.md',
    'create-package.md',
    'select-package.md',
    'completion-summary.md',
  ];

  describe('versioned files', () => {
    let result: FileUpdates;
    let paths: string[];

    beforeEach(() => {
      result = deploy();
      paths = result.createOrUpdate.map((f) => f.path);
    });

    it.each(versionedFileNames)('emits 0.35.0/%s', (fileName) => {
      expect(paths).toContain(
        `${basePath}/packmind-versions/0.35.0/${fileName}`,
      );
    });

    it.each(versionedFileNames)('still emits 0.23.0/%s', (fileName) => {
      expect(paths).toContain(
        `${basePath}/packmind-versions/0.23.0/${fileName}`,
      );
    });

    it.each(versionedFileNames)('still emits 0.16.0/%s', (fileName) => {
      expect(paths).toContain(
        `${basePath}/packmind-versions/0.16.0/${fileName}`,
      );
    });

    it.each(versionedFileNames)(
      'uses the canonical executable in 0.35.0/%s',
      (fileName) => {
        const content = contentAt(
          result,
          `${basePath}/packmind-versions/0.35.0/${fileName}`,
        );
        expect(invocationsOf('packmind-cli', content)).toEqual([]);
      },
    );
  });

  describe('version-pinned content is independent of the caller CLI version', () => {
    it.each(ALL_CLI_VERSIONS)(
      'keeps the legacy executable in 0.23.0 content when the CLI is %s',
      (cliVersion) => {
        expect(
          contentAt(
            deploy({ cliVersion }),
            `${basePath}/packmind-versions/0.23.0/list-packages.md`,
          ),
        ).toContain('packmind-cli packages list');
      },
    );

    it.each(ALL_CLI_VERSIONS)(
      'keeps the canonical executable in 0.35.0 content when the CLI is %s',
      (cliVersion) => {
        const content = contentAt(
          deploy({ cliVersion }),
          `${basePath}/packmind-versions/0.35.0/list-packages.md`,
        );
        expect(content).toContain('packmind packages list');
        expect(invocationsOf('packmind-cli', content)).toEqual([]);
      },
    );

    it.each(versionedFileNames)(
      'renders 0.23.0/%s byte-identically for every caller version',
      (fileName) => {
        const path = `${basePath}/packmind-versions/0.23.0/${fileName}`;
        const baseline = contentAt(deploy(), path);

        for (const cliVersion of ALL_CLI_VERSIONS) {
          expect(contentAt(deploy({ cliVersion }), path)).toBe(baseline);
        }
      },
    );
  });

  describe('unversioned content', () => {
    describe.each(LEGACY_EXEC_CLI_VERSIONS)(
      'when the CLI is %s',
      (cliVersion) => {
        let files: { path: string; content: string }[];

        beforeEach(() => {
          files = unversionedFiles(deploy({ cliVersion }));
        });

        it('names the legacy executable in SKILL.md', () => {
          const content = contentAt(
            deploy({ cliVersion }),
            `${basePath}/SKILL.md`,
          );
          expect(invocationsOf('packmind-cli', content).length).toBeGreaterThan(
            0,
          );
        });

        it('never invokes the canonical executable', () => {
          expect(
            files
              .filter((file) => invocationsOf('packmind', file.content).length)
              .map((file) => file.path),
          ).toEqual([]);
        });
      },
    );

    describe.each(CANONICAL_EXEC_CLI_VERSIONS)(
      'when the CLI is %s',
      (cliVersion) => {
        let files: { path: string; content: string }[];

        beforeEach(() => {
          files = unversionedFiles(deploy({ cliVersion }));
        });

        it('names the canonical executable in SKILL.md', () => {
          const content = contentAt(
            deploy({ cliVersion }),
            `${basePath}/SKILL.md`,
          );
          expect(invocationsOf('packmind', content).length).toBeGreaterThan(0);
        });

        it('never invokes the legacy executable', () => {
          expect(
            files
              .filter(
                (file) => invocationsOf('packmind-cli', file.content).length,
              )
              .map((file) => file.path),
          ).toEqual([]);
        });
      },
    );

    it.each(ALL_CLI_VERSIONS)(
      'points the version picker at the resolved executable when the CLI is %s',
      (cliVersion) => {
        const content = contentAt(
          deploy({ cliVersion }),
          `${basePath}/SKILL.md`,
        );
        const execName =
          cliVersion && LEGACY_EXEC_CLI_VERSIONS.includes(cliVersion)
            ? 'packmind-cli'
            : 'packmind';

        expect(content).toContain(`Run "${execName} --version"`);
        expect(content).toContain('- 0.35.0');
      },
    );
  });

  // `SemVer` is an open template-literal type, so `Record<SemVer, string>`
  // degrades to an index signature: TypeScript cannot prove that a version
  // added to `skillMd.versions` has content in every per-version map. Without
  // this net, a missing entry ships `content: undefined` to users' repos.
  describe.each([false, true])('when includeNext is %s', (includeNext) => {
    it('emits non-empty content for every file', () => {
      const emptyFiles = deploy({ includeNext })
        .createOrUpdate.filter(
          (file) =>
            typeof file.content !== 'string' || file.content.trim() === '',
        )
        .map((file) => file.path);

      expect(emptyFiles).toEqual([]);
    });
  });

  describe('when includeNext is true', () => {
    let result: FileUpdates;

    beforeEach(() => {
      result = deploy({ includeNext: true });
    });

    it.each(versionedFileNames)('emits next/%s', (fileName) => {
      expect(result.createOrUpdate.map((f) => f.path)).toContain(
        `${basePath}/packmind-versions/next/${fileName}`,
      );
    });

    it.each(versionedFileNames)(
      'mirrors the 0.35.0 content in next/%s',
      (fileName) => {
        expect(
          contentAt(result, `${basePath}/packmind-versions/next/${fileName}`),
        ).toBe(
          contentAt(result, `${basePath}/packmind-versions/0.35.0/${fileName}`),
        );
      },
    );
  });

  describe('when includeNext is false', () => {
    it('deletes the next directory', () => {
      expect(deploy().delete).toEqual(
        expect.arrayContaining([
          {
            path: `${basePath}/packmind-versions/next`,
            type: DeleteItemType.Directory,
          },
        ]),
      );
    });
  });
});
