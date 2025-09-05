import { GitCommitRepository } from './GitCommitRepository';
import { GitCommitSchema } from '../schemas/GitCommitSchema';
import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/shared/test';
import { gitCommitFactory } from '../../../test/gitCommitFactory';
import { v4 as uuidv4 } from 'uuid';
import { createGitCommitId } from '../../domain/entities/GitCommit';

describe('GitCommitRepository', () => {
  let datasource: DataSource;
  let gitCommitRepository: GitCommitRepository;

  beforeEach(async () => {
    datasource = await makeTestDatasource([GitCommitSchema]);
    await datasource.initialize();
    await datasource.synchronize();

    gitCommitRepository = new GitCommitRepository(
      datasource.getRepository(GitCommitSchema),
    );
  });

  afterEach(async () => {
    await datasource.destroy();
  });

  it('can add and get a git commit', async () => {
    const gitCommit = gitCommitFactory();
    const savedGitCommit = await gitCommitRepository.add(gitCommit);

    const foundGitCommit = await gitCommitRepository.get(savedGitCommit.id);
    expect(foundGitCommit).toEqual(savedGitCommit);
  });

  describe('when getting a non-existent git commit', () => {
    it('returns null', async () => {
      const nonExistentId = createGitCommitId(uuidv4());
      const foundGitCommit = await gitCommitRepository.get(nonExistentId);
      expect(foundGitCommit).toBeNull();
    });
  });

  describe('when adding a git commit without an ID', () => {
    it('generates a new ID', async () => {
      const gitCommitWithoutId = {
        sha: '1234567890abcdef1234567890abcdef12345678',
        message: 'Test commit message',
        author: 'Test Author <test@example.com>',
        url: 'https://github.com/test-owner/test-repo/commit/1234567890abcdef1234567890abcdef12345678',
      };

      const savedGitCommit = await gitCommitRepository.add(gitCommitWithoutId);
      expect(savedGitCommit).toEqual({
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        ...gitCommitWithoutId,
      });
    });
  });
});
