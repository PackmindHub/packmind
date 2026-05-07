import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import { buildInstallSummary } from './installSummary';

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
    it('returns "Already up to date — N standards, N commands"', () => {
      const summary = buildInstallSummary(
        make({ standardsCount: 5, commandsCount: 2 }),
      );
      expect(summary).toBe('✅ Already up to date — 5 standards, 2 commands');
    });

    it('uses singular form for 1', () => {
      const summary = buildInstallSummary(make({ standardsCount: 1 }));
      expect(summary).toBe('✅ Already up to date — 1 standard');
    });
  });

  describe('when packmind.json was created (Cedric scenario)', () => {
    it('includes a "Created packmind.json" line and the package slugs', () => {
      const summary = buildInstallSummary(
        make({
          configCreated: true,
          packagesAdded: ['@testing/cli-e2e'],
        }),
      );
      expect(summary).toContain('✅ Created packmind.json');
      expect(summary).toContain('@testing/cli-e2e');
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
    it('includes an "Added N package(s)" line and the new slugs only', () => {
      const summary = buildInstallSummary(
        make({
          configCreated: false,
          packagesAdded: ['@space/new-one'],
        }),
      );
      expect(summary).toContain('✅ Added 1 package to packmind.json');
      expect(summary).toContain('@space/new-one');
    });
  });

  describe('when content was synced', () => {
    it('reports synced artifacts', () => {
      const summary = buildInstallSummary(
        make({
          contentFilesChanged: 3,
          standardsCount: 2,
          skillsCount: 1,
        }),
      );
      expect(summary).toContain('✅ Synced 2 standards, 1 skill');
    });
  });

  describe('when packages added but no artifacts available to render', () => {
    it('does not say "Nothing to install"', () => {
      const summary = buildInstallSummary(
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
      expect(summary).not.toContain('Nothing to install');
      expect(summary).toContain('Created packmind.json');
    });
  });

  describe('when files were deleted only', () => {
    it('reports the file deletion count', () => {
      const summary = buildInstallSummary(make({ filesDeleted: 4 }));
      expect(summary).toContain('Removed 4 file');
    });
  });

  describe('when both config created and content synced', () => {
    it('combines both lines', () => {
      const summary = buildInstallSummary(
        make({
          configCreated: true,
          packagesAdded: ['@a/b'],
          contentFilesChanged: 2,
          standardsCount: 2,
        }),
      );
      expect(summary).toContain('Created packmind.json');
      expect(summary).toContain('Synced 2 standards');
    });
  });
});
