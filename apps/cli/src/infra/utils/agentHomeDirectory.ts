import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodingAgent } from '@packmind/types';

/**
 * Maps a coding agent to the directory name (relative to the user's home
 * directory) where that agent reads its global configuration from.
 *
 * When the CLI is run inside one of these directories, it switches to a
 * single-agent home-install mode: artifacts are rendered without the agent's
 * own directory prefix (e.g. `.claude/skills/...` becomes `skills/...`), no
 * agent prompt is shown, and distribution is not notified.
 */
const AGENT_HOME_DIR_NAMES: Partial<Record<CodingAgent, string>> = {
  claude: '.claude',
};

function safeRealpath(target: string): string {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

export function isAgentHomeDirectory(cwd: string): CodingAgent | null {
  const home = os.homedir();
  if (!home) {
    return null;
  }
  const resolvedCwd = safeRealpath(cwd);
  const resolvedHome = safeRealpath(home);
  for (const [agent, dirName] of Object.entries(AGENT_HOME_DIR_NAMES)) {
    if (!dirName) continue;
    if (resolvedCwd === path.join(resolvedHome, dirName)) {
      return agent as CodingAgent;
    }
  }
  return null;
}

export function getAgentHomeDirPrefix(agent: CodingAgent): string | null {
  const dirName = AGENT_HOME_DIR_NAMES[agent];
  return dirName ? `${dirName}/` : null;
}
