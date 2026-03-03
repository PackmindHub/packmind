import { execSync } from 'child_process';

type SetupGitRepoOptions = {
  gitRemoteUrl: string;
  gitUserName: string;
  gitUserEmail: string;
};

const defaultSetupGitRepoOptions: SetupGitRepoOptions = {
  gitRemoteUrl: 'git@github.com:PackmindHub/sample-repo.git',
  gitUserName: 'Test User',
  gitUserEmail: 'test@packmind.com',
};

export async function setupGitRepo(
  testDir: string,
  opts?: Partial<SetupGitRepoOptions>,
) {
  const fullOptions = { ...defaultSetupGitRepoOptions, ...opts };

  try {
    // Initialize git repository with main branch
    execSync('git init -b main .', { cwd: testDir });
    execSync(`git remote add origin ${fullOptions.gitRemoteUrl}`, {
      cwd: testDir,
    });
    // Configure git user for commits
    execSync(`git config user.email "${fullOptions.gitUserEmail}"`, {
      cwd: testDir,
    });
    execSync(`git config user.name "${fullOptions.gitUserName}"`, {
      cwd: testDir,
    });
    // Create initial commit to establish HEAD
    execSync('git commit --allow-empty -m "Initial commit"', {
      cwd: testDir,
    });
  } catch (error) {
    throw new Error(
      `Failed to setup git repository in ${testDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
