import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  resolveSkillDirectoryRoot,
  resolveSkillInputPaths,
} from './resolveSkillInputPaths';

function createPermissionDeniedError(
  directoryPath: string,
): NodeJS.ErrnoException {
  const error = new Error(
    `EACCES: permission denied, scandir '${directoryPath}'`,
  ) as NodeJS.ErrnoException;
  error.code = 'EACCES';
  error.path = directoryPath;
  error.syscall = 'scandir';
  return error;
}

describe('resolveSkillInputPaths', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-inputs-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when the input path is already a skill directory', () => {
    it('returns that directory', async () => {
      const skillDirectoryPath = path.join(tempDir, 'alpha');
      await fs.mkdir(skillDirectoryPath, { recursive: true });
      await fs.writeFile(path.join(skillDirectoryPath, 'SKILL.md'), 'content');

      const resolvedPaths = await resolveSkillInputPaths(['alpha'], tempDir);

      expect(resolvedPaths).toEqual([skillDirectoryPath]);
    });
  });

  describe('when the input path is a parent directory containing multiple skills', () => {
    it('returns each discovered skill directory', async () => {
      const parentDirectoryPath = path.join(tempDir, 'skills');
      const alphaSkillDirectoryPath = path.join(parentDirectoryPath, 'alpha');
      const betaSkillDirectoryPath = path.join(
        parentDirectoryPath,
        'nested',
        'beta',
      );

      await fs.mkdir(alphaSkillDirectoryPath, { recursive: true });
      await fs.mkdir(betaSkillDirectoryPath, { recursive: true });
      await fs.writeFile(
        path.join(alphaSkillDirectoryPath, 'SKILL.md'),
        'alpha content',
      );
      await fs.writeFile(
        path.join(betaSkillDirectoryPath, 'SKILL.md'),
        'beta content',
      );

      const resolvedPaths = await resolveSkillInputPaths(['skills'], tempDir);

      expect(resolvedPaths).toEqual([
        alphaSkillDirectoryPath,
        betaSkillDirectoryPath,
      ]);
    });
  });

  describe('when the input path is a file inside a skill directory', () => {
    it('returns the parent skill directory', async () => {
      const skillDirectoryPath = path.join(tempDir, 'alpha');
      await fs.mkdir(skillDirectoryPath, { recursive: true });
      await fs.writeFile(path.join(skillDirectoryPath, 'SKILL.md'), 'content');
      await fs.writeFile(path.join(skillDirectoryPath, 'README.md'), 'readme');

      const resolvedPaths = await resolveSkillInputPaths(
        [path.join('alpha', 'README.md')],
        tempDir,
      );

      expect(resolvedPaths).toEqual([skillDirectoryPath]);
    });
  });

  describe('when the same skill is reachable through multiple inputs', () => {
    it('deduplicates the resolved skill directories', async () => {
      const skillDirectoryPath = path.join(tempDir, 'alpha');
      await fs.mkdir(skillDirectoryPath, { recursive: true });
      await fs.writeFile(path.join(skillDirectoryPath, 'SKILL.md'), 'content');

      const resolvedPaths = await resolveSkillInputPaths(
        ['alpha', path.join('alpha', 'SKILL.md')],
        tempDir,
      );

      expect(resolvedPaths).toEqual([skillDirectoryPath]);
    });
  });

  describe('when the parent directory contains ignored directories', () => {
    it('skips ignored dependency and cache directories when scanning for skills', async () => {
      const parentDirectoryPath = path.join(tempDir, 'skills');
      const skillDirectoryPath = path.join(parentDirectoryPath, 'alpha');
      const nodeModulesSkillPath = path.join(
        parentDirectoryPath,
        'node_modules',
        'fake-skill',
      );
      const gitSkillPath = path.join(parentDirectoryPath, '.git', 'fake-skill');
      const yarnCacheSkillPath = path.join(
        parentDirectoryPath,
        '.yarn',
        'cache',
        'fake-skill',
      );

      await fs.mkdir(skillDirectoryPath, { recursive: true });
      await fs.mkdir(nodeModulesSkillPath, { recursive: true });
      await fs.mkdir(gitSkillPath, { recursive: true });
      await fs.mkdir(yarnCacheSkillPath, { recursive: true });
      await fs.writeFile(path.join(skillDirectoryPath, 'SKILL.md'), 'content');
      await fs.writeFile(
        path.join(nodeModulesSkillPath, 'SKILL.md'),
        'ignored',
      );
      await fs.writeFile(path.join(gitSkillPath, 'SKILL.md'), 'ignored');
      await fs.writeFile(path.join(yarnCacheSkillPath, 'SKILL.md'), 'ignored');

      const resolvedPaths = await resolveSkillInputPaths(['skills'], tempDir);

      expect(resolvedPaths).toEqual([skillDirectoryPath]);
    });
  });

  describe('when scanning a nested directory fails with a permission error', () => {
    it('surfaces the filesystem error', async () => {
      const parentDirectoryPath = path.join(tempDir, 'skills');
      const accessibleSkillDirectoryPath = path.join(parentDirectoryPath, 'alpha');
      const blockedDirectoryPath = path.join(parentDirectoryPath, 'blocked');
      const originalReaddir = fs.readdir.bind(fs);

      await fs.mkdir(accessibleSkillDirectoryPath, { recursive: true });
      await fs.mkdir(blockedDirectoryPath, { recursive: true });
      await fs.writeFile(
        path.join(accessibleSkillDirectoryPath, 'SKILL.md'),
        'alpha content',
      );

      jest.spyOn(fs, 'readdir').mockImplementation(
        (async (...args: Parameters<typeof fs.readdir>) => {
          const [targetPath] = args;

          if (path.resolve(String(targetPath)) === blockedDirectoryPath) {
            throw createPermissionDeniedError(blockedDirectoryPath);
          }

          return originalReaddir(...args);
        }) as typeof fs.readdir,
      );

      await expect(resolveSkillInputPaths(['skills'], tempDir)).rejects.toMatchObject({
        code: 'EACCES',
      });
    });
  });

  describe('when the input root cannot be read', () => {
    it('surfaces the stat permission error', async () => {
      const blockedDirectoryPath = path.join(tempDir, 'skills');
      const originalStat = fs.stat.bind(fs);

      await fs.mkdir(blockedDirectoryPath, { recursive: true });

      jest.spyOn(fs, 'stat').mockImplementation(
        (async (...args: Parameters<typeof fs.stat>) => {
          const [targetPath] = args;

          if (path.resolve(String(targetPath)) === blockedDirectoryPath) {
            throw createPermissionDeniedError(blockedDirectoryPath);
          }

          return originalStat(...args);
        }) as typeof fs.stat,
      );

      await expect(resolveSkillInputPaths(['skills'], tempDir)).rejects.toMatchObject({
        code: 'EACCES',
      });
    });
  });
});

describe('resolveSkillDirectoryRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-root-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when the input path points to a file inside a skill directory', () => {
    it('walks up to the enclosing skill directory', async () => {
      const skillDirectoryPath = path.join(tempDir, 'alpha');
      const nestedFilePath = path.join(skillDirectoryPath, 'docs', 'guide.md');

      await fs.mkdir(path.dirname(nestedFilePath), { recursive: true });
      await fs.writeFile(path.join(skillDirectoryPath, 'SKILL.md'), 'content');
      await fs.writeFile(nestedFilePath, 'guide');

      const resolvedDirectoryPath = await resolveSkillDirectoryRoot(nestedFilePath);

      expect(resolvedDirectoryPath).toBe(skillDirectoryPath);
    });
  });
});
