import { stubLogger } from '@packmind/test-utils';
import { createStandardId, Standard, StandardId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { StandardsServices } from '../services/StandardsServices';
import { StandardsAdapter } from './StandardsAdapter';

describe('StandardsAdapter', () => {
  describe('getStandardsByIds', () => {
    let getStandardsByIds: jest.Mock;
    let listStandardVersionsByStandardIds: jest.Mock;
    let adapter: StandardsAdapter;

    beforeEach(() => {
      getStandardsByIds = jest.fn();
      listStandardVersionsByStandardIds = jest.fn();

      const services = {
        getStandardService: () => ({ getStandardsByIds }),
        getStandardVersionService: () => ({
          listStandardVersionsByStandardIds,
        }),
      } as unknown as StandardsServices;

      adapter = new StandardsAdapter(
        services,
        {} as IStandardsRepositories,
        stubLogger(),
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when a standard has a matching current version with a summary', () => {
      let standardId: StandardId;
      let result: Standard[];

      beforeEach(async () => {
        standardId = createStandardId(uuidv4());
        getStandardsByIds.mockResolvedValue([
          standardFactory({ id: standardId, version: 2 }),
        ]);
        listStandardVersionsByStandardIds.mockResolvedValue([
          standardVersionFactory({
            standardId,
            version: 1,
            summary: 'outdated summary',
          }),
          standardVersionFactory({
            standardId,
            version: 2,
            summary: 'current summary',
          }),
        ]);

        result = await adapter.getStandardsByIds([standardId]);
      });

      it('attaches the summary of the version matching the standard version', () => {
        expect(result[0].summary).toBe('current summary');
      });
    });

    describe('when the current version is missing', () => {
      it('leaves the summary undefined', async () => {
        const standardId = createStandardId(uuidv4());
        getStandardsByIds.mockResolvedValue([
          standardFactory({ id: standardId, version: 5 }),
        ]);
        listStandardVersionsByStandardIds.mockResolvedValue([
          standardVersionFactory({
            standardId,
            version: 1,
            summary: 'old summary',
          }),
        ]);

        const result = await adapter.getStandardsByIds([standardId]);

        expect(result[0].summary).toBeUndefined();
      });
    });

    describe('when the matching version has no summary', () => {
      it('leaves the summary undefined', async () => {
        const standardId = createStandardId(uuidv4());
        getStandardsByIds.mockResolvedValue([
          standardFactory({ id: standardId, version: 1 }),
        ]);
        listStandardVersionsByStandardIds.mockResolvedValue([
          standardVersionFactory({ standardId, version: 1, summary: null }),
        ]);

        const result = await adapter.getStandardsByIds([standardId]);

        expect(result[0].summary).toBeUndefined();
      });
    });

    describe('when no standards are found', () => {
      let ids: StandardId[];
      let result: Standard[];

      beforeEach(async () => {
        ids = [createStandardId(uuidv4())];
        getStandardsByIds.mockResolvedValue([]);

        result = await adapter.getStandardsByIds(ids);
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not query for versions', () => {
        expect(listStandardVersionsByStandardIds).not.toHaveBeenCalled();
      });
    });

    describe('when resolving versions for found standards', () => {
      it('queries versions using the found standard ids', async () => {
        const standardId = createStandardId(uuidv4());
        getStandardsByIds.mockResolvedValue([
          standardFactory({ id: standardId, version: 1 }),
        ]);
        listStandardVersionsByStandardIds.mockResolvedValue([]);

        await adapter.getStandardsByIds([standardId]);

        expect(listStandardVersionsByStandardIds).toHaveBeenCalledWith([
          standardId,
        ]);
      });
    });
  });
});
