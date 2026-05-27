import { deletePluginHandler } from './deletePluginHandler';
import { readMarketplace, findPluginEntry } from './pluginsContext';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

type Deps = Parameters<typeof deletePluginHandler>[1];

describe('deletePluginHandler', () => {
  let tmp: string;
  let exit: jest.Mock;
  let log: jest.Mock;
  let error: jest.Mock;
  let confirmOverwrite: jest.Mock;

  const buildDeps = (): Deps => ({
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
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('when no plugin manifest exists', () => {
    it('prints an error and exits non-zero', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

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
    });

    it('removes the rendered folder', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(existsSync(join(tmp, 'plugins/security'))).toBe(false);
    });

    it('removes the entry from marketplace.json preserving siblings', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toBeUndefined();
      expect(findPluginEntry(mp, 'backend')).toBeDefined();
    });

    it('exits zero', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(exit).toHaveBeenCalledWith(0);
    });
  });

  describe('marketplace mode with a remote entry', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [
          {
            name: 'security',
            source: 'git@my-provider.com/security-repo.git',
          },
        ],
      });
    });

    it('refuses with a remote-source error and exits non-zero', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(error).toHaveBeenCalledWith(
        'Plugin "security" has a remote source. Run this command in the workspace of the remote plugin.',
      );
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('does not mutate marketplace.json', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toBeDefined();
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
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(log).toHaveBeenCalledWith(
        'Plugin "security" is not declared in marketplace.json. Nothing to delete.',
      );
      expect(exit).toHaveBeenCalledWith(0);
    });

    it('does not mutate marketplace.json', async () => {
      await deletePluginHandler({ packageSlug: 'security' }, buildDeps());

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(mp.plugins).toHaveLength(1);
    });
  });
});
