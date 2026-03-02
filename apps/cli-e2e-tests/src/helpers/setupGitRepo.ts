export async function setupGitRepo(testDir: string) {
  // Initialize git repository with main branch
  const { execSync } = await import('child_process');
  execSync('git init -b main .', { cwd: testDir });
  execSync('git remote add origin git@github.com:PackmindHub/sample-repo.git', {
    cwd: testDir,
  });
  // Configure git user for commits
  execSync('git config user.email "test@packmind.com"', { cwd: testDir });
  execSync('git config user.name "Test User"', { cwd: testDir });
  // Create initial commit to establish HEAD
  execSync('git commit --allow-empty -m "Initial commit"', {
    cwd: testDir,
  });
}
