import { deletePluginHandler } from './deletePluginHandler';
import { readMarketplace, findPluginEntry } from './pluginsContext';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parsePackageSlug } from '../../../domain/entities/PackageSlug';

type Deps = Parameters<typeof deletePluginHandler>[1];

describe('deletePluginHandler', () => {
  let tmp: string;
  let exit: jest.Mock;
  let log: jest.Mock;
  let error: jest.Mock;
  let confirmOverwrite: jest.Mock;
  let trackPluginDeleted: jest.Mock;
  let tryGetGitRepositoryRoot: jest.Mock;
  let getGitRemoteUrlFromPath: jest.Mock;
  let getCurrentBranch: jest.Mock;

  const buildDeps = (): Deps => ({
    packmindCliHexa: {
      trackPluginDeleted,
      tryGetGitRepositoryRoot,
      getGitRemoteUrlFromPath,
      getCurrentBranch,
    } as never,
    exit: exit as never,
    getCwd: () => tmp,
    log: log as never,
    error: error as never,
    confirmOverwrite: confirmOverwrite as never,
  });

  const writeMarketplaceManifest = (content: unknown) => {
    mkdirSync(join(tmp, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(tmp, '.claude-plugin/marketplace.json'),
      JSON.stringify(content, null, 2),
    );
  };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'pm-delete-'));
    exit = jest.fn();
    log = jest.fn();
    error = jest.fn();
    confirmOverwrite = jest.fn();
    trackPluginDeleted = jest.fn().mockResolvedValue(undefined);
    tryGetGitRepositoryRoot = jest.fn().mockResolvedValue(tmp);
    getGitRemoteUrlFromPath = jest
      .fn()
      .mockReturnValue('git@github.com:org/repo.git');
    getCurrentBranch = jest.fn().mockReturnValue('main');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('when no plugin manifest exists', () => {
    it('prints an error and exits non-zero', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('No .claude-plugin'),
      );
      expect(exit).toHaveBeenCalledWith(1);
    });
  });

  describe('marketplace mode with an existing local entry', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [
          { name: 'backend', source: './plugins/backend' },
          { name: 'security', source: './plugins/security' },
        ],
      });
      mkdirSync(join(tmp, 'plugins/security/commands'), { recursive: true });
      writeFileSync(join(tmp, 'plugins/security/commands/a.md'), 'A');
      confirmOverwrite.mockResolvedValue(true);
    });

    it('prompts the user for confirmation before deleting', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      expect(confirmOverwrite).toHaveBeenCalledTimes(1);
      expect(confirmOverwrite).toHaveBeenCalledWith(
        expect.stringContaining('./plugins/security'),
      );
    });

    it('removes the rendered folder', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(existsSync(join(tmp, 'plugins/security'))).toBe(false);
    });

    it('removes the entry from marketplace.json preserving siblings', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toBeUndefined();
      expect(findPluginEntry(mp, 'backend')).toBeDefined();
    });

    it('exits zero', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(exit).toHaveBeenCalledWith(0);
    });

    it('tracks the deletion with the resolved git remote url', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(trackPluginDeleted).toHaveBeenCalledTimes(1);
      expect(trackPluginDeleted).toHaveBeenCalledWith({
        packageSlug: 'security',
        gitRemoteUrl: 'git@github.com:org/repo.git',
      });
    });

    it('tracks with an empty git remote url when not in a git repository', async () => {
      tryGetGitRepositoryRoot.mockResolvedValue(null);

      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(trackPluginDeleted).toHaveBeenCalledWith({
        packageSlug: 'security',
        gitRemoteUrl: '',
      });
    });

    it('still exits zero when tracking fails', async () => {
      trackPluginDeleted.mockRejectedValue(new Error('network'));

      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(exit).toHaveBeenCalledWith(0);
    });
  });

  describe('marketplace mode when the user declines confirmation', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [{ name: 'security', source: './plugins/security' }],
      });
      mkdirSync(join(tmp, 'plugins/security/commands'), { recursive: true });
      writeFileSync(join(tmp, 'plugins/security/commands/a.md'), 'A');
      confirmOverwrite.mockResolvedValue(false);
    });

    it('does not remove the rendered folder', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      expect(existsSync(join(tmp, 'plugins/security/commands/a.md'))).toBe(
        true,
      );
    });

    it('does not mutate marketplace.json', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toBeDefined();
    });

    it('exits zero', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      expect(exit).toHaveBeenCalledWith(0);
    });

    it('does not track the deletion', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      expect(trackPluginDeleted).not.toHaveBeenCalled();
    });
  });

  describe('marketplace mode with a remote entry', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [
          {
            name: 'security',
            source: { source: 'github', repo: 'org/security-repo' },
          },
        ],
      });
    });

    it('refuses with a remote-source error and exits non-zero', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(error).toHaveBeenCalledWith(
        'Plugin "security" has a remote source. Run this command in the workspace of the remote plugin.',
      );
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('does not mutate marketplace.json', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toBeDefined();
    });

    it('does not track the deletion', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(trackPluginDeleted).not.toHaveBeenCalled();
    });

    it('does not prompt the user', async () => {
      await deletePluginHandler(
        { packageSlug: parsePackageSlug('security') },
        buildDeps(),
      );

      expect(confirmOverwrite).not.toHaveBeenCalled();
    });
  });

  describe('marketplace mode with no matching entry', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [{ name: 'backend', source: './plugins/backend' }],
      });
    });

    it('prints a nothing-to-delete message and exits zero', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(log).toHaveBeenCalledWith(
        'Plugin "security" is not declared in marketplace.json. Nothing to delete.',
      );
      expect(exit).toHaveBeenCalledWith(0);
    });

    it('does not mutate marketplace.json', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(mp.plugins).toHaveLength(1);
    });

    it('does not track the deletion', async () => {
      await deletePluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(trackPluginDeleted).not.toHaveBeenCalled();
    });
  });

  describe('standalone mode', () => {
    const writeStandaloneManifest = (content: unknown) => {
      mkdirSync(join(tmp, '.claude-plugin'), { recursive: true });
      writeFileSync(
        join(tmp, '.claude-plugin/plugin.json'),
        JSON.stringify(content, null, 2),
      );
    };

    describe('when the name matches and the user confirms', () => {
      beforeEach(() => {
        writeStandaloneManifest({ name: 'security' });
        mkdirSync(join(tmp, 'commands'), { recursive: true });
        writeFileSync(join(tmp, 'commands/a.md'), 'A');
        mkdirSync(join(tmp, 'skills/b'), { recursive: true });
        writeFileSync(join(tmp, 'skills/b/SKILL.md'), 'B');
        confirmOverwrite.mockResolvedValue(true);
      });

      it('removes commands and skills directories', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(existsSync(join(tmp, 'commands'))).toBe(false);
        expect(existsSync(join(tmp, 'skills'))).toBe(false);
      });

      it('leaves plugin.json untouched', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(existsSync(join(tmp, '.claude-plugin/plugin.json'))).toBe(true);
      });

      it('exits zero', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(exit).toHaveBeenCalledWith(0);
      });

      it('tracks the deletion', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(trackPluginDeleted).toHaveBeenCalledWith({
          packageSlug: 'security',
          gitRemoteUrl: 'git@github.com:org/repo.git',
        });
      });
    });

    describe('when the name matches and the user declines', () => {
      beforeEach(() => {
        writeStandaloneManifest({ name: 'security' });
        mkdirSync(join(tmp, 'commands'), { recursive: true });
        writeFileSync(join(tmp, 'commands/a.md'), 'A');
        confirmOverwrite.mockResolvedValue(false);
      });

      it('does not remove the rendered files', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(existsSync(join(tmp, 'commands/a.md'))).toBe(true);
      });

      it('exits zero', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(exit).toHaveBeenCalledWith(0);
      });

      it('does not track the deletion', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(trackPluginDeleted).not.toHaveBeenCalled();
      });
    });

    describe('when the name does not match', () => {
      beforeEach(() => {
        writeStandaloneManifest({ name: 'frontend' });
      });

      it('exits non-zero with the documented message', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(error).toHaveBeenCalledWith(
          "The plugin 'security' is not handled in this repo.",
        );
        expect(exit).toHaveBeenCalledWith(1);
      });

      it('does not prompt', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(confirmOverwrite).not.toHaveBeenCalled();
      });

      it('does not track the deletion', async () => {
        await deletePluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(trackPluginDeleted).not.toHaveBeenCalled();
      });
    });
  });
});
