import { createGitRepoId, createTargetId } from '@packmind/types';

import {
  ROOT_TARGET_LABEL,
  formatRelativeDate,
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

describe('formatRelativeDate', () => {
  /*
   * What a reader sees in the moment they act, since every caller drops this
   * into a sentence about something that just happened: "0 seconds ago" is a
   * number that is zero.
   */
  describe('when it happened seconds ago', () => {
    it('says so in words', () => {
      const justNow = new Date(Date.now() - 5_000).toISOString();

      expect(formatRelativeDate(justNow)).toEqual('just now');
    });
  });

  describe('when a minute has passed', () => {
    it('counts it', () => {
      const aWhileAgo = new Date(Date.now() - 3 * 60_000).toISOString();

      expect(formatRelativeDate(aWhileAgo)).toEqual('3 minutes ago');
    });
  });

  /* A clock skew should read as one rather than as something that just happened. */
  describe('when the date is in the future', () => {
    it('keeps the strict wording', () => {
      const ahead = new Date(Date.now() + 3 * 60_000).toISOString();

      expect(formatRelativeDate(ahead)).toEqual('in 3 minutes');
    });
  });

  describe('when the date cannot be read', () => {
    it('gives it back as it came', () => {
      expect(formatRelativeDate('not a date')).toEqual('not a date');
    });
  });
});
