import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import {
  buildInstallSummary,
  buildIncapableArtifactsWarning,
} from './installSummary';

const baseResult: IInstallResult = {
  filesCreated: 0,
  filesUpdated: 0,
  filesDeleted: 0,
  contentFilesChanged: 0,
  errors: [],
  recipesCount: 0,
  standardsCount: 0,
  commandsCount: 0,
  skillsCount: 0,
  skillsChanged: 0,
  standardsChanged: 0,
  commandsChanged: 0,
  recipesRemoved: 0,
  standardsRemoved: 0,
  commandsRemoved: 0,
  skillsRemoved: 0,
  skillDirectoriesDeleted: 0,
  missingAccess: [],
  configCreated: false,
  packagesAdded: [],
  sourceArtifacts: {
    skillsCount: 0,
    standardsCount: 0,
    commandsCount: 0,
    recipesCount: 0,
  },
  resolvedAgents: [],
};

const make = (overrides: Partial<IInstallResult> = {}): IInstallResult => ({
  ...baseResult,
  ...overrides,
});

describe('buildInstallSummary', () => {
  describe('when nothing happened and no artifacts exist', () => {
    it('returns "Already up to date" without artifact list', () => {
      expect(buildInstallSummary(make())).toBe('✅ Already up to date');
    });
  });

  describe('when nothing changed but artifacts exist in lock', () => {
    it('returns the bare "Already up to date" without listing totals', () => {
      const summary = buildInstallSummary(
        make({ standardsCount: 5, commandsCount: 2 }),
      );
      expect(summary).toBe('✅ Already up to date');
    });
  });

  describe('when packmind.json was created (Cedric scenario)', () => {
    describe('includes a "Created packmind.json" line and the package slugs', () => {
      let summary: string;
      beforeEach(() => {
        summary = buildInstallSummary(
          make({
            configCreated: true,
            packagesAdded: ['@testing/cli-e2e'],
          }),
        );
      });

      it('includes a "Created packmind.json" line', () => {
        expect(summary).toContain('✅ Created packmind.json');
      });

      it('includes the package slug', () => {
        expect(summary).toContain('@testing/cli-e2e');
      });
    });

    it('never emits the bare "Nothing to install" message', () => {
      const summary = buildInstallSummary(
        make({
          configCreated: true,
          packagesAdded: ['@testing/cli-e2e'],
        }),
      );
      expect(summary).not.toContain('Nothing to install');
    });
  });

  describe('when packages were added to existing config', () => {
    describe('includes an "Added N package(s)" line and the new slugs only', () => {
      let summary: string;
      beforeEach(() => {
        summary = buildInstallSummary(
          make({
            configCreated: false,
            packagesAdded: ['@space/new-one'],
          }),
        );
      });

      it('includes an "Added 1 package to packmind.json" line', () => {
        expect(summary).toContain('✅ Added 1 package to packmind.json');
      });

      it('includes the new slug', () => {
        expect(summary).toContain('@space/new-one');
      });
    });
  });

  describe('when content was synced', () => {
    it('reports synced artifacts based on per-type change counts', () => {
      const summary = buildInstallSummary(
        make({
          standardsChanged: 2,
          skillsChanged: 1,
        }),
      );
      expect(summary).toContain('✅ Synced 2 standards, 1 skill');
    });

    it('reports only the artifact types that actually changed', () => {
      const summary = buildInstallSummary(
        make({
          // Totals: 1 of each artifact in the install...
          standardsCount: 1,
          commandsCount: 1,
          skillsCount: 1,
          sourceArtifacts: {
            skillsCount: 1,
            standardsCount: 1,
            commandsCount: 0,
            recipesCount: 1,
          },
          // ...but only the skill was re-written.
          skillsChanged: 1,
        }),
      );
      expect(summary).toBe('✅ Synced 1 skill');
    });

    describe('when only an unrelated file (e.g. CLAUDE.md index) was rewritten', () => {
      let summary: string;
      beforeEach(() => {
        summary = buildInstallSummary(
          make({
            filesCreated: 1,
            filesUpdated: 1,
            standardsCount: 1,
            skillsCount: 1,
          }),
        );
      });

      it('does not flip to "Synced"', () => {
        expect(summary).not.toContain('Synced');
      });

      it('returns "Already up to date"', () => {
        expect(summary).toContain('✅ Already up to date');
      });
    });
  });

  describe('when packages added but no artifacts available to render', () => {
    let summary: string;
    beforeEach(() => {
      summary = buildInstallSummary(
        make({
          configCreated: true,
          packagesAdded: ['@empty/pkg'],
          sourceArtifacts: {
            skillsCount: 0,
            standardsCount: 0,
            commandsCount: 0,
            recipesCount: 0,
          },
        }),
      );
    });

    it('does not say "Nothing to install"', () => {
      expect(summary).not.toContain('Nothing to install');
    });

    it('says "Created packmind.json"', () => {
      expect(summary).toContain('Created packmind.json');
    });
  });

  describe('when files were deleted only', () => {
    it('reports the file deletion count', () => {
      const summary = buildInstallSummary(make({ filesDeleted: 4 }));
      expect(summary).toContain('Removed 4 file');
    });
  });

  describe('when an agent rendering was re-created (e.g. .claude/skills was rm -rf-ed)', () => {
    let summary: string;
    beforeEach(() => {
      // Agent-only rendering: no `.packmind/` mirror so `skillsCount` stays 0,
      // but the InstallUseCase tracked the skill as changed via artifactId.
      summary = buildInstallSummary(
        make({
          filesCreated: 1,
          skillsCount: 0,
          skillsChanged: 1,
          sourceArtifacts: {
            skillsCount: 1,
            standardsCount: 0,
            commandsCount: 0,
            recipesCount: 0,
          },
        }),
      );
    });

    it('reports the restored artifact', () => {
      expect(summary).toContain('✅ Synced 1 skill');
    });

    it('does not say "Already up to date"', () => {
      expect(summary).not.toContain('Already up to date');
    });
  });

  describe('when both config created and content synced', () => {
    let summary: string;
    beforeEach(() => {
      summary = buildInstallSummary(
        make({
          configCreated: true,
          packagesAdded: ['@a/b'],
          standardsChanged: 2,
        }),
      );
    });

    it('includes the "Created packmind.json" line', () => {
      expect(summary).toContain('Created packmind.json');
    });

    it('includes the "Synced 2 standards" line', () => {
      expect(summary).toContain('Synced 2 standards');
    });
  });
});

describe('buildIncapableArtifactsWarning', () => {
  describe('when no source artifacts exist', () => {
    it('returns null', () => {
      expect(buildIncapableArtifactsWarning(make())).toBeNull();
    });
  });

  describe('when at least one resolvedAgent supports every present type', () => {
    it('returns null', () => {
      expect(
        buildIncapableArtifactsWarning(
          make({
            resolvedAgents: ['claude'],
            sourceArtifacts: {
              skillsCount: 3,
              standardsCount: 1,
              commandsCount: 0,
              recipesCount: 0,
            },
          }),
        ),
      ).toBeNull();
    });
  });

  describe('Cedric scenario: skills in source but no skill-capable agent', () => {
    let warning: string | null;
    beforeEach(() => {
      warning = buildIncapableArtifactsWarning(
        make({
          resolvedAgents: ['agents_md', 'packmind'],
          sourceArtifacts: {
            skillsCount: 3,
            standardsCount: 0,
            commandsCount: 0,
            recipesCount: 0,
          },
        }),
      );
    });

    it('warns about skills (is not null)', () => {
      expect(warning).not.toBeNull();
    });

    it('lists the current agents', () => {
      expect(warning).toContain('agents_md, packmind');
    });

    it('mentions the skill count', () => {
      expect(warning).toContain('3 skills');
    });

    it('suggests a capable agent', () => {
      expect(warning).toContain('claude');
    });

    it('includes the config agents command', () => {
      expect(warning).toContain('packmind-cli config agents');
    });
  });

  describe('multi-type mismatch', () => {
    let warning: string | null;
    beforeEach(() => {
      warning = buildIncapableArtifactsWarning(
        make({
          resolvedAgents: ['agents_md'],
          sourceArtifacts: {
            skillsCount: 2,
            standardsCount: 5, // supported by agents_md
            commandsCount: 4,
            recipesCount: 1,
          },
        }),
      );
    });

    it('produces a non-null warning', () => {
      expect(warning).not.toBeNull();
    });

    it('lists unsupported skills count', () => {
      expect(warning).toContain('2 skills');
    });

    it('lists unsupported commands count', () => {
      expect(warning).toContain('4 commands');
    });

    it('lists unsupported recipes count', () => {
      expect(warning).toContain('1 recipe');
    });

    it('does not warn about supported standards', () => {
      expect(warning).not.toContain('5 standards');
    });
  });

  describe('singular form', () => {
    let warning: string | null;
    beforeEach(() => {
      warning = buildIncapableArtifactsWarning(
        make({
          resolvedAgents: ['agents_md'],
          sourceArtifacts: {
            skillsCount: 1,
            standardsCount: 0,
            commandsCount: 0,
            recipesCount: 0,
          },
        }),
      );
    });

    it('uses "1 skill" not "1 skills"', () => {
      expect(warning).toContain('1 skill');
    });

    it('does not use the plural form "1 skills"', () => {
      expect(warning).not.toContain('1 skills');
    });
  });

  describe('empty resolvedAgents (server omitted them)', () => {
    it('renders "(default)" placeholder', () => {
      const warning = buildIncapableArtifactsWarning(
        make({
          resolvedAgents: [],
          sourceArtifacts: {
            skillsCount: 1,
            standardsCount: 0,
            commandsCount: 0,
            recipesCount: 0,
          },
        }),
      );
      expect(warning).toContain('(default)');
    });
  });
});
