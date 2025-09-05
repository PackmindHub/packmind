import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitService } from './GitService';

const execAsync = promisify(exec);

describe('GitService', () => {
  let tempDir: string;
  let service: GitService;

  beforeEach(async () => {
    service = new GitService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-test-'));

    // Initialize a git repository
    await execAsync('git init', { cwd: tempDir });
    await execAsync('git config user.email "test@example.com"', {
      cwd: tempDir,
    });
    await execAsync('git config user.name "Test User"', { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when only one remote is available', () => {
    it('returns single remote', async () => {
      await execAsync(
        'git remote add origin git@github.com:PackmindHub/test-repo.git',
        { cwd: tempDir },
      );

      const result = await service.getGitRemoteUrl(tempDir);

      expect(result).toEqual({
        gitRemoteUrl: 'github.com/PackmindHub/test-repo',
      });
    });
  });

  describe('when multiple remotes are available', () => {
    it('returns origin remote ', async () => {
      await execAsync(
        'git remote add origin git@github.com:PackmindHub/main-repo.git',
        { cwd: tempDir },
      );
      await execAsync(
        'git remote add upstream git@github.com:OtherUser/upstream-repo.git',
        { cwd: tempDir },
      );

      const result = await service.getGitRemoteUrl(tempDir);

      expect(result).toEqual({
        gitRemoteUrl: 'github.com/PackmindHub/main-repo',
      });
    });
  });

  describe('when origin parameter is provided', () => {
    it('returns specified remote', async () => {
      await execAsync(
        'git remote add origin git@github.com:PackmindHub/main-repo.git',
        { cwd: tempDir },
      );
      await execAsync(
        'git remote add upstream git@github.com:OtherUser/upstream-repo.git',
        { cwd: tempDir },
      );

      const result = await service.getGitRemoteUrl(tempDir, 'upstream');

      expect(result).toEqual({
        gitRemoteUrl: 'github.com/OtherUser/upstream-repo',
      });
    });

    it('throws error if there is no origin remote', async () => {
      await execAsync(
        'git remote add upstream git@github.com:OtherUser/upstream-repo.git',
        { cwd: tempDir },
      );
      await execAsync(
        'git remote add fork git@github.com:MyUser/fork-repo.git',
        {
          cwd: tempDir,
        },
      );

      await expect(service.getGitRemoteUrl(tempDir)).rejects.toThrow(
        "Multiple remotes found but no 'origin' remote. Please specify the remote name.",
      );
    });
  });

  it('normalizes SSH URLs correctly', async () => {
    await execAsync(
      'git remote add origin git@gitlab.com:company/project.git',
      { cwd: tempDir },
    );

    const result = await service.getGitRemoteUrl(tempDir);

    expect(result).toEqual({
      gitRemoteUrl: 'gitlab.com/company/project',
    });
  });

  it('normalizes HTTPS URLs correctly', async () => {
    await execAsync(
      'git remote add origin https://github.com/PackmindHub/test-repo.git',
      { cwd: tempDir },
    );

    const result = await service.getGitRemoteUrl(tempDir);

    expect(result).toEqual({
      gitRemoteUrl: 'github.com/PackmindHub/test-repo',
    });
  });

  describe('when no remotes are found', () => {
    it('throws error', async () => {
      await expect(service.getGitRemoteUrl(tempDir)).rejects.toThrow(
        'No Git remotes found in the repository',
      );
    });
  });

  describe('when specified remote is not found', () => {
    it('throws error', async () => {
      await execAsync(
        'git remote add origin git@github.com:PackmindHub/test-repo.git',
        { cwd: tempDir },
      );

      await expect(
        service.getGitRemoteUrl(tempDir, 'nonexistent'),
      ).rejects.toThrow("Remote 'nonexistent' not found in repository");
    });
  });

  describe('when path is not a git repository', () => {
    it('throws error', async () => {
      const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));

      try {
        await expect(service.getGitRemoteUrl(nonGitDir)).rejects.toThrow(
          'Failed to get Git remote URL',
        );
      } finally {
        await fs.rm(nonGitDir, { recursive: true, force: true });
      }
    });
  });
});
