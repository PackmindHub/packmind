import { createGitRepoId, createTargetId } from '@packmind/types';

import {
  ROOT_TARGET_LABEL,
  multiLandingRepoIds,
  targetLabel,
} from './installDriftEntries';
import type { InstallDriftEntry } from './installDriftEntries';
import type { TargetRef } from '../types';

const entry = (
  repoId: string,
  targetId: string,
  isDefault = false,
): InstallDriftEntry =>
  ({
    repo: { id: createGitRepoId(repoId) },
    target: { id: createTargetId(targetId), name: targetId, isDefault },
  }) as unknown as InstallDriftEntry;

describe('multiLandingRepoIds', () => {
  describe('when a repository holds one landing', () => {
    it('leaves it out', () => {
      const repos = multiLandingRepoIds([entry('repo-a', 't-root', true)]);

      expect(repos.has('repo-a')).toBe(false);
    });
  });

  describe('when a repository holds two landings', () => {
    let repos: Set<string>;

    beforeEach(() => {
      repos = multiLandingRepoIds([
        entry('repo-a', 't-root', true),
        entry('repo-a', 't-web'),
      ]);
    });

    it('names it', () => {
      expect(repos.has('repo-a')).toBe(true);
    });

    it('names it once', () => {
      expect(repos.size).toBe(1);
    });
  });

  describe('when two repositories hold one landing each', () => {
    it('names neither', () => {
      const repos = multiLandingRepoIds([
        entry('repo-a', 't-a', true),
        entry('repo-b', 't-b', true),
      ]);

      expect(repos.size).toBe(0);
    });
  });

  describe('when one repository of several holds two landings', () => {
    it('names only that one', () => {
      const repos = multiLandingRepoIds([
        entry('repo-a', 't-a', true),
        entry('repo-b', 't-root', true),
        entry('repo-b', 't-web'),
      ]);

      expect(Array.from(repos)).toEqual(['repo-b']);
    });
  });

  describe('when the same landing appears twice', () => {
    it('does not take it for two', () => {
      const repos = multiLandingRepoIds([
        entry('repo-a', 't-root', true),
        entry('repo-a', 't-root', true),
      ]);

      expect(repos.size).toBe(0);
    });
  });
});

describe('targetLabel', () => {
  const target = (isDefault: boolean): TargetRef =>
    ({
      id: createTargetId('t-1'),
      name: 'apps/frontend',
      isDefault,
    }) as TargetRef;

  describe('when the target is the repository root', () => {
    it('names it in words rather than by its path', () => {
      expect(targetLabel(target(true))).toBe(ROOT_TARGET_LABEL);
    });
  });

  describe('when the target is a subdirectory', () => {
    it('names it by its own name', () => {
      expect(targetLabel(target(false))).toBe('apps/frontend');
    });
  });
});
