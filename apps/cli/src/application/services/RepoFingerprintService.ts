import * as crypto from 'crypto';
import * as path from 'path';
import { execSync } from 'child_process';

export class RepoFingerprintService {
  async generateFingerprint(projectPath: string): Promise<string> {
    const components: string[] = [];

    // Use absolute path as base
    const absolutePath = path.resolve(projectPath);
    components.push(absolutePath);

    // Try to get git remote URL if available
    const gitRemote = this.getGitRemoteUrl(projectPath);
    if (gitRemote) {
      components.push(gitRemote);
    }

    const content = components.join(':');
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16);
  }

  private getGitRemoteUrl(projectPath: string): string | null {
    try {
      const result = execSync('git remote get-url origin', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return result.trim();
    } catch {
      return null;
    }
  }
}
