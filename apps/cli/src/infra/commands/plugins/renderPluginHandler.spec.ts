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
  const printedErrors: string[] = [];
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
    error: (msg: string) => printedErrors.push(msg),
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
    printedErrors.length = 0;
    tmp = mkdtempSync(join(tmpdir(), 'pm-render-'));
    renderPlugin = jest.fn().mockResolvedValue(buildResponse());
    tryGetGitRepositoryRoot = jest.fn().mockResolvedValue(tmp);
    getGitRemoteUrlFromPath = jest
      .fn()
      .mockReturnValue('git@github.com:org/repo.git');
    getCurrentBranch = jest.fn().mockReturnValue('main');
    exit = jest.fn();
    log = jest.fn();
    confirmOverwrite = jest.fn();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('when no plugin manifest exists', () => {
    beforeEach(async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );
    });

    it('prints an error', () => {
      expect(printedErrors[0]).toMatch(/No .claude-plugin/);
    });

    it('exits non-zero', () => {
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('does not call renderPlugin', () => {
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

    describe('writes each rendered file under the cwd', () => {
      beforeEach(async () => {
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
      });

      it('writes the first file', () => {
        expect(
          readFileSync(join(tmp, 'plugins/security/commands/a.md'), 'utf8'),
        ).toBe('A');
      });

      it('writes the second file', () => {
        expect(
          readFileSync(join(tmp, 'plugins/security/skills/b/SKILL.md'), 'utf8'),
        ).toBe('B');
      });
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

    describe('when skipped standards are present', () => {
      it('reports skipped standards', async () => {
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
    });

    describe('when no standards are skipped', () => {
      it('does not report skipped standards', async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );

        expect(log).not.toHaveBeenCalledWith(
          expect.stringContaining('Skipped'),
        );
      });
    });

    it('exits zero on success', async () => {
      await renderPluginHandler(
        { packageSlug: { packageSlug: 'security' } },
        buildDeps(),
      );

      expect(exit).toHaveBeenCalledWith(0);
    });

    describe('when not in a git repository', () => {
      it('passes empty git context', async () => {
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

      describe('when the description changed', () => {
        beforeEach(async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );
        });

        it('preserves the existing source path', () => {
          const mp = readMarketplace(
            join(tmp, '.claude-plugin/marketplace.json'),
          );
          const entry = findPluginEntry(mp, 'security');
          expect(entry?.source).toBe('./backend/plugins/security');
        });

        it('updates the description', () => {
          const mp = readMarketplace(
            join(tmp, '.claude-plugin/marketplace.json'),
          );
          const entry = findPluginEntry(mp, 'security');
          expect(entry?.description).toBe('Security plugin');
        });
      });

      describe('when the package no longer has a description', () => {
        it('clears the description', async () => {
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
      });

      describe('when the package description is an empty string', () => {
        it('clears the description', async () => {
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

    describe('exits non-zero with a remote-source error', () => {
      beforeEach(async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );
      });

      it('reports the remote-source error', () => {
        expect(printedErrors[0]).toBe(
          'Plugin "security" has a remote source. Run this command in the workspace of the remote plugin.',
        );
      });

      it('exits non-zero', () => {
        expect(exit).toHaveBeenCalledWith(1);
      });
    });

    describe('does not render or prompt', () => {
      beforeEach(async () => {
        await renderPluginHandler(
          { packageSlug: { packageSlug: 'security' } },
          buildDeps(),
        );
      });

      it('does not render', () => {
        expect(renderPlugin).not.toHaveBeenCalled();
      });

      it('does not prompt', () => {
        expect(confirmOverwrite).not.toHaveBeenCalled();
      });
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

      describe('exits non-zero with the documented message', () => {
        beforeEach(async () => {
          await renderPluginHandler(
            { packageSlug: { packageSlug: 'security' } },
            buildDeps(),
          );
        });

        it('reports the documented error', () => {
          expect(printedErrors[0]).toBe(
            "The plugin 'security' is not handled in this repo.",
          );
        });

        it('exits non-zero', () => {
          expect(exit).toHaveBeenCalledWith(1);
        });
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
