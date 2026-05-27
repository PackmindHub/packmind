import { renderPluginHandler } from './renderPluginHandler';
import { readMarketplace, findPluginEntry } from './pluginsContext';
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { RenderPackageAsPluginResponse } from '@packmind/types';

type Deps = Parameters<typeof renderPluginHandler>[1];

describe('renderPluginHandler', () => {
  let tmp: string;
  let renderPlugin: jest.Mock;
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
    packmindCliHexa: { renderPlugin } as never,
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
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

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
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(renderPlugin).toHaveBeenCalledWith({
        packageSlug: 'security',
        mode: 'marketplace',
        pluginRoot: 'plugins/security/',
        pluginName: 'security',
      });
    });

    it('strips the space prefix from the package slug for the plugin name', async () => {
      await renderPluginHandler(
        { packageSlug: '@global/security' },
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

      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(
        readFileSync(join(tmp, 'plugins/security/commands/a.md'), 'utf8'),
      ).toBe('A');
      expect(
        readFileSync(join(tmp, 'plugins/security/skills/b/SKILL.md'), 'utf8'),
      ).toBe('B');
    });

    it('upserts the plugin entry into marketplace.json', async () => {
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

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

      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('Skipped 3 standards'),
      );
    });

    it('does not report skipped standards when none', async () => {
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Skipped'));
    });

    it('exits zero on success', async () => {
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(exit).toHaveBeenCalledWith(0);
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

      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(confirmOverwrite).toHaveBeenCalledWith(
        expect.stringContaining('./backend/plugins/security'),
      );
    });

    describe('when the user confirms', () => {
      beforeEach(() => {
        confirmOverwrite.mockResolvedValue(true);
      });

      it('re-renders using the existing entry path', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        expect(renderPlugin).toHaveBeenCalledWith({
          packageSlug: 'security',
          mode: 'marketplace',
          pluginRoot: 'backend/plugins/security/',
          pluginName: 'security',
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

        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        expect(
          readFileSync(
            join(tmp, 'backend/plugins/security/commands/a.md'),
            'utf8',
          ),
        ).toBe('A');
      });

      it('updates the description when it changed', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        const entry = findPluginEntry(mp, 'security');
        expect(entry?.source).toBe('./backend/plugins/security');
        expect(entry?.description).toBe('Security plugin');
      });

      it('exits zero', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        expect(exit).toHaveBeenCalledWith(0);
      });
    });

    describe('when the user declines', () => {
      beforeEach(() => {
        confirmOverwrite.mockResolvedValue(false);
      });

      it('does not render', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        expect(renderPlugin).not.toHaveBeenCalled();
      });

      it('does not mutate marketplace.json', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

        const mp = readMarketplace(
          join(tmp, '.claude-plugin/marketplace.json'),
        );
        expect(findPluginEntry(mp, 'security')?.description).toBe(
          'Old description',
        );
      });

      it('exits zero', async () => {
        await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

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
            source: 'git@my-provider.com/security-repo.git',
          },
        ],
      });
    });

    it('exits non-zero with a remote-source error', async () => {
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(error).toHaveBeenCalledWith(
        'Plugin "security" has a remote source. Run this command in the workspace of the remote plugin.',
      );
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('does not render or prompt', async () => {
      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

      expect(renderPlugin).not.toHaveBeenCalled();
      expect(confirmOverwrite).not.toHaveBeenCalled();
    });

    it('does not mutate marketplace.json', async () => {
      const before = readFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        'utf8',
      );

      await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

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
          { packageSlug: '@global/security' },
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
          await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

          expect(renderPlugin).toHaveBeenCalledWith({
            packageSlug: 'security',
            mode: 'standalone',
            pluginRoot: '/',
            pluginName: 'security',
          });
        });

        it('writes the rendered files', async () => {
          renderPlugin.mockResolvedValue(
            buildResponse({
              files: [{ path: 'commands/a.md', content: 'A' }],
            }),
          );

          await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

          expect(readFileSync(join(tmp, 'commands/a.md'), 'utf8')).toBe('A');
        });

        it('exits zero', async () => {
          await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

          expect(exit).toHaveBeenCalledWith(0);
        });
      });

      describe('when the user declines', () => {
        beforeEach(() => {
          confirmOverwrite.mockResolvedValue(false);
        });

        it('does not render', async () => {
          await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

          expect(renderPlugin).not.toHaveBeenCalled();
        });

        it('exits zero', async () => {
          await renderPluginHandler({ packageSlug: 'security' }, buildDeps());

          expect(exit).toHaveBeenCalledWith(0);
        });
      });
    });
  });
});
