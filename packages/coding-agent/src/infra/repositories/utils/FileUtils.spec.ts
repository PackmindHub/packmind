import {
  Target,
  createTargetId,
  GitRepo,
  createGitRepoId,
  createGitProviderId,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { getTargetPrefixedPath } from './FileUtils';

describe('SingleFileDeployer', () => {
  let mockGitRepo: GitRepo;
  let rootTarget: Target;
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;
  let nestedTarget: Target;

  beforeEach(() => {
    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      providerId: createGitProviderId('test-provider-id'),
    };

    // Create various test targets
    rootTarget = {
      id: createTargetId(uuidv4()),
      name: 'root',
      path: '/',
      gitRepoId: mockGitRepo.id,
    };
    jetbrainsTarget = {
      id: createTargetId(uuidv4()),
      name: 'jetbrains',
      path: '/jetbrains/',
      gitRepoId: mockGitRepo.id,
    };

    vscodeTarget = {
      id: createTargetId(uuidv4()),
      name: 'vscode',
      path: '/vscode/',
      gitRepoId: mockGitRepo.id,
    };

    nestedTarget = {
      id: createTargetId(uuidv4()),
      name: 'nested',
      path: '/app/src/plugins/',
      gitRepoId: mockGitRepo.id,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTargetPrefixedPath', () => {
    describe('with root target', () => {
      it('returns original file path for root target ("/")', () => {
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(filePath, rootTarget);

        expect(result).toBe('TEST_AGENT.md');
      });

      it('handles complex file paths with root target', () => {
        const filePath = '.github/instructions/test-instructions.md';
        const result = getTargetPrefixedPath(filePath, rootTarget);

        expect(result).toBe('.github/instructions/test-instructions.md');
      });
    });

    describe('with simple target paths', () => {
      it('prefixes file path with jetbrains target, removing leading slash', () => {
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(filePath, jetbrainsTarget);

        expect(result).toBe('jetbrains/TEST_AGENT.md');
      });

      it('prefixes file path with vscode target, removing leading slash', () => {
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(filePath, vscodeTarget);

        expect(result).toBe('vscode/TEST_AGENT.md');
      });

      it('handles file paths with subdirectories', () => {
        const filePath = '.cursor/rules/packmind/recipes-index.mdc';
        const result = getTargetPrefixedPath(filePath, jetbrainsTarget);

        expect(result).toBe(
          'jetbrains/.cursor/rules/packmind/recipes-index.mdc',
        );
      });
    });

    describe('with nested target paths', () => {
      it('prefixes file path with nested target path', () => {
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(filePath, nestedTarget);

        expect(result).toBe('app/src/plugins/TEST_AGENT.md');
      });

      it('handles complex file paths with nested targets', () => {
        const filePath = '.packmind/recipes/test-recipe.md';
        const result = getTargetPrefixedPath(filePath, nestedTarget);

        expect(result).toBe('app/src/plugins/.packmind/recipes/test-recipe.md');
      });
    });

    describe('with edge cases', () => {
      it('handles target path without leading slash', () => {
        const targetWithoutSlash = {
          ...jetbrainsTarget,
          path: 'jetbrains/', // No leading slash
        };
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(filePath, targetWithoutSlash);

        expect(result).toBe('jetbrains/TEST_AGENT.md');
      });

      it('handles target path without trailing slash', () => {
        const targetWithoutTrailingSlash = {
          ...jetbrainsTarget,
          path: '/jetbrains', // No trailing slash
        };
        const filePath = 'TEST_AGENT.md';
        const result = getTargetPrefixedPath(
          filePath,
          targetWithoutTrailingSlash,
        );

        expect(result).toBe('jetbrains/TEST_AGENT.md');
      });

      it('handles empty file path', () => {
        const filePath = '';
        const result = getTargetPrefixedPath(filePath, jetbrainsTarget);

        expect(result).toBe('jetbrains/');
      });
    });
  });
});
