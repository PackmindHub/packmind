import { UpdatePlaybookDeployer } from './UpdatePlaybookDeployer';
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
 * deliberately ignores prose ("update packmind standard"), `.packmind/` paths,
 * `packmind-versions/` directory names and artifact slugs, none of which are
 * things the user is told to run.
 */
const invocationsOf = (execName: string, content: string): string[] =>
  content.match(new RegExp(`(?:["\`]|^ *)${execName} (?:--)?[a-z]`, 'gm')) ??
  [];

describe('UpdatePlaybookDeployer', () => {
  const deployer = new UpdatePlaybookDeployer();
  const basePath = '.test/skills/packmind-update-playbook';

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

  const unversionedStepFiles = [
    'analyze-standards.md',
    'analyze-commands.md',
    'analyze-skills.md',
  ];

  describe('versioned files', () => {
    let result: FileUpdates;
    let paths: string[];

    beforeEach(() => {
      result = deploy();
      paths = result.createOrUpdate.map((f) => f.path);
    });

    it.each(['0.21.0', '0.23.0', '0.35.0'])(
      'emits %s/apply-changes.md',
      (version) => {
        expect(paths).toContain(
          `${basePath}/packmind-versions/${version}/apply-changes.md`,
        );
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
            `${basePath}/packmind-versions/0.23.0/apply-changes.md`,
          ),
        ).toContain('packmind-cli playbook add');
      },
    );

    it.each(ALL_CLI_VERSIONS)(
      'keeps the canonical executable in 0.35.0 content when the CLI is %s',
      (cliVersion) => {
        const content = contentAt(
          deploy({ cliVersion }),
          `${basePath}/packmind-versions/0.35.0/apply-changes.md`,
        );
        expect(content).toContain('packmind playbook add');
        expect(invocationsOf('packmind-cli', content)).toEqual([]);
      },
    );

    it.each(['0.21.0', '0.23.0', '0.35.0'])(
      'renders %s/apply-changes.md byte-identically for every caller version',
      (version) => {
        const path = `${basePath}/packmind-versions/${version}/apply-changes.md`;
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
        let result: FileUpdates;

        beforeEach(() => {
          result = deploy({ cliVersion });
        });

        it('names the legacy executable in SKILL.md', () => {
          expect(
            invocationsOf(
              'packmind-cli',
              contentAt(result, `${basePath}/SKILL.md`),
            ).length,
          ).toBeGreaterThan(0);
        });

        it.each(unversionedStepFiles)(
          'names the legacy executable in steps/%s',
          (fileName) => {
            expect(
              invocationsOf(
                'packmind-cli',
                contentAt(
                  deploy({ cliVersion }),
                  `${basePath}/steps/${fileName}`,
                ),
              ).length,
            ).toBeGreaterThan(0);
          },
        );

        it('never invokes the canonical executable', () => {
          expect(
            unversionedFiles(result)
              .filter((file) => invocationsOf('packmind', file.content).length)
              .map((file) => file.path),
          ).toEqual([]);
        });
      },
    );

    describe.each(CANONICAL_EXEC_CLI_VERSIONS)(
      'when the CLI is %s',
      (cliVersion) => {
        let result: FileUpdates;

        beforeEach(() => {
          result = deploy({ cliVersion });
        });

        it('names the canonical executable in SKILL.md', () => {
          expect(
            invocationsOf('packmind', contentAt(result, `${basePath}/SKILL.md`))
              .length,
          ).toBeGreaterThan(0);
        });

        it.each([
          ['analyze-standards.md', 'packmind standards list'],
          ['analyze-commands.md', 'packmind commands list'],
          ['analyze-skills.md', 'packmind skills list'],
        ])(
          'names the canonical executable in steps/%s',
          (fileName, command) => {
            expect(
              contentAt(
                deploy({ cliVersion }),
                `${basePath}/steps/${fileName}`,
              ),
            ).toContain(command);
          },
        );

        it('never invokes the legacy executable', () => {
          expect(
            unversionedFiles(result)
              .filter(
                (file) => invocationsOf('packmind-cli', file.content).length,
              )
              .map((file) => file.path),
          ).toEqual([]);
        });
      },
    );

    it.each(ALL_CLI_VERSIONS)(
      'points the version picker and the CLI health check at the resolved executable when the CLI is %s',
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
        expect(content).toContain(`run \`${execName} --version\``);
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

    it('emits next/apply-changes.md', () => {
      expect(result.createOrUpdate.map((f) => f.path)).toContain(
        `${basePath}/packmind-versions/next/apply-changes.md`,
      );
    });

    it('mirrors the 0.35.0 content in next/apply-changes.md', () => {
      expect(
        contentAt(
          result,
          `${basePath}/packmind-versions/next/apply-changes.md`,
        ),
      ).toBe(
        contentAt(
          result,
          `${basePath}/packmind-versions/0.35.0/apply-changes.md`,
        ),
      );
    });
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
