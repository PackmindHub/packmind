import {
  ClaudePluginDeployer,
  PluginTrackingHooksInput,
} from './ClaudePluginDeployer';
import {
  GitRepo,
  RecipeVersion,
  SkillFile,
  SkillVersion,
  StandardVersion,
  Target,
  createRecipeId,
  createRecipeVersionId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createTargetId,
  createUserId,
} from '@packmind/types';

function makeTarget(path: string): Target {
  return {
    id: createTargetId('t1'),
    name: 'plugin-root',
    path,
    gitRepoId: 'g1' as Target['gitRepoId'],
  };
}

function makeRecipe(overrides: Partial<RecipeVersion> = {}): RecipeVersion {
  return {
    id: createRecipeVersionId('rv1'),
    recipeId: createRecipeId('r1'),
    name: 'audit',
    slug: 'audit',
    content: '# audit\n',
    version: 1,
    userId: null,
    ...overrides,
  };
}

function makeSkillFile(overrides: Partial<SkillFile> = {}): SkillFile {
  return {
    id: createSkillFileId('sf1'),
    skillVersionId: createSkillVersionId('sv1'),
    path: 'SKILL.md',
    content: '# skill\n',
    permissions: '0644',
    isBase64: false,
    ...overrides,
  };
}

function makeSkill(overrides: Partial<SkillVersion> = {}): SkillVersion {
  return {
    id: createSkillVersionId('sv1'),
    skillId: createSkillId('s1'),
    version: 1,
    userId: createUserId('u1'),
    name: 'Threat Model',
    slug: 'threat-model',
    description: 'Threat modeling skill',
    prompt: '# prompt\n',
    ...overrides,
  };
}

describe('ClaudePluginDeployer', () => {
  describe('constructor', () => {
    it('instantiates without throwing', () => {
      expect(() => new ClaudePluginDeployer()).not.toThrow();
    });
  });

  describe('deployRecipes', () => {
    it('renders one .md per recipe under <plugin-root>/commands/', async () => {
      const deployer = new ClaudePluginDeployer();
      const recipe = makeRecipe({ slug: 'audit' });

      const result = await deployer.deployRecipes(
        [recipe],
        {} as GitRepo,
        makeTarget('/'),
      );

      const paths = result.createOrUpdate.map((f) => f.path);
      expect(paths).toEqual(['commands/audit.md']);
    });

    describe('when no recipes', () => {
      it('returns an empty createOrUpdate', async () => {
        const result = await new ClaudePluginDeployer().deployRecipes(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('when Target.path is set', () => {
      it('uses Target.path as the plugin root prefix', async () => {
        const result = await new ClaudePluginDeployer().deployRecipes(
          [makeRecipe({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget('plugins/security/'),
        );
        expect(result.createOrUpdate[0].path).toBe(
          'plugins/security/commands/audit.md',
        );
      });
    });

    it('propagates recipe content into the file body', async () => {
      const result = await new ClaudePluginDeployer().deployRecipes(
        [makeRecipe({ slug: 'audit', content: '# hello' })],
        {} as GitRepo,
        makeTarget('/'),
      );
      const file = result.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      expect(file.content).toBe('# hello');
    });
  });

  describe('deploySkills', () => {
    it('renders SKILL.md per skill under <plugin-root>/skills/<slug>/', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        files: [
          makeSkillFile({ path: 'SKILL.md', content: '# main skill body' }),
        ],
      });

      const result = await new ClaudePluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('plugins/security/'),
      );

      expect(result.createOrUpdate.map((f) => f.path)).toEqual([
        'plugins/security/skills/threat-model/SKILL.md',
      ]);
    });

    it('renders nested skill files preserving relative paths', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        files: [
          makeSkillFile({ path: 'SKILL.md', content: '# main' }),
          makeSkillFile({
            id: createSkillFileId('sf2'),
            path: 'references/example.md',
            content: 'ex',
          }),
        ],
      });

      const result = await new ClaudePluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('/'),
      );

      expect(result.createOrUpdate.map((f) => f.path).sort()).toEqual([
        'skills/threat-model/SKILL.md',
        'skills/threat-model/references/example.md',
      ]);
    });

    describe('when no files are provided', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          name: 'Threat Model',
          description: 'Threat modeling skill',
          prompt: '# prompt body',
          files: undefined,
        });

        result = await new ClaudePluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('generates exactly one SKILL.md', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates SKILL.md at the correct path', () => {
        expect(result.createOrUpdate[0].path).toBe(
          'skills/threat-model/SKILL.md',
        );
      });

      it('generates SKILL.md with name in frontmatter from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain("name: 'Threat Model'");
      });

      it('generates SKILL.md with description in frontmatter from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain("description: 'Threat modeling skill'");
      });

      it('generates SKILL.md with prompt body from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain('# prompt body');
      });
    });

    describe('always generates SKILL.md with frontmatter, ignoring any SKILL.md in files', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;
      let skillMd: (typeof result.createOrUpdate)[0] | undefined;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          name: 'Threat Model',
          description: 'Threat modeling skill',
          prompt: '# generated body',
          files: [
            makeSkillFile({
              path: 'SKILL.md',
              content: '# raw without frontmatter',
            }),
            makeSkillFile({
              id: createSkillFileId('sf2'),
              path: 'references/example.md',
              content: 'ex',
            }),
          ],
        });

        result = await new ClaudePluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );

        skillMd = result.createOrUpdate.find(
          (f) => f.path === 'skills/threat-model/SKILL.md',
        );
      });

      it('includes name frontmatter in generated SKILL.md', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).toContain("name: 'Threat Model'");
      });

      it('includes the generated prompt body in SKILL.md', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).toContain('# generated body');
      });

      it('does not include the raw SKILL.md content', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).not.toContain('# raw without frontmatter');
      });

      it('outputs all expected file paths', () => {
        expect(result.createOrUpdate.map((f) => f.path).sort()).toEqual([
          'skills/threat-model/SKILL.md',
          'skills/threat-model/references/example.md',
        ]);
      });
    });

    describe('when no skills', () => {
      it('returns empty', async () => {
        const result = await new ClaudePluginDeployer().deploySkills(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('tags each file with skill metadata', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          skillId: createSkillId('skill-abc'),
          files: [makeSkillFile({ path: 'SKILL.md' })],
        });
        result = await new ClaudePluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('tags each file with artifactType "skill"', () => {
        expect(result.createOrUpdate[0].artifactType).toBe('skill');
      });

      it('tags each file with the skill id', () => {
        expect(result.createOrUpdate[0].artifactId).toBe('skill-abc');
      });
    });
  });

  describe('deployStandards', () => {
    describe('when standards are present', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deployStandards']>>;

      beforeEach(async () => {
        const standards = [
          {} as StandardVersion,
          {} as StandardVersion,
          {} as StandardVersion,
        ];
        result = await new ClaudePluginDeployer().deployStandards(
          standards,
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('returns empty createOrUpdate', () => {
        expect(result.createOrUpdate).toEqual([]);
      });

      it('returns empty delete', () => {
        expect(result.delete).toEqual([]);
      });
    });

    it('exposes the skipped count via getLastSkippedStandardsCount()', async () => {
      const deployer = new ClaudePluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion, {} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(deployer.getLastSkippedStandardsCount()).toBe(2);
    });

    it('resets the skipped count on a subsequent empty call', async () => {
      const deployer = new ClaudePluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      await deployer.deployStandards([], {} as GitRepo, makeTarget('/'));
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });

    it('starts with a skipped count of zero before any call', () => {
      const deployer = new ClaudePluginDeployer();
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });
  });

  describe('deployPluginManifest', () => {
    describe('returns a FileUpdates with .claude-plugin/plugin.json under plugin root', () => {
      let updates: ReturnType<ClaudePluginDeployer['deployPluginManifest']>;

      beforeEach(() => {
        updates = new ClaudePluginDeployer().deployPluginManifest(
          {
            name: 'security',
            description: 'Security helpers',
            version: '0.1.0',
          },
          makeTarget('plugins/security/'),
        );
      });

      it('creates exactly one file', () => {
        expect(updates.createOrUpdate).toHaveLength(1);
      });

      it('places the file at the correct path under plugin root', () => {
        expect(updates.createOrUpdate[0].path).toBe(
          'plugins/security/.claude-plugin/plugin.json',
        );
      });
    });

    describe('when target.path is "/"', () => {
      it('places plugin.json at the workspace root', () => {
        const updates = new ClaudePluginDeployer().deployPluginManifest(
          { name: 'security', version: '0.1.0' },
          makeTarget('/'),
        );
        expect(updates.createOrUpdate[0].path).toBe(
          '.claude-plugin/plugin.json',
        );
      });
    });

    it('includes name, description, and version in the manifest content', () => {
      const updates = new ClaudePluginDeployer().deployPluginManifest(
        { name: 'security', description: 'desc', version: '0.1.0' },
        makeTarget('/'),
      );
      const file = updates.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      const parsed = JSON.parse(file.content);
      expect(parsed).toEqual({
        name: 'security',
        description: 'desc',
        version: '0.1.0',
      });
    });

    describe('tags the file with the plugin name', () => {
      let updates: ReturnType<ClaudePluginDeployer['deployPluginManifest']>;

      beforeEach(() => {
        updates = new ClaudePluginDeployer().deployPluginManifest(
          { name: 'security', version: '0.1.0' },
          makeTarget('/'),
        );
      });

      it('tags with artifact id', () => {
        expect(updates.createOrUpdate[0].artifactId).toBe('security');
      });

      it('tags with artifact name', () => {
        expect(updates.createOrUpdate[0].artifactName).toBe('security');
      });
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the plugin-relative skills folder so the capability flag matches', () => {
      expect(new ClaudePluginDeployer().getSkillsFolderPath()).toBe('skills/');
    });
  });

  describe('deployTrackingHooks', () => {
    const trackingInput: PluginTrackingHooksInput = {
      apiBaseUrl: 'https://app.packmind.io/api',
      marketplaceName: 'acme-marketplace',
      pluginSlug: 'security',
      trackingToken: 'tok_abc123',
    };

    describe('emits exactly four hook files under <plugin-root>/hooks/', () => {
      let updates: ReturnType<ClaudePluginDeployer['deployTrackingHooks']>;

      beforeEach(() => {
        updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('plugins/security/'),
        );
      });

      it('creates exactly four files', () => {
        expect(updates.createOrUpdate).toHaveLength(4);
      });

      it('emits hooks/hooks.json at the correct path', () => {
        const paths = updates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain('plugins/security/hooks/hooks.json');
      });

      it('emits hooks/track-install.sh at the correct path', () => {
        const paths = updates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain('plugins/security/hooks/track-install.sh');
      });

      it('emits hooks/track-install.ps1 at the correct path', () => {
        const paths = updates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain('plugins/security/hooks/track-install.ps1');
      });

      it('emits hooks/packmind-tracking.env at the correct path', () => {
        const paths = updates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain('plugins/security/hooks/packmind-tracking.env');
      });

      it('has an empty delete list', () => {
        expect(updates.delete).toEqual([]);
      });
    });

    describe('when target.path is "/"', () => {
      let rootPaths: string[];

      beforeEach(() => {
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('/'),
        );
        rootPaths = updates.createOrUpdate.map((f) => f.path);
      });

      it('emits hooks/hooks.json without a path prefix', () => {
        expect(rootPaths).toContain('hooks/hooks.json');
      });

      it('emits hooks/track-install.sh without a path prefix', () => {
        expect(rootPaths).toContain('hooks/track-install.sh');
      });

      it('emits hooks/track-install.ps1 without a path prefix', () => {
        expect(rootPaths).toContain('hooks/track-install.ps1');
      });

      it('emits hooks/packmind-tracking.env without a path prefix', () => {
        expect(rootPaths).toContain('hooks/packmind-tracking.env');
      });
    });

    describe('hooks.json content', () => {
      let hooksJsonContent: string;

      beforeEach(() => {
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('/'),
        );
        const file = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/hooks.json',
        );
        if (!file?.content) throw new Error('expected hooks.json content');
        hooksJsonContent = file.content;
      });

      it('is valid JSON', () => {
        expect(() => JSON.parse(hooksJsonContent)).not.toThrow();
      });

      it('registers a SessionStart hook', () => {
        const parsed = JSON.parse(hooksJsonContent);
        expect(parsed.hooks).toHaveProperty('SessionStart');
      });

      it('uses the "startup" matcher', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const entry = parsed.hooks.SessionStart[0];
        expect(entry.matcher).toBe('startup');
      });

      it('sets suppressOutput to true', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(hook.suppressOutput).toBe(true);
      });

      it('sets a numeric timeout', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(typeof hook.timeout).toBe('number');
      });

      it('sets a timeout of 30 seconds or less', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(hook.timeout).toBeLessThanOrEqual(30);
      });

      it('references track-install.sh in the command', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(hook.command).toContain('track-install.sh');
      });

      it('uses || to chain sh and powershell in the command', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(hook.command).toContain('||');
      });

      it('references track-install.ps1 in the command', () => {
        const parsed = JSON.parse(hooksJsonContent);
        const hook = parsed.hooks.SessionStart[0].hooks[0];
        expect(hook.command).toContain('track-install.ps1');
      });

      it('ends with a trailing newline', () => {
        expect(hooksJsonContent.endsWith('\n')).toBe(true);
      });
    });

    describe('packmind-tracking.env sidecar content', () => {
      let envContent: string;

      beforeEach(() => {
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('/'),
        );
        const file = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/packmind-tracking.env',
        );
        if (!file?.content) throw new Error('expected env content');
        envContent = file.content;
      });

      it('contains PACKMIND_API_BASE_URL', () => {
        expect(envContent).toContain(
          'PACKMIND_API_BASE_URL=https://app.packmind.io/api',
        );
      });

      it('contains PACKMIND_MARKETPLACE_NAME', () => {
        expect(envContent).toContain(
          'PACKMIND_MARKETPLACE_NAME=acme-marketplace',
        );
      });

      it('contains PACKMIND_PLUGIN_SLUG', () => {
        expect(envContent).toContain('PACKMIND_PLUGIN_SLUG=security');
      });

      it('contains PACKMIND_TRACKING_TOKEN', () => {
        expect(envContent).toContain('PACKMIND_TRACKING_TOKEN=tok_abc123');
      });

      it('is in flat KEY=VALUE format (no JSON)', () => {
        // Each non-empty line should be KEY=VALUE
        const lines = envContent.split('\n').filter((l) => l.trim() !== '');
        for (const line of lines) {
          expect(line).toMatch(/^[A-Z_]+=.+$/);
        }
      });
    });

    describe('track-install.sh content', () => {
      let shContent: string;

      beforeEach(() => {
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('/'),
        );
        const file = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/track-install.sh',
        );
        if (!file?.content) throw new Error('expected sh content');
        shContent = file.content;
      });

      it('starts with a POSIX shebang', () => {
        expect(shContent.startsWith('#!/bin/sh')).toBe(true);
      });

      it('injects the plugin slug', () => {
        expect(shContent).toContain('security');
      });

      it('does not hardcode the marketplace name as a literal in the script body', () => {
        // The marketplace name must NOT be TS-interpolated into the script; it
        // is loaded from the sidecar via $PACKMIND_MARKETPLACE_NAME at runtime.
        expect(shContent).not.toContain(`MARKETPLACE_NAME="acme-marketplace"`);
      });

      it('references the PACKMIND_MARKETPLACE_NAME sidecar variable', () => {
        expect(shContent).toContain('PACKMIND_MARKETPLACE_NAME');
      });

      it('reads the sidecar env file', () => {
        expect(shContent).toContain('packmind-tracking.env');
      });

      it('sources the sidecar (POSIX . command)', () => {
        expect(shContent).toMatch(/\.\s+["']?\$[{(]?SIDECAR/);
      });

      it('checks settings.local.json for local scope', () => {
        expect(shContent).toContain('settings.local.json');
      });

      it('checks settings.json for project scope', () => {
        expect(shContent).toContain('settings.json');
      });

      it('checks ~/.claude/settings.json for user scope', () => {
        expect(shContent).toContain('HOME');
      });

      it('invokes git for repo detection', () => {
        expect(shContent).toContain('git');
      });

      it('uses remote get-url origin to detect the repo remote', () => {
        expect(shContent).toContain('remote get-url origin');
      });

      it('skips repo detection for user scope', () => {
        expect(shContent).toContain('[ "$SCOPE" != "user" ]');
      });

      it('reads the installed version from the plugin manifest', () => {
        expect(shContent).toContain(
          '_json_get version "${CLAUDE_PLUGIN_ROOT%/}/.claude-plugin/plugin.json"',
        );
      });

      it('falls back to the CLAUDE_PLUGIN_ROOT version segment', () => {
        expect(shContent).toContain('basename "${CLAUDE_PLUGIN_ROOT%/}"');
      });

      it('includes installedVersion in the payload', () => {
        expect(shContent).toContain('installedVersion');
      });

      it('invokes curl for the HTTP call', () => {
        expect(shContent).toContain('curl');
      });

      it('uses 3s max-time for curl', () => {
        expect(shContent).toContain('--max-time 3');
      });

      it('posts to the tracking endpoint', () => {
        expect(shContent).toContain('/tracking/plugin-installs');
      });

      it('sends the X-Packmind-Tracking-Token header', () => {
        expect(shContent).toContain('X-Packmind-Tracking-Token');
      });

      it('always exits 0', () => {
        expect(shContent).toContain('exit 0');
      });

      it('backgrounds the curl call', () => {
        // Backgrounding is done with & in a subshell
        expect(shContent).toMatch(/\([^)]*curl[^)]*\)[^&]*&|\([^)]*&[^)]*\)/s);
      });

      it('includes shasum in the SHA-256 fallback chain', () => {
        expect(shContent).toContain('shasum');
      });

      it('includes sha256sum in the SHA-256 fallback chain', () => {
        expect(shContent).toContain('sha256sum');
      });

      it('includes openssl dgst -sha256 in the SHA-256 fallback chain', () => {
        expect(shContent).toContain('openssl dgst -sha256');
      });

      it('checks the PACKMIND_API_KEY env var for credentials', () => {
        expect(shContent).toContain('PACKMIND_API_KEY:-');
      });

      it('falls back to the PACKMIND_API_KEY_V3 env var for credentials', () => {
        expect(shContent).toContain('PACKMIND_API_KEY_V3:-');
      });

      it('checks PACKMIND_API_KEY_V3 before the credentials file', () => {
        expect(shContent.indexOf('PACKMIND_API_KEY_V3')).toBeLessThan(
          shContent.indexOf('credentials.json'),
        );
      });

      it('reads the project .env via _env_get for the API key', () => {
        expect(shContent).toContain('_env_get PACKMIND_API_KEY "$ENV_FILE"');
      });

      it('resolves the .env from the launch/project directory', () => {
        expect(shContent).toContain('ENV_FILE="${PROJECT_DIR}/.env"');
      });

      it('checks env vars before the project .env', () => {
        expect(shContent.indexOf('PACKMIND_API_KEY_V3:-')).toBeLessThan(
          shContent.indexOf('_env_get PACKMIND_API_KEY'),
        );
      });

      it('checks the project .env before the credentials file', () => {
        expect(shContent.indexOf('_env_get PACKMIND_API_KEY')).toBeLessThan(
          shContent.indexOf('credentials.json'),
        );
      });

      it('parses the .env without sourcing it', () => {
        // Sourcing/dotting a repo-controlled .env would execute arbitrary code.
        expect(shContent).not.toMatch(/\.\s+["']?\$\{?ENV_FILE/);
      });

      it('does not contain jq', () => {
        expect(shContent).not.toContain('jq');
      });

      it('does not contain bash array declarations', () => {
        // bash array syntax: var=( ... ) — POSIX sh does not support this
        expect(shContent).not.toMatch(/\w+=\s*\(/);
      });
    });

    describe('track-install.ps1 content', () => {
      let ps1Content: string;

      beforeEach(() => {
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          trackingInput,
          makeTarget('/'),
        );
        const file = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/track-install.ps1',
        );
        if (!file?.content) throw new Error('expected ps1 content');
        ps1Content = file.content;
      });

      it('injects the plugin slug', () => {
        expect(ps1Content).toContain('security');
      });

      it('does not hardcode the marketplace name as a literal in the script body', () => {
        // The marketplace name must NOT be TS-interpolated into the script; it
        // is loaded from the sidecar via $PACKMIND_MARKETPLACE_NAME at runtime.
        expect(ps1Content).not.toContain(
          `$MarketplaceName = 'acme-marketplace'`,
        );
      });

      it('references the PACKMIND_MARKETPLACE_NAME sidecar variable', () => {
        expect(ps1Content).toContain('PACKMIND_MARKETPLACE_NAME');
      });

      it('reads the sidecar env file', () => {
        expect(ps1Content).toContain('packmind-tracking.env');
      });

      it('uses ConvertFrom-Json to parse JSON files', () => {
        expect(ps1Content).toContain('ConvertFrom-Json');
      });

      it('uses Invoke-RestMethod for the HTTP call', () => {
        expect(ps1Content).toContain('Invoke-RestMethod');
      });

      it('uses Start-Job to background the HTTP call', () => {
        expect(ps1Content).toContain('Start-Job');
      });

      it('checks settings.local.json for local scope', () => {
        expect(ps1Content).toContain('settings.local.json');
      });

      it('skips repo detection for user scope', () => {
        expect(ps1Content).toContain("$Scope -ne 'user'");
      });

      it('reads the installed version from the plugin manifest', () => {
        expect(ps1Content).toContain('.claude-plugin\\plugin.json');
      });

      it('includes installedVersion in the payload', () => {
        expect(ps1Content).toContain('installedVersion');
      });

      it('posts to the tracking endpoint', () => {
        expect(ps1Content).toContain('/tracking/plugin-installs');
      });

      it('sends the X-Packmind-Tracking-Token header', () => {
        expect(ps1Content).toContain('X-Packmind-Tracking-Token');
      });

      it('always exits 0', () => {
        expect(ps1Content).toContain('exit 0');
      });

      it('uses .NET SHA-256 (no external tools)', () => {
        expect(ps1Content).toContain('SHA256');
      });

      it('uses 3s timeout on Invoke-RestMethod', () => {
        expect(ps1Content).toContain('TimeoutSec 3');
      });

      it('falls back to the PACKMIND_API_KEY_V3 env var for credentials', () => {
        expect(ps1Content).toContain('env:PACKMIND_API_KEY_V3');
      });

      it('checks PACKMIND_API_KEY_V3 before the credentials file', () => {
        expect(ps1Content.indexOf('PACKMIND_API_KEY_V3')).toBeLessThan(
          ps1Content.indexOf('credentials.json'),
        );
      });

      it('reads the project .env via Get-DotEnvValue for the API key', () => {
        expect(ps1Content).toContain(
          "Get-DotEnvValue $EnvFile 'PACKMIND_API_KEY'",
        );
      });

      it('resolves the .env from the launch/project directory', () => {
        expect(ps1Content).toContain("$EnvFile = Join-Path $ProjectDir '.env'");
      });

      it('checks the project .env before the credentials file', () => {
        expect(
          ps1Content.indexOf("Get-DotEnvValue $EnvFile 'PACKMIND_API_KEY'"),
        ).toBeLessThan(ps1Content.indexOf('credentials.json'));
      });
    });

    describe('token and name injection', () => {
      it('injects the tracking token into the sidecar', () => {
        const customInput: PluginTrackingHooksInput = {
          ...trackingInput,
          trackingToken: 'my-secret-token',
        };
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          customInput,
          makeTarget('/'),
        );
        const env = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/packmind-tracking.env',
        );
        expect(env?.content).toContain(
          'PACKMIND_TRACKING_TOKEN=my-secret-token',
        );
      });

      it('injects the marketplace name into the sidecar', () => {
        const customInput: PluginTrackingHooksInput = {
          ...trackingInput,
          marketplaceName: 'my-custom-marketplace',
        };
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          customInput,
          makeTarget('/'),
        );
        const env = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/packmind-tracking.env',
        );
        expect(env?.content).toContain(
          'PACKMIND_MARKETPLACE_NAME=my-custom-marketplace',
        );
      });

      it('does not embed the raw marketplace name in the sh script body', () => {
        // sh script reads from $PACKMIND_MARKETPLACE_NAME at runtime to prevent
        // shell injection from free-text marketplace names
        const customInput: PluginTrackingHooksInput = {
          ...trackingInput,
          marketplaceName: 'my-custom-marketplace',
        };
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          customInput,
          makeTarget('/'),
        );
        const sh = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/track-install.sh',
        );
        expect(sh?.content).not.toContain(
          `MARKETPLACE_NAME="my-custom-marketplace"`,
        );
      });

      it('does not embed the raw marketplace name in the ps1 script body', () => {
        // ps1 script reads from $PACKMIND_MARKETPLACE_NAME at runtime
        const customInput: PluginTrackingHooksInput = {
          ...trackingInput,
          marketplaceName: 'my-custom-marketplace',
        };
        const updates = new ClaudePluginDeployer().deployTrackingHooks(
          customInput,
          makeTarget('/'),
        );
        const ps1 = updates.createOrUpdate.find(
          (f) => f.path === 'hooks/track-install.ps1',
        );
        expect(ps1?.content).not.toContain(`'my-custom-marketplace'`);
      });

      describe('when marketplace name contains a newline (injection attempt)', () => {
        let envLines: string[];

        beforeEach(() => {
          const customInput: PluginTrackingHooksInput = {
            ...trackingInput,
            marketplaceName: 'evil\nNEW_KEY=injected',
          };
          const updates = new ClaudePluginDeployer().deployTrackingHooks(
            customInput,
            makeTarget('/'),
          );
          const env = updates.createOrUpdate.find(
            (f) => f.path === 'hooks/packmind-tracking.env',
          );
          envLines = (env?.content ?? '').split('\n');
        });

        it('does not produce a line starting with the injected key', () => {
          const injectedKeyLine = envLines.find((l) =>
            l.startsWith('NEW_KEY='),
          );
          expect(injectedKeyLine).toBeUndefined();
        });

        it('produces exactly 4 KEY=VALUE lines plus a trailing empty line', () => {
          // 4 KEY=VALUE lines + 1 trailing empty line = 5 lines
          expect(envLines).toHaveLength(5);
        });
      });
    });
  });
});
