import { renderPluginHandler } from './renderPluginHandler';
import { readMarketplace, findPluginEntry } from './pluginsContext';
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { RenderPackageAsPluginResponse } from '@packmind/types';
import { parsePackageSlug } from '../../../domain/entities/PackageSlug';

type Deps = Parameters<typeof renderPluginHandler>[1];

describe('renderPluginHandler', () => {
  let tmp: string;
  let renderPlugin: jest.Mock;
  let tryGetGitRepositoryRoot: jest.Mock;
  let getGitRemoteUrlFromPath: jest.Mock;
  let getCurrentBranch: jest.Mock;
  let exit: jest.Mock;
  let log: jest.Mock;
  let error: jest.Mock;
  let confirmOverwrite: jest.Mock;

  const buildResponse = (
    overrides?: Partial<RenderPackageAsPluginResponse>,
  ): RenderPackageAsPluginResponse => ({
    files: [{ path: 'plugins/security/commands/foo.md', content: '# foo' }],
    skippedStandardsCount: 0,
    pluginName: 'security',
    pluginDescription: 'Security plugin',
    pluginVersion: '1.0.0',
    ...overrides,
  });

  const buildDeps = (): Deps => ({
    packmindCliHexa: {
      renderPlugin,
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
    tmp = mkdtempSync(join(tmpdir(), 'pm-render-'));
    renderPlugin = jest.fn().mockResolvedValue(buildResponse());
    tryGetGitRepositoryRoot = jest.fn().mockResolvedValue(tmp);
    getGitRemoteUrlFromPath = jest
      .fn()
      .mockReturnValue('git@github.com:org/repo.git');
    getCurrentBranch = jest.fn().mockReturnValue('main');
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
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('No .claude-plugin'),
      );
      expect(exit).toHaveBeenCalledWith(1);
      expect(renderPlugin).not.toHaveBeenCalled();
    });
  });

  describe('marketplace mode first render', () => {
    beforeEach(() => {
      writeMarketplaceManifest({ name: 'mp', plugins: [] });
    });

    it('calls renderPlugin with marketplace mode and the default plugin root', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(renderPlugin).toHaveBeenCalledWith({
        packageSlug: 'security',
        mode: 'marketplace',
        pluginRoot: 'plugins/security/',
        pluginName: 'security',
        gitRemoteUrl: 'git@github.com:org/repo.git',
        gitBranch: 'main',
      });
    });

    it('strips the space prefix from the package slug for the plugin name', async () => {
      await renderPluginHandler(
        { packageSlug: { spaceSlug: 'global', packageSlug: 'security' } },
        buildDeps(),
      );

      expect(renderPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginName: 'security',
          pluginRoot: 'plugins/security/',
        }),
      );
    });

    it('writes each rendered file under the cwd', async () => {
      renderPlugin.mockResolvedValue(
        buildResponse({
          files: [
            { path: 'plugins/security/commands/a.md', content: 'A' },
            { path: 'plugins/security/skills/b/SKILL.md', content: 'B' },
          ],
        }),
      );

      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(
        readFileSync(join(tmp, 'plugins/security/commands/a.md'), 'utf8'),
      ).toBe('A');
      expect(
        readFileSync(join(tmp, 'plugins/security/skills/b/SKILL.md'), 'utf8'),
      ).toBe('B');
    });

    it('upserts the plugin entry into marketplace.json', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      const mp = readMarketplace(join(tmp, '.claude-plugin/marketplace.json'));
      expect(findPluginEntry(mp, 'security')).toEqual({
        name: 'security',
        source: './plugins/security',
        description: 'Security plugin',
      });
    });

    it('reports skipped standards when present', async () => {
      renderPlugin.mockResolvedValue(
        buildResponse({ skippedStandardsCount: 3 }),
      );

      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('Skipped 3 standards'),
      );
    });

    it('does not report skipped standards when none', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Skipped'));
    });

    it('exits zero on success', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(exit).toHaveBeenCalledWith(0);
    });

    it('passes empty git context when not in a git repository', async () => {
      tryGetGitRepositoryRoot.mockResolvedValue(null);

      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(renderPlugin).toHaveBeenCalledWith(
        expect.objectContaining({ gitRemoteUrl: '', gitBranch: '' }),
      );
    });
  });

  describe('marketplace mode with an existing local entry', () => {
    beforeEach(() => {
      writeMarketplaceManifest({
        name: 'mp',
        plugins: [
          {
            name: 'security',
            source: './backend/plugins/security',
            description: 'Old description',
          },
        ],
      });
    });

    it('prompts the user before overwriting', async () => {
      confirmOverwrite.mockResolvedValue(true);

      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(confirmOverwrite).toHaveBeenCalledWith(
        expect.stringContaining('./backend/plugins/security'),
      );
    });

    describe('when the user confirms', () => {
      beforeEach(() => {
        confirmOverwrite.mockResolvedValue(true);
      });

      it('re-renders using the existing entry path', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(renderPlugin).toHaveBeenCalledWith({
          packageSlug: 'security',
          mode: 'marketplace',
          pluginRoot: 'backend/plugins/security/',
          pluginName: 'security',
          gitRemoteUrl: 'git@github.com:org/repo.git',
          gitBranch: 'main',
        });
      });

      it('writes files at the existing entry path', async () => {
        renderPlugin.mockResolvedValue(
          buildResponse({
            files: [
              {
                path: 'backend/plugins/security/commands/a.md',
                content: 'A',
              },
            ],
          }),
        );

        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(
          readFileSync(
            join(tmp, 'backend/plugins/security/commands/a.md'),
            'utf8',
          ),
        ).toBe('A');
      });

      it('updates the description when it changed', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        const entry = findPluginEntry(mp, 'security');
        expect(entry?.source).toBe('./backend/plugins/security');
        expect(entry?.description).toBe('Security plugin');
      });

      it('clears the description when the package no longer has one', async () => {
        renderPlugin.mockResolvedValue(
          buildResponse({ pluginDescription: undefined }),
        );

        await renderPluginHandler(
          { packageSlug: parsePackageSlug('security') },
          buildDeps(),
        );

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        const entry = findPluginEntry(mp, 'security');
        expect(entry?.description).toBeUndefined();
      });

      it('clears the description when the package description is an empty string', async () => {
        renderPlugin.mockResolvedValue(
          buildResponse({ pluginDescription: '' }),
        );

        await renderPluginHandler(
          { packageSlug: parsePackageSlug('security') },
          buildDeps(),
        );

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        const entry = findPluginEntry(mp, 'security');
        expect(entry?.description).toBeUndefined();
      });

      it('exits zero', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(exit).toHaveBeenCalledWith(0);
      });
    });

    describe('when the user declines', () => {
      beforeEach(() => {
        confirmOverwrite.mockResolvedValue(false);
      });

      it('does not render', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(renderPlugin).not.toHaveBeenCalled();
      });

      it('does not mutate marketplace.json', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        expect(findPluginEntry(mp, 'security')?.description).toBe(
          'Old description',
        );
      });

      it('exits zero', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(exit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('marketplace mode with an existing remote entry', () => {
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

    it('exits non-zero with a remote-source error', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(error).toHaveBeenCalledWith(
        'Plugin "security" has a remote source. Run this command in the workspace of the remote plugin.',
      );
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('does not render or prompt', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(renderPlugin).not.toHaveBeenCalled();
      expect(confirmOverwrite).not.toHaveBeenCalled();
    });

    it('does not mutate marketplace.json', async () => {
      const before = readFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        'utf8',
      );

      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(
        readFileSync(join(tmp, '.claude-plugin/marketplace.json'), 'utf8'),
      ).toBe(before);
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

    describe('when the manifest name matches', () => {
      beforeEach(() => {
        writeStandaloneManifest({ name: 'security' });
      });

      it('prompts before overwriting', async () => {
        confirmOverwrite.mockResolvedValue(true);

        await renderPluginHandler(
          { packageSlug: { spaceSlug: 'global', packageSlug: 'security' } },
          buildDeps(),
        );

        expect(confirmOverwrite).toHaveBeenCalledWith(
          expect.stringContaining('security'),
        );
      });

      describe('when the user confirms', () => {
        beforeEach(() => {
          confirmOverwrite.mockResolvedValue(true);
        });

        it('renders in standalone mode at the workspace root', async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );

          expect(renderPlugin).toHaveBeenCalledWith({
            packageSlug: 'security',
            mode: 'standalone',
            pluginRoot: '/',
            pluginName: 'security',
            gitRemoteUrl: 'git@github.com:org/repo.git',
            gitBranch: 'main',
          });
        });

        it('writes the rendered files', async () => {
          renderPlugin.mockResolvedValue(
            buildResponse({
              files: [{ path: 'commands/a.md', content: 'A' }],
            }),
          );

          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );

          expect(readFileSync(join(tmp, 'commands/a.md'), 'utf8')).toBe('A');
        });

        it('exits zero', async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );

          expect(exit).toHaveBeenCalledWith(0);
        });
      });

      describe('when the user declines', () => {
        beforeEach(() => {
          confirmOverwrite.mockResolvedValue(false);
        });

        it('does not render', async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );

          expect(renderPlugin).not.toHaveBeenCalled();
        });

        it('exits zero', async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );

          expect(exit).toHaveBeenCalledWith(0);
        });
      });
    });

    describe('when the manifest name does not match', () => {
      beforeEach(() => {
        writeStandaloneManifest({ name: 'frontend' });
      });

      it('exits non-zero with the documented message', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(error).toHaveBeenCalledWith(
          "The plugin 'security' is not handled in this repo.",
        );
        expect(exit).toHaveBeenCalledWith(1);
      });

      it('does not call the gateway', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(renderPlugin).not.toHaveBeenCalled();
      });

      it('does not prompt for overwrite', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(confirmOverwrite).not.toHaveBeenCalled();
      });

      it('writes no files', async () => {
        renderPlugin.mockResolvedValue(
          buildResponse({
            files: [{ path: 'commands/a.md', content: 'A' }],
          }),
        );

        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(existsSync(join(tmp, 'commands/a.md'))).toBe(false);
      });
    });
  });
});
