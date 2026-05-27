import {
  describeWithUserSignedUp,
  setupGitRepo,
  RunCliResult,
  readFile,
  fileExists,
  UserSignedUpContext,
} from './helpers';
import { Package } from '@packmind/types';
import fs from 'fs';
import path from 'path';

type MarketplaceEntry = {
  name: string;
  source: string;
  description?: string;
};

type Marketplace = {
  plugins: MarketplaceEntry[];
};

function writeMarketplace(testDir: string, content: Marketplace): void {
  const dir = path.join(testDir, '.claude-plugin');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'marketplace.json'),
    `${JSON.stringify(content, null, 2)}\n`,
  );
}

function readMarketplace(testDir: string): Marketplace {
  return JSON.parse(
    readFile('.claude-plugin/marketplace.json', testDir),
  ) as Marketplace;
}

function writeStandaloneManifest(testDir: string, name: string): void {
  const dir = path.join(testDir, '.claude-plugin');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'plugin.json'),
    `${JSON.stringify({ name, version: '0.0.1' }, null, 2)}\n`,
  );
}

function listMarkdownFiles(absoluteDir: string): string[] {
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        result.push(full);
      }
    }
  };
  walk(absoluteDir);
  return result;
}

/**
 * Seeds a package with one recipe (command) and `standardCount` standards in the
 * signed-up user's global space. There is no skill-creation gateway, so packages
 * are seeded with recipes and standards only.
 */
async function seedPackage(
  context: UserSignedUpContext,
  standardCount = 0,
): Promise<Package> {
  const unique = Date.now() + Math.floor(Math.random() * 100000);

  const recipe = await context.gateway.commands.create({
    name: `Plugin recipe ${unique}`,
    summary: 'A recipe used by the plugins e2e suite',
    spaceId: context.space.id,
    steps: [
      {
        name: 'Step one',
        description: 'Do the thing',
      },
    ],
  });

  const standardIds = [];
  for (let i = 0; i < standardCount; i++) {
    const standardResponse = await context.gateway.standards.create({
      name: `Plugin standard ${unique}-${i}`,
      description: 'A standard used by the plugins e2e suite',
      rules: [],
      scope: '',
      spaceId: context.space.id,
    });
    standardIds.push(standardResponse.standard.id);
  }

  const packageResponse = await context.gateway.packages.create({
    name: `Plugin package ${unique}`,
    description: 'A package used by the plugins e2e suite',
    recipeIds: [recipe.id],
    standardIds,
    spaceId: context.space.id,
  });

  return packageResponse.package;
}

describeWithUserSignedUp('plugins render/delete commands', (getContext) => {
  let context: UserSignedUpContext;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);
  });

  describe('Rule 1: marketplace mode', () => {
    let pkg: Package;
    let scopedSlug: string;

    beforeEach(async () => {
      pkg = await seedPackage(context);
      scopedSlug = `@${context.space.slug}/${pkg.slug}`;
    });

    describe('when rendering into a marketplace with no existing entry', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        writeMarketplace(context.testDir, { plugins: [] });
        result = await context.runCli(`plugins render ${scopedSlug}`);
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('renders the plugin manifest into plugins/<slug>/', () => {
        expect(
          fileExists(
            `plugins/${pkg.slug}/.claude-plugin/plugin.json`,
            context.testDir,
          ),
        ).toBe(true);
      });

      it('renders at least one command markdown file', () => {
        const commandsDir = path.join(
          context.testDir,
          'plugins',
          pkg.slug,
          'commands',
        );
        expect(listMarkdownFiles(commandsDir).length).toBeGreaterThan(0);
      });

      it('adds the plugin entry to marketplace.json', () => {
        const marketplace = readMarketplace(context.testDir);
        const entry = marketplace.plugins.find((p) => p.name === pkg.slug);
        expect(entry).toBeDefined();
        expect(entry?.source).toBe(`./plugins/${pkg.slug}`);
      });

      it('confirms what was rendered and that marketplace.json was updated', () => {
        expect(result.stdout).toMatch(
          new RegExp(`Rendered \\d+ files into \\./plugins/${pkg.slug}/`),
        );
        expect(result.stdout).toContain(
          'Updated .claude-plugin/marketplace.json',
        );
      });
    });

    describe('when deleting an existing local plugin entry', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        writeMarketplace(context.testDir, { plugins: [] });
        await context.runCli(`plugins render ${scopedSlug}`);
        result = await context.runCli(`plugins delete ${scopedSlug}`);
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('removes the rendered plugin folder', () => {
        expect(fileExists(`plugins/${pkg.slug}`, context.testDir)).toBe(false);
      });

      it('removes the entry from marketplace.json', () => {
        const marketplace = readMarketplace(context.testDir);
        expect(marketplace.plugins.find((p) => p.name === pkg.slug)).toBe(
          undefined,
        );
      });

      it('confirms the removal in stdout', () => {
        expect(result.stdout).toContain('updated marketplace.json');
      });
    });

    describe('when an existing local entry has a custom source', () => {
      beforeEach(() => {
        writeMarketplace(context.testDir, {
          plugins: [
            {
              name: pkg.slug,
              source: `./backend/plugins/${pkg.slug}`,
            },
          ],
        });
      });

      describe('and the user confirms the overwrite', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          result = await context.runCli(`plugins render ${scopedSlug}`, {
            stdin: 'y\n',
          });
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('renders files under the existing custom source path', () => {
          expect(
            fileExists(
              `backend/plugins/${pkg.slug}/.claude-plugin/plugin.json`,
              context.testDir,
            ),
          ).toBe(true);
        });

        it('confirms the re-render into the existing source path', () => {
          expect(result.stdout).toMatch(
            new RegExp(
              `Re-rendered \\d+ files into \\./backend/plugins/${pkg.slug}`,
            ),
          );
        });
      });

      describe('and the user declines the overwrite', () => {
        let result: RunCliResult;

        beforeEach(async () => {
          result = await context.runCli(`plugins render ${scopedSlug}`, {
            stdin: 'n\n',
          });
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('reports that no changes were made', () => {
          expect(result.stdout).toContain('No changes made.');
        });

        it('does not write any files under the custom source path', () => {
          expect(
            fileExists(`backend/plugins/${pkg.slug}`, context.testDir),
          ).toBe(false);
        });
      });
    });

    describe('when an existing entry has a remote source', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        writeMarketplace(context.testDir, {
          plugins: [
            {
              name: pkg.slug,
              source: 'github:owner/repo',
            },
          ],
        });
        result = await context.runCli(`plugins render ${scopedSlug}`);
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('reports that the plugin has a remote source', () => {
        expect(result.stderr).toContain('has a remote source');
      });

      it('does not render any plugin folder', () => {
        expect(fileExists(`plugins/${pkg.slug}`, context.testDir)).toBe(false);
      });
    });
  });

  describe('Rule 2: standalone mode', () => {
    let pkg: Package;
    let scopedSlug: string;

    beforeEach(async () => {
      pkg = await seedPackage(context);
      scopedSlug = `@${context.space.slug}/${pkg.slug}`;
    });

    describe('when plugin.json name matches the package slug', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        writeStandaloneManifest(context.testDir, pkg.slug);
        result = await context.runCli(`plugins render ${scopedSlug}`, {
          stdin: 'y\n',
        });
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('renders command markdown files at the workspace root', () => {
        const commandsDir = path.join(context.testDir, 'commands');
        expect(listMarkdownFiles(commandsDir).length).toBeGreaterThan(0);
      });

      it('keeps the standalone manifest name unchanged', () => {
        const manifest = JSON.parse(
          readFile('.claude-plugin/plugin.json', context.testDir),
        ) as { name?: string };
        expect(manifest.name).toBe(pkg.slug);
      });

      it('confirms the re-render into the workspace root', () => {
        expect(result.stdout).toMatch(/Re-rendered \d+ files into \.\//);
      });
    });

    describe('when plugin.json name does not match the package slug', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        writeStandaloneManifest(context.testDir, `${pkg.slug}-mismatch`);
        result = await context.runCli(`plugins render ${scopedSlug}`);
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('reports the plugin is not handled in this repo', () => {
        expect(result.stderr).toContain('is not handled in this repo');
      });

      it('does not render command markdown files', () => {
        const commandsDir = path.join(context.testDir, 'commands');
        expect(listMarkdownFiles(commandsDir).length).toBe(0);
      });
    });
  });

  describe('Rule 3: skipped standards and missing manifest', () => {
    describe('when rendering a package that bundles standards in marketplace mode', () => {
      const seededStandardCount = 3;
      let pkg: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        pkg = await seedPackage(context, seededStandardCount);
        writeMarketplace(context.testDir, { plugins: [] });
        result = await context.runCli(
          `plugins render @${context.space.slug}/${pkg.slug}`,
        );
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the number of skipped standards', () => {
        expect(result.stdout).toMatch(
          new RegExp(`Skipped ${seededStandardCount} standards`),
        );
      });

      it('does not emit any standards markdown files', () => {
        const pluginRoot = path.join(context.testDir, 'plugins', pkg.slug);
        const rulesDir = path.join(pluginRoot, 'rules');
        const standardsDir = path.join(pluginRoot, 'standards');
        expect(listMarkdownFiles(rulesDir).length).toBe(0);
        expect(listMarkdownFiles(standardsDir).length).toBe(0);
      });
    });

    describe('when neither manifest is present', () => {
      let pkg: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        pkg = await seedPackage(context);
        result = await context.runCli(
          `plugins render @${context.space.slug}/${pkg.slug}`,
        );
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('reports that no plugin manifest was found', () => {
        const combined = result.stdout + result.stderr;
        expect(combined).toContain(
          'No .claude-plugin/marketplace.json or .claude-plugin/plugin.json found',
        );
      });
    });
  });
});
