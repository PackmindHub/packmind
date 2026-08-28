import { ExternalRepository } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  collectAccessibleRepos,
  MAX_PROVIDER_PAGES_PER_REQUEST,
} from './collectAccessibleRepos';

const repo = (name: string): ExternalRepository => ({
  name,
  owner: 'test-owner',
  private: false,
  defaultBranch: 'main',
  stars: 0,
});

describe('collectAccessibleRepos', () => {
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    logger = stubLogger();
  });

  describe('when the first page already holds enough repositories', () => {
    let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;
    let fetchPage: jest.Mock;

    beforeEach(async () => {
      fetchPage = jest.fn().mockResolvedValue({
        repositories: [repo('a'), repo('b')],
        totalPages: 5,
      });

      result = await collectAccessibleRepos({
        startPage: 1,
        fetchPage,
        logger,
        targetCount: 2,
      });
    });

    it('fetches a single provider page', () => {
      expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('reports the requested page as the last loaded one', () => {
      expect(result.lastLoadedPage).toBe(1);
    });

    it('is not partial', () => {
      expect(result.partial).toBe(false);
    });
  });

  describe('when pages are under-filled', () => {
    describe('and more pages remain than the target needs', () => {
      let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;
      let fetchPage: jest.Mock;

      beforeEach(async () => {
        fetchPage = jest
          .fn()
          .mockResolvedValue({ repositories: [repo('a')], totalPages: 10 });

        result = await collectAccessibleRepos({
          startPage: 1,
          fetchPage,
          logger,
          targetCount: 3,
        });
      });

      it('keeps pulling pages until the target is met', () => {
        expect(fetchPage).toHaveBeenCalledTimes(3);
      });

      it('gathers exactly the target count', () => {
        expect(result.repositories).toHaveLength(3);
      });
    });

    describe('when the provider runs out of pages first', () => {
      let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;
      let fetchPage: jest.Mock;

      beforeEach(async () => {
        fetchPage = jest
          .fn()
          .mockResolvedValue({ repositories: [repo('a')], totalPages: 2 });

        result = await collectAccessibleRepos({
          startPage: 1,
          fetchPage,
          logger,
          targetCount: 100,
        });
      });

      it('stops at the last page the provider has', () => {
        expect(fetchPage).toHaveBeenCalledTimes(2);
      });

      it('reports that page as the last loaded one', () => {
        expect(result.lastLoadedPage).toBe(2);
      });
    });
  });

  describe('when the target would take more pages than allowed', () => {
    let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;
    let fetchPage: jest.Mock;

    beforeEach(async () => {
      // One accessible repo per page against a target of 100 would walk the
      // provider's entire history; the cap is what keeps the request bounded.
      fetchPage = jest
        .fn()
        .mockResolvedValue({ repositories: [repo('a')], totalPages: 500 });

      result = await collectAccessibleRepos({
        startPage: 1,
        fetchPage,
        logger,
        targetCount: 100,
      });
    });

    it('spends no more than the page allowance', () => {
      expect(fetchPage).toHaveBeenCalledTimes(MAX_PROVIDER_PAGES_PER_REQUEST);
    });

    it('returns the repositories gathered so far', () => {
      expect(result.repositories).toHaveLength(MAX_PROVIDER_PAGES_PER_REQUEST);
    });

    it('leaves the caller a page to resume from', () => {
      expect(result.lastLoadedPage).toBe(MAX_PROVIDER_PAGES_PER_REQUEST);
    });

    it('still reports how many pages the provider has', () => {
      expect(result.totalPages).toBe(500);
    });

    it('is not partial: stopping on the allowance is not a failure', () => {
      expect(result.partial).toBe(false);
    });
  });

  describe('when a page fails after the first one landed', () => {
    let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;

    beforeEach(async () => {
      const fetchPage = jest
        .fn()
        .mockResolvedValueOnce({ repositories: [repo('a')], totalPages: 10 })
        .mockRejectedValue(new Error('provider exploded'));

      result = await collectAccessibleRepos({
        startPage: 1,
        fetchPage,
        logger,
        targetCount: 100,
      });
    });

    it('returns what was already gathered', () => {
      expect(result.repositories.map((r) => r.name)).toEqual(['a']);
    });

    it('flags the batch as partial', () => {
      expect(result.partial).toBe(true);
    });

    it('reports the last page that actually landed', () => {
      expect(result.lastLoadedPage).toBe(1);
    });
  });

  describe('when the first page fails', () => {
    it('rethrows, because there is nothing to show', async () => {
      const error = new Error('provider exploded');
      const fetchPage = jest.fn().mockRejectedValue(error);

      await expect(
        collectAccessibleRepos({ startPage: 1, fetchPage, logger }),
      ).rejects.toBe(error);
    });
  });

  describe('when resuming from a later page', () => {
    let result: Awaited<ReturnType<typeof collectAccessibleRepos>>;
    let fetchPage: jest.Mock;

    beforeEach(async () => {
      fetchPage = jest
        .fn()
        .mockResolvedValue({ repositories: [repo('a')], totalPages: 3 });

      result = await collectAccessibleRepos({
        startPage: 3,
        fetchPage,
        logger,
        targetCount: 100,
      });
    });

    it('starts at the requested page', () => {
      expect(fetchPage).toHaveBeenCalledWith(3);
    });

    it('reports that page as the last loaded one', () => {
      expect(result.lastLoadedPage).toBe(3);
    });
  });
});
