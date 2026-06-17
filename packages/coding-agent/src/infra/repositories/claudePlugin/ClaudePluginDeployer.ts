import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { generateSkillMdContent } from '../utils/SkillMdContentBuilder';
import {
  buildPluginManifest,
  PluginManifestInput,
} from './buildPluginManifest';

export type PluginTrackingHooksInput = {
  apiBaseUrl: string;
  marketplaceName: string;
  pluginSlug: string;
  trackingToken: string;
};

const origin = 'ClaudePluginDeployer';

const EMPTY_UPDATES: FileUpdates = { createOrUpdate: [], delete: [] };

/**
 * Returns the plugin-root prefix for paths emitted by this deployer.
 * - '/' or empty target.path => '' (no prefix)
 * - 'plugins/security' => 'plugins/security/'
 * - 'plugins/security/' => 'plugins/security/'
 */
function pluginRoot(target: Target): string {
  const path = target.path ?? '';
  if (path === '' || path === '/') return '';
  return path.endsWith('/') ? path : `${path}/`;
}

export class ClaudePluginDeployer implements ICodingAgentDeployer {
  /**
   * Skills are rendered under `<plugin-root>/skills/<slug>/`. The folder path is
   * relative to the plugin root and is used by the burn-and-rebuild strategy to
   * clean up stale skill files.
   */
  private static readonly SKILLS_FOLDER_PATH = 'skills/';

  private lastSkippedStandardsCount = 0;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    void this.standardsPort;
    void this.gitPort;
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering recipes for Claude plugin', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    const root = pluginRoot(target);
    return {
      createOrUpdate: recipeVersions.map((rv) => ({
        path: `${root}commands/${rv.slug}.md`,
        content: rv.content,
        artifactType: 'command' as const,
        artifactName: rv.name,
        artifactId: rv.recipeId as string,
      })),
      delete: [],
    };
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering skills for Claude plugin', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    const root = pluginRoot(target);
    const createOrUpdate: FileUpdates['createOrUpdate'] = [];
    for (const skillVersion of skillVersions) {
      const files: Array<{
        path: string;
        content: string;
        isBase64: boolean | undefined;
        skillFileId: string | undefined;
        skillFilePermissions: string | undefined;
      }> = [
        {
          path: 'SKILL.md',
          content: generateSkillMdContent(skillVersion),
          isBase64: undefined,
          skillFileId: undefined,
          skillFilePermissions: undefined,
        },
      ];

      if (skillVersion.files && skillVersion.files.length > 0) {
        for (const file of skillVersion.files) {
          if (file.path.toUpperCase() === 'SKILL.MD') {
            continue;
          }
          files.push({
            path: file.path,
            content: file.content,
            isBase64: file.isBase64,
            skillFileId: file.id as string,
            skillFilePermissions: file.permissions,
          });
        }
      }

      for (const file of files) {
        createOrUpdate.push({
          path: `${root}${ClaudePluginDeployer.SKILLS_FOLDER_PATH}${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill' as const,
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }
    return { createOrUpdate, delete: [] };
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.lastSkippedStandardsCount = standardVersions.length;
    this.logger.info('Standards skipped in Claude plugin rendering', {
      count: this.lastSkippedStandardsCount,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    return { createOrUpdate: [], delete: [] };
  }

  /**
   * Returns the number of standards skipped by the most recent
   * `deployStandards` invocation. Plugins do not support standards (Rule 3);
   * callers surface this count to users as a "skipped" notice.
   */
  getLastSkippedStandardsCount(): number {
    return this.lastSkippedStandardsCount;
  }

  /**
   * Emits the Claude plugin manifest at `<plugin-root>/.claude-plugin/plugin.json`.
   * This file is specific to the plugin rendering mode and lives outside the
   * shared `ICodingAgentDeployer` contract.
   */
  deployPluginManifest(
    input: PluginManifestInput,
    target: Target,
  ): FileUpdates {
    const root = pluginRoot(target);
    return {
      createOrUpdate: [
        {
          path: `${root}.claude-plugin/plugin.json`,
          content: buildPluginManifest(input),
          artifactName: input.name,
          artifactId: input.name,
        },
      ],
      delete: [],
    };
  }

  /**
   * Emits the four tracking-hook files under `<plugin-root>/hooks/`:
   * - `hooks/hooks.json` — registers the SessionStart hook
   * - `hooks/track-install.sh` — POSIX sh implementation
   * - `hooks/track-install.ps1` — PowerShell implementation
   * - `hooks/packmind-tracking.env` — KEY=VALUE sidecar with publish-time config
   *
   * This method is specific to marketplace-mode renders and lives outside the
   * shared `ICodingAgentDeployer` contract (same pattern as `deployPluginManifest`).
   */
  deployTrackingHooks(
    input: PluginTrackingHooksInput,
    target: Target,
  ): FileUpdates {
    const root = pluginRoot(target);

    const hooksJson = buildTrackingHooksJson();
    const trackInstallSh = buildTrackInstallSh(input);
    const trackInstallPs1 = buildTrackInstallPs1(input);
    const trackingEnv = buildTrackingEnv(input);

    return {
      createOrUpdate: [
        {
          path: `${root}hooks/hooks.json`,
          content: hooksJson,
        },
        {
          path: `${root}hooks/track-install.sh`,
          content: trackInstallSh,
        },
        {
          path: `${root}hooks/track-install.ps1`,
          content: trackInstallPs1,
        },
        {
          path: `${root}hooks/packmind-tracking.env`,
          content: trackingEnv,
        },
      ],
      delete: [],
    };
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    void recipeVersions;
    return EMPTY_UPDATES;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    void standardVersions;
    return EMPTY_UPDATES;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    void skillVersions;
    return EMPTY_UPDATES;
  }

  async generateRemovalFileUpdates(): Promise<FileUpdates> {
    return EMPTY_UPDATES;
  }

  async generateAgentCleanupFileUpdates(): Promise<FileUpdates> {
    return EMPTY_UPDATES;
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    void recipeVersions;
    void standardVersions;
    void skillVersions;
    return EMPTY_UPDATES;
  }

  getSkillsFolderPath(): string {
    return ClaudePluginDeployer.SKILLS_FOLDER_PATH;
  }
}

// ─── Tracking-hook file builders ─────────────────────────────────────────────

/**
 * Builds the `hooks/hooks.json` content that registers the SessionStart hook.
 * The launcher chains the sh implementation first (macOS/Linux), with the
 * PowerShell implementation as a fallback (Windows).
 */
function buildTrackingHooksJson(): string {
  const hooks = {
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'command',
              command:
                'sh "${CLAUDE_PLUGIN_ROOT}/hooks/track-install.sh" || powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/hooks/track-install.ps1"',
              timeout: 10,
              suppressOutput: true,
            },
          ],
        },
      ],
    },
  };
  return JSON.stringify(hooks, null, 2) + '\n';
}

/**
 * Builds the `hooks/track-install.sh` POSIX sh script.
 * Pure POSIX — no bashisms, no jq. Uses grep/sed to read JSON files.
 *
 * Security: `pluginSlug` is safe (charset [a-z0-9-] enforced by the `slug`
 * package). `marketplaceName` is free-text and must NOT be interpolated into
 * the executable script body — it is stored only in the KEY=VALUE sidecar and
 * read back via the shell variable `$PACKMIND_MARKETPLACE_NAME` at runtime.
 * This prevents shell injection on installer machines (spec §5, threat model).
 *
 * NOTE: all `\${...}` in the template literal are shell variable references —
 * the backslash escapes them from TypeScript template interpolation so the
 * generated script contains literal `${...}` as required by sh.
 */
function buildTrackInstallSh(input: PluginTrackingHooksInput): string {
  const { pluginSlug } = input;
  // Only ${pluginSlug} is a TypeScript interpolation — it is safe (slug charset).
  // marketplaceName is intentionally NOT interpolated here; the script reads it
  // from the sidecar via $PACKMIND_MARKETPLACE_NAME to prevent shell injection.
  // Every other ${...} is prefixed with \ so it passes through as shell syntax.
  return (
    '#!/bin/sh\n' +
    '# Packmind plugin install tracking — POSIX sh\n' +
    '# Fires on SessionStart; always exits 0 (never delays the session).\n' +
    '# Pure POSIX — no bashisms, no external tools.\n' +
    '\n' +
    'SIDECAR_DIR="$(dirname "$0")"\n' +
    'SIDECAR="${SIDECAR_DIR}/packmind-tracking.env"\n' +
    '\n' +
    '# Load sidecar config (provides PACKMIND_MARKETPLACE_NAME, PACKMIND_PLUGIN_SLUG,\n' +
    '#   PACKMIND_TRACKING_TOKEN, PACKMIND_API_BASE_URL)\n' +
    'if [ ! -f "$SIDECAR" ]; then exit 0; fi\n' +
    '# shellcheck disable=SC1090\n' +
    '. "$SIDECAR"\n' +
    '\n' +
    `PLUGIN_SLUG="${pluginSlug}"\n` +
    '# MARKETPLACE_NAME is read from the sidecar as $PACKMIND_MARKETPLACE_NAME\n' +
    '# to prevent shell injection from free-text marketplace names.\n' +
    'MARKETPLACE_NAME="${PACKMIND_MARKETPLACE_NAME}"\n' +
    '\n' +
    '# The enabledPlugins key Claude Code writes is "<pluginName>@<marketplace>",\n' +
    '# where both names come from the marketplace descriptor on the client — NOT\n' +
    '# the Packmind package slug / marketplace entity name baked into the sidecar\n' +
    '# (which often differ in case or value). Derive the real key components from\n' +
    '# CLAUDE_PLUGIN_ROOT (.../<marketplace>/<plugin>/<version>) so scope detection\n' +
    '# matches; fall back to the baked values when the path is unavailable.\n' +
    'ENABLED_PLUGIN_NAME="${PLUGIN_SLUG}"\n' +
    'ENABLED_MARKETPLACE_NAME="${MARKETPLACE_NAME}"\n' +
    'if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then\n' +
    '  _pr="${CLAUDE_PLUGIN_ROOT%/}"\n' +
    '  _plugin_dir="$(dirname "$_pr")"\n' +
    '  _marketplace_dir="$(dirname "$_plugin_dir")"\n' +
    '  ENABLED_PLUGIN_NAME="$(basename "$_plugin_dir")"\n' +
    '  ENABLED_MARKETPLACE_NAME="$(basename "$_marketplace_dir")"\n' +
    'fi\n' +
    '\n' +
    '# ── 1. Scope detection (local → project → user; first match wins) ────────\n' +
    'PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"\n' +
    'SCOPE=""\n' +
    '\n' +
    '_json_get() {\n' +
    '  # Extract a simple string value from a flat JSON object by key.\n' +
    '  # Usage: _json_get <key> <file>\n' +
    '  grep -o "\\"$1\\"[[:space:]]*:[[:space:]]*\\"[^\\"]*\\"" "$2" 2>/dev/null \\\n' +
    '    | sed \'s/.*"[^"]*"[[:space:]]*:[[:space:]]*"\\([^"]*\\)"/\\1/\' 2>/dev/null \\\n' +
    '    | head -n1\n' +
    '}\n' +
    '\n' +
    '_env_get() {\n' +
    '  # Extract a KEY=value from a flat .env file. Usage: _env_get <key> <file>\n' +
    '  # Tolerates leading whitespace and an `export ` prefix; first match wins;\n' +
    '  # strips one layer of surrounding quotes. Parse-only — the file is NEVER\n' +
    '  # sourced, so a hostile repo .env cannot execute code on SessionStart.\n' +
    '  [ -f "$2" ] || return 0\n' +
    '  _v="$(grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$2" 2>/dev/null | head -n1)"\n' +
    '  _v="${_v#*=}"\n' +
    '  _v="${_v%\\"}"; _v="${_v#\\"}"\n' +
    '  _v="${_v%\\\'}"; _v="${_v#\\\'}"\n' +
    '  printf \'%s\' "$_v"\n' +
    '}\n' +
    '\n' +
    '_enabled_plugins_has_plugin() {\n' +
    '  # Check if enabledPlugins contains the key "<pluginName>@<marketplace>".\n' +
    '  # Uses positional parameter instead of local (pure POSIX).\n' +
    '  # The key components are derived at runtime from CLAUDE_PLUGIN_ROOT (shell\n' +
    '  # variables, not TS interpolations) so no free-text injection is possible.\n' +
    '  [ -f "$1" ] || return 1\n' +
    '  grep -q "\\"${ENABLED_PLUGIN_NAME}@${ENABLED_MARKETPLACE_NAME}\\"" "$1" 2>/dev/null\n' +
    '}\n' +
    '\n' +
    'if _enabled_plugins_has_plugin "${PROJECT_DIR}/.claude/settings.local.json"; then\n' +
    '  SCOPE="local"\n' +
    'elif _enabled_plugins_has_plugin "${PROJECT_DIR}/.claude/settings.json"; then\n' +
    '  SCOPE="project"\n' +
    'elif _enabled_plugins_has_plugin "${HOME}/.claude/settings.json"; then\n' +
    '  SCOPE="user"\n' +
    'else\n' +
    '  # Plugin not found in any known settings — skip POST (scope is required).\n' +
    '  exit 0\n' +
    'fi\n' +
    '\n' +
    '# ── 2. Repo detection (skipped for user scope — not repo-bound) ──────────\n' +
    'REPO_REMOTE_URL=""\n' +
    'if [ "$SCOPE" != "user" ] && command -v git >/dev/null 2>&1; then\n' +
    '  REPO_REMOTE_URL="$(git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || true)"\n' +
    'fi\n' +
    '\n' +
    '# ── 3. Identity resolution ───────────────────────────────────────────────\n' +
    'AUTH_HEADER=""\n' +
    'ANON_ID_HASH=""\n' +
    'ANON_EMAIL_MASKED=""\n' +
    '\n' +
    '# Packmind API key resolution order (same precedence as the CLI, plus a\n' +
    '# project .env between the env vars and the global credentials file):\n' +
    '#   PACKMIND_API_KEY env → PACKMIND_API_KEY_V3 env\n' +
    '#   → <project>/.env (PACKMIND_API_KEY, then PACKMIND_API_KEY_V3)\n' +
    '#   → the ~/.packmind credentials file\n' +
    'API_KEY=""\n' +
    'if [ -n "${PACKMIND_API_KEY:-}" ]; then\n' +
    '  API_KEY="${PACKMIND_API_KEY}"\n' +
    'elif [ -n "${PACKMIND_API_KEY_V3:-}" ]; then\n' +
    '  API_KEY="${PACKMIND_API_KEY_V3}"\n' +
    'else\n' +
    '  ENV_FILE="${PROJECT_DIR}/.env"\n' +
    '  API_KEY="$(_env_get PACKMIND_API_KEY "$ENV_FILE")"\n' +
    '  if [ -z "$API_KEY" ]; then\n' +
    '    API_KEY="$(_env_get PACKMIND_API_KEY_V3 "$ENV_FILE")"\n' +
    '  fi\n' +
    '  if [ -z "$API_KEY" ]; then\n' +
    '    CREDS_FILE="${HOME}/.packmind/credentials.json"\n' +
    '    if [ -f "$CREDS_FILE" ]; then\n' +
    '      API_KEY="$(_json_get apiKey "$CREDS_FILE")"\n' +
    '    fi\n' +
    '  fi\n' +
    'fi\n' +
    'if [ -n "$API_KEY" ]; then\n' +
    '  AUTH_HEADER="Authorization: Bearer ${API_KEY}"\n' +
    'fi\n' +
    '\n' +
    '# Claude account email → mask + hash (email never leaves the machine)\n' +
    'CLAUDE_JSON="${HOME}/.claude.json"\n' +
    'CLAUDE_EMAIL=""\n' +
    'if [ -f "$CLAUDE_JSON" ]; then\n' +
    '  CLAUDE_EMAIL="$(_json_get emailAddress "$CLAUDE_JSON")"\n' +
    'fi\n' +
    '\n' +
    'if [ -n "$CLAUDE_EMAIL" ]; then\n' +
    '  # Mask: first char of each local-part segment, e.g. b**.s***@acme.com\n' +
    '  LOCAL_PART="$(printf \'%s\' "$CLAUDE_EMAIL" | sed \'s/@.*//\')"\n' +
    '  DOMAIN_PART="$(printf \'%s\' "$CLAUDE_EMAIL" | sed \'s/[^@]*@//\')"\n' +
    '  MASKED_LOCAL=""\n' +
    "  # Iterate segments separated by '.'\n" +
    '  _remaining="$LOCAL_PART"\n' +
    '  while [ -n "$_remaining" ]; do\n' +
    '    _seg="${_remaining%%.*}"\n' +
    '    if [ "${_remaining}" = "${_seg}" ]; then\n' +
    '      _remaining=""\n' +
    '    else\n' +
    '      _remaining="${_remaining#*.}"\n' +
    '    fi\n' +
    '    _first="$(printf \'%s\' "$_seg" | cut -c1)"\n' +
    '    _stars="$(printf \'%s\' "$_seg" | cut -c2- | sed \'s/./*/g\')"\n' +
    '    if [ -n "$MASKED_LOCAL" ]; then\n' +
    '      MASKED_LOCAL="${MASKED_LOCAL}.${_first}${_stars}"\n' +
    '    else\n' +
    '      MASKED_LOCAL="${_first}${_stars}"\n' +
    '    fi\n' +
    '  done\n' +
    '  ANON_EMAIL_MASKED="${MASKED_LOCAL}@${DOMAIN_PART}"\n' +
    '\n' +
    '  # SHA-256 hash of the lowercased email\n' +
    "  EMAIL_LOWER=\"$(printf '%s' \"$CLAUDE_EMAIL\" | tr '[:upper:]' '[:lower:]')\"\n" +
    '  if command -v shasum >/dev/null 2>&1; then\n' +
    '    ANON_ID_HASH="$(printf \'%s\' "$EMAIL_LOWER" | shasum -a 256 | awk \'{print $1}\')"\n' +
    '  elif command -v sha256sum >/dev/null 2>&1; then\n' +
    '    ANON_ID_HASH="$(printf \'%s\' "$EMAIL_LOWER" | sha256sum | awk \'{print $1}\')"\n' +
    '  elif command -v openssl >/dev/null 2>&1; then\n' +
    '    ANON_ID_HASH="$(printf \'%s\' "$EMAIL_LOWER" | openssl dgst -sha256 | awk \'{print $NF}\')"\n' +
    '  fi\n' +
    'fi\n' +
    '\n' +
    '# ── 3b. Installed version ────────────────────────────────────────────────\n' +
    '# Read the installed plugin version from its manifest; fall back to the\n' +
    '# version segment of CLAUDE_PLUGIN_ROOT (.../<plugin>/<version>).\n' +
    'INSTALLED_VERSION=""\n' +
    'if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then\n' +
    '  INSTALLED_VERSION="$(_json_get version "${CLAUDE_PLUGIN_ROOT%/}/.claude-plugin/plugin.json")"\n' +
    '  if [ -z "$INSTALLED_VERSION" ]; then\n' +
    '    INSTALLED_VERSION="$(basename "${CLAUDE_PLUGIN_ROOT%/}")"\n' +
    '  fi\n' +
    'fi\n' +
    '\n' +
    '# ── 4. Build JSON payload ─────────────────────────────────────────────────\n' +
    'PAYLOAD="{' +
    '\\"pluginSlug\\":\\"${PLUGIN_SLUG}\\",\\"marketplaceName\\":\\"${MARKETPLACE_NAME}\\",\\"scope\\":\\"${SCOPE}\\"' +
    '"\n' +
    'if [ -n "$INSTALLED_VERSION" ]; then\n' +
    '  PAYLOAD="${PAYLOAD},' +
    '\\"installedVersion\\":\\"${INSTALLED_VERSION}\\"' +
    '"\n' +
    'fi\n' +
    'if [ -n "$REPO_REMOTE_URL" ]; then\n' +
    '  PAYLOAD="${PAYLOAD},' +
    '\\"repoRemoteUrl\\":\\"${REPO_REMOTE_URL}\\"' +
    '"\n' +
    'fi\n' +
    'if [ -n "$ANON_ID_HASH" ]; then\n' +
    '  PAYLOAD="${PAYLOAD},' +
    '\\"anonymousIdHash\\":\\"${ANON_ID_HASH}\\"' +
    '"\n' +
    'fi\n' +
    'if [ -n "$ANON_EMAIL_MASKED" ]; then\n' +
    '  PAYLOAD="${PAYLOAD},' +
    '\\"anonymousEmailMasked\\":\\"${ANON_EMAIL_MASKED}\\"' +
    '"\n' +
    'fi\n' +
    'PAYLOAD="${PAYLOAD}}"\n' +
    '\n' +
    '# ── 5. POST heartbeat (backgrounded, 3s timeout) ─────────────────────────\n' +
    'if command -v curl >/dev/null 2>&1; then\n' +
    '  (\n' +
    '    if [ -n "$AUTH_HEADER" ]; then\n' +
    '      curl --max-time 3 --silent --output /dev/null --show-error \\\n' +
    '        -X POST "${PACKMIND_API_BASE_URL}/tracking/plugin-installs" \\\n' +
    '        -H "Content-Type: application/json" \\\n' +
    '        -H "X-Packmind-Tracking-Token: ${PACKMIND_TRACKING_TOKEN}" \\\n' +
    '        -H "${AUTH_HEADER}" \\\n' +
    '        -d "$PAYLOAD" 2>/dev/null || true\n' +
    '    else\n' +
    '      curl --max-time 3 --silent --output /dev/null --show-error \\\n' +
    '        -X POST "${PACKMIND_API_BASE_URL}/tracking/plugin-installs" \\\n' +
    '        -H "Content-Type: application/json" \\\n' +
    '        -H "X-Packmind-Tracking-Token: ${PACKMIND_TRACKING_TOKEN}" \\\n' +
    '        -d "$PAYLOAD" 2>/dev/null || true\n' +
    '    fi\n' +
    '  ) &\n' +
    'fi\n' +
    '\n' +
    'exit 0\n'
  );
}

/**
 * Builds the `hooks/track-install.ps1` PowerShell script.
 * Uses ConvertFrom-Json and Invoke-RestMethod — zero external tools required.
 *
 * Security: `pluginSlug` is safe (charset [a-z0-9-]). `marketplaceName` is
 * free-text and must NOT be interpolated into the script body. It is stored
 * only in the KEY=VALUE sidecar and read back via the `$PACKMIND_MARKETPLACE_NAME`
 * variable loaded by the sidecar parser at runtime.
 *
 * NOTE: PowerShell variable names start with `$`, which is also the TypeScript
 * template literal interpolation sigil. We use string concatenation here to
 * avoid escaping every single PowerShell variable reference.
 */
function buildTrackInstallPs1(input: PluginTrackingHooksInput): string {
  const { pluginSlug } = input;
  // Only ${pluginSlug} is a TypeScript interpolation — safe (slug charset).
  // marketplaceName is intentionally NOT interpolated; the script reads it from
  // the sidecar variable $PACKMIND_MARKETPLACE_NAME to prevent injection.
  const S = '$'; // alias to avoid template-literal collisions with PowerShell $
  return (
    '# Packmind plugin install tracking — PowerShell\n' +
    '# Fires on SessionStart; always exits 0 (never delays the session).\n' +
    '\n' +
    `${S}ErrorActionPreference = 'SilentlyContinue'\n` +
    '\n' +
    `${S}ScriptDir = Split-Path -Parent ${S}MyInvocation.MyCommand.Path\n` +
    `${S}Sidecar = Join-Path ${S}ScriptDir 'packmind-tracking.env'\n` +
    '\n' +
    `if (-not (Test-Path ${S}Sidecar)) { exit 0 }\n` +
    '\n' +
    '# Load sidecar KEY=VALUE pairs\n' +
    `Get-Content ${S}Sidecar | ForEach-Object {\n` +
    `    if (${S}_ -match '^([A-Z_]+)=(.*)${S}') {\n` +
    `        Set-Variable -Name ${S}Matches[1] -Value ${S}Matches[2] -Scope Script\n` +
    '    }\n' +
    '}\n' +
    '\n' +
    `${S}PluginSlug = '${pluginSlug}'\n` +
    `# ${S}MarketplaceName is read from the sidecar as ${S}PACKMIND_MARKETPLACE_NAME\n` +
    `# to prevent shell injection from free-text marketplace names.\n` +
    `${S}MarketplaceName = ${S}PACKMIND_MARKETPLACE_NAME\n` +
    '\n' +
    '# ── 1. Scope detection (local → project → user; first match wins) ────────\n' +
    `${S}ProjectDir = if (${S}env:CLAUDE_PROJECT_DIR) { ${S}env:CLAUDE_PROJECT_DIR } else { Get-Location }\n` +
    `${S}Scope = ${S}null\n` +
    '# The enabledPlugins key is "<pluginName>@<marketplace>", where both names\n' +
    '# come from the client marketplace descriptor — not the Packmind slug /\n' +
    '# marketplace entity name in the sidecar. Derive them from CLAUDE_PLUGIN_ROOT\n' +
    '# (.../<marketplace>/<plugin>/<version>); fall back to the baked values.\n' +
    `${S}EnabledPluginName = ${S}PluginSlug\n` +
    `${S}EnabledMarketplaceName = ${S}MarketplaceName\n` +
    `if (${S}env:CLAUDE_PLUGIN_ROOT) {\n` +
    `    ${S}PluginDir = Split-Path -Parent ${S}env:CLAUDE_PLUGIN_ROOT\n` +
    `    ${S}MarketplaceDir = Split-Path -Parent ${S}PluginDir\n` +
    `    ${S}EnabledPluginName = Split-Path -Leaf ${S}PluginDir\n` +
    `    ${S}EnabledMarketplaceName = Split-Path -Leaf ${S}MarketplaceDir\n` +
    '}\n' +
    `${S}PluginKey = "${S}EnabledPluginName@${S}EnabledMarketplaceName"\n` +
    '\n' +
    '# Installed version — read from the plugin manifest, fall back to the version\n' +
    '# segment of CLAUDE_PLUGIN_ROOT (.../<plugin>/<version>).\n' +
    `${S}InstalledVersion = ${S}null\n` +
    `if (${S}env:CLAUDE_PLUGIN_ROOT) {\n` +
    `    ${S}ManifestPath = Join-Path ${S}env:CLAUDE_PLUGIN_ROOT '.claude-plugin\\plugin.json'\n` +
    `    if (Test-Path ${S}ManifestPath) {\n` +
    `        ${S}Manifest = Get-Content ${S}ManifestPath -Raw | ConvertFrom-Json\n` +
    `        if (${S}Manifest.version) { ${S}InstalledVersion = ${S}Manifest.version }\n` +
    '    }\n' +
    `    if (-not ${S}InstalledVersion) { ${S}InstalledVersion = Split-Path -Leaf ${S}env:CLAUDE_PLUGIN_ROOT }\n` +
    '}\n' +
    '\n' +
    'function Find-PluginScope {\n' +
    `    param([string]${S}FilePath)\n` +
    `    if (-not (Test-Path ${S}FilePath)) { return ${S}false }\n` +
    `    ${S}Content = Get-Content ${S}FilePath -Raw\n` +
    `    ${S}Json = ${S}Content | ConvertFrom-Json\n` +
    `    if (${S}Json.enabledPlugins -and ${S}Json.enabledPlugins.PSObject.Properties.Name -contains ${S}PluginKey) {\n` +
    `        return ${S}true\n` +
    '    }\n' +
    `    return ${S}false\n` +
    '}\n' +
    '\n' +
    '# Extract a KEY=value from a flat .env file (parse-only; never sourced).\n' +
    '# Tolerates leading whitespace / `export `; strips one layer of quotes.\n' +
    'function Get-DotEnvValue {\n' +
    `    param([string]${S}FilePath, [string]${S}Key)\n` +
    `    if (-not (Test-Path ${S}FilePath)) { return ${S}null }\n` +
    `    foreach (${S}Line in Get-Content ${S}FilePath) {\n` +
    `        if (${S}Line -match "^\\s*(export\\s+)?${S}Key=(.*)${S}") {\n` +
    `            ${S}Val = ${S}Matches[2].Trim()\n` +
    `            if (${S}Val.StartsWith('"') -and ${S}Val.EndsWith('"')) { ${S}Val = ${S}Val.Trim('"') }\n` +
    `            elseif (${S}Val.StartsWith("'") -and ${S}Val.EndsWith("'")) { ${S}Val = ${S}Val.Trim("'") }\n` +
    `            if (${S}Val) { return ${S}Val }\n` +
    '        }\n' +
    '    }\n' +
    `    return ${S}null\n` +
    '}\n' +
    '\n' +
    `if (Find-PluginScope (Join-Path ${S}ProjectDir '.claude\\settings.local.json')) {\n` +
    `    ${S}Scope = 'local'\n` +
    `} elseif (Find-PluginScope (Join-Path ${S}ProjectDir '.claude\\settings.json')) {\n` +
    `    ${S}Scope = 'project'\n` +
    `} elseif (Find-PluginScope (Join-Path ${S}HOME '.claude\\settings.json')) {\n` +
    `    ${S}Scope = 'user'\n` +
    '} else {\n' +
    '    exit 0\n' +
    '}\n' +
    '\n' +
    '# ── 2. Repo detection (skipped for user scope — not repo-bound) ──────────\n' +
    `${S}RepoRemoteUrl = ${S}null\n` +
    `if (${S}Scope -ne 'user') {\n` +
    `    ${S}GitOutput = & git -C ${S}ProjectDir remote get-url origin 2>${S}null\n` +
    `    if (${S}LASTEXITCODE -eq 0 -and ${S}GitOutput) { ${S}RepoRemoteUrl = ${S}GitOutput.Trim() }\n` +
    '}\n' +
    '\n' +
    '# ── 3. Identity resolution ───────────────────────────────────────────────\n' +
    `${S}AuthHeader = ${S}null\n` +
    `${S}AnonIdHash = ${S}null\n` +
    `${S}AnonEmailMasked = ${S}null\n` +
    '\n' +
    '# Packmind API key resolution order (same precedence as the CLI, plus a\n' +
    '# project .env between the env vars and the global credentials file):\n' +
    '#   PACKMIND_API_KEY env -> PACKMIND_API_KEY_V3 env\n' +
    '#   -> <project>/.env (PACKMIND_API_KEY, then PACKMIND_API_KEY_V3)\n' +
    '#   -> the ~/.packmind credentials file\n' +
    `${S}ApiKey = ${S}null\n` +
    `if (${S}env:PACKMIND_API_KEY) {\n` +
    `    ${S}ApiKey = ${S}env:PACKMIND_API_KEY\n` +
    `} elseif (${S}env:PACKMIND_API_KEY_V3) {\n` +
    `    ${S}ApiKey = ${S}env:PACKMIND_API_KEY_V3\n` +
    '} else {\n' +
    `    ${S}EnvFile = Join-Path ${S}ProjectDir '.env'\n` +
    `    ${S}ApiKey = Get-DotEnvValue ${S}EnvFile 'PACKMIND_API_KEY'\n` +
    `    if (-not ${S}ApiKey) { ${S}ApiKey = Get-DotEnvValue ${S}EnvFile 'PACKMIND_API_KEY_V3' }\n` +
    `    if (-not ${S}ApiKey) {\n` +
    `        ${S}CredsFile = Join-Path ${S}HOME '.packmind\\credentials.json'\n` +
    `        if (Test-Path ${S}CredsFile) {\n` +
    `            ${S}Creds = Get-Content ${S}CredsFile -Raw | ConvertFrom-Json\n` +
    `            if (${S}Creds.apiKey) { ${S}ApiKey = ${S}Creds.apiKey }\n` +
    '        }\n' +
    '    }\n' +
    '}\n' +
    `if (${S}ApiKey) { ${S}AuthHeader = "Bearer ${S}ApiKey" }\n` +
    '\n' +
    '# Claude account email → mask + hash\n' +
    `${S}ClaudeJson = Join-Path ${S}HOME '.claude.json'\n` +
    `if (Test-Path ${S}ClaudeJson) {\n` +
    `    ${S}ClaudeData = Get-Content ${S}ClaudeJson -Raw | ConvertFrom-Json\n` +
    `    ${S}Email = ${S}ClaudeData.oauthAccount.emailAddress\n` +
    `    if (${S}Email) {\n` +
    '        # Mask: first char of each local-part segment\n' +
    `        ${S}Parts = ${S}Email -split '@', 2\n` +
    `        ${S}LocalPart = ${S}Parts[0]\n` +
    `        ${S}Domain = ${S}Parts[1]\n` +
    `        ${S}MaskedSegments = (${S}LocalPart -split '\\.') | ForEach-Object {\n` +
    `            if (${S}_.Length -gt 0) { ${S}_[0] + ('*' * (${S}_.Length - 1)) } else { '' }\n` +
    '        }\n' +
    `        ${S}AnonEmailMasked = (${S}MaskedSegments -join '.') + '@' + ${S}Domain\n` +
    '\n' +
    '        # SHA-256 hash of lowercased email\n' +
    `        ${S}EmailLower = ${S}Email.ToLower()\n` +
    `        ${S}Bytes = [System.Text.Encoding]::UTF8.GetBytes(${S}EmailLower)\n` +
    `        ${S}Hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash(${S}Bytes)\n` +
    `        ${S}AnonIdHash = (${S}Hash | ForEach-Object { ${S}_.ToString('x2') }) -join ''\n` +
    '    }\n' +
    '}\n' +
    '\n' +
    '# ── 4. Build payload ─────────────────────────────────────────────────────\n' +
    `${S}Payload = @{\n` +
    `    pluginSlug    = ${S}PluginSlug\n` +
    `    marketplaceName = ${S}MarketplaceName\n` +
    `    scope         = ${S}Scope\n` +
    '}\n' +
    `if (${S}InstalledVersion) { ${S}Payload['installedVersion']     = ${S}InstalledVersion }\n` +
    `if (${S}RepoRemoteUrl)   { ${S}Payload['repoRemoteUrl']        = ${S}RepoRemoteUrl }\n` +
    `if (${S}AnonIdHash)      { ${S}Payload['anonymousIdHash']      = ${S}AnonIdHash }\n` +
    `if (${S}AnonEmailMasked) { ${S}Payload['anonymousEmailMasked'] = ${S}AnonEmailMasked }\n` +
    '\n' +
    `${S}Headers = @{\n` +
    "    'Content-Type'               = 'application/json'\n" +
    `    'X-Packmind-Tracking-Token'  = ${S}PACKMIND_TRACKING_TOKEN\n` +
    '}\n' +
    `if (${S}AuthHeader) { ${S}Headers['Authorization'] = ${S}AuthHeader }\n` +
    '\n' +
    `${S}Body = ${S}Payload | ConvertTo-Json -Compress\n` +
    '\n' +
    '# ── 5. POST heartbeat (backgrounded via Start-Job) ───────────────────────\n' +
    `${S}Url = "${S}PACKMIND_API_BASE_URL/tracking/plugin-installs"\n` +
    `Start-Job -ScriptBlock {\n` +
    `    param(${S}Url, ${S}Headers, ${S}Body)\n` +
    `    Invoke-RestMethod -Method Post -Uri ${S}Url -Headers ${S}Headers -Body ${S}Body -TimeoutSec 3 | Out-Null\n` +
    `} -ArgumentList ${S}Url, ${S}Headers, ${S}Body | Out-Null\n` +
    '\n' +
    'exit 0\n'
  );
}

/**
 * Sanitizes a KEY=VALUE sidecar value by stripping characters that would
 * break the flat `source`-able format:
 * - Newlines (\r, \n) — would prematurely terminate the KEY=VALUE line and
 *   allow injecting arbitrary new KEY=VALUE entries.
 * - Null bytes — defensive; should never appear in legitimate names.
 *
 * Note: the value is not shell-quoted in the sidecar (the sh script `source`s
 * it without quoting), so newlines are the primary injection vector.
 */
function sanitizeSidecarValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\r\n\x00]/g, '');
}

/**
 * Builds the `hooks/packmind-tracking.env` KEY=VALUE sidecar.
 * Flat format so the sh script can `source` it without needing `jq`.
 *
 * Security: all free-text values (marketplaceName, apiBaseUrl) are sanitized
 * to strip newlines before writing — a newline in a KEY=VALUE file would allow
 * injecting arbitrary variables into the shell environment when the sidecar is
 * sourced. pluginSlug and trackingToken are generated values with controlled
 * charsets and do not require sanitization, but are sanitized defensively.
 */
function buildTrackingEnv(input: PluginTrackingHooksInput): string {
  return [
    `PACKMIND_API_BASE_URL=${sanitizeSidecarValue(input.apiBaseUrl)}`,
    `PACKMIND_MARKETPLACE_NAME=${sanitizeSidecarValue(input.marketplaceName)}`,
    `PACKMIND_PLUGIN_SLUG=${sanitizeSidecarValue(input.pluginSlug)}`,
    `PACKMIND_TRACKING_TOKEN=${sanitizeSidecarValue(input.trackingToken)}`,
    '',
  ].join('\n');
}
