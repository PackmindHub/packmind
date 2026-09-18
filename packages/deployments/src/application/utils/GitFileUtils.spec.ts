import { mergeFileUpdatesAcrossTargets } from './GitFileUtils';
import { ConflictingTargetFilePathError } from '../../domain/errors/ConflictingTargetFilePathError';
import { DeleteItemType, FileUpdates } from '@packmind/types';

describe('mergeFileUpdatesAcrossTargets', () => {
  describe('when the targets have distinct paths', () => {
    const prodUpdates: FileUpdates = {
      createOrUpdate: [{ path: 'prod/packmind.json', content: 'prod' }],
      delete: [{ path: 'prod/gone.md', type: DeleteItemType.File }],
    };
    const stagingUpdates: FileUpdates = {
      createOrUpdate: [{ path: 'staging/packmind.json', content: 'staging' }],
      delete: [{ path: 'staging/gone.md', type: DeleteItemType.File }],
    };

    it('commits the files of every target', () => {
      expect(
        mergeFileUpdatesAcrossTargets([prodUpdates, stagingUpdates])
          .createOrUpdate,
      ).toEqual([
        { path: 'prod/packmind.json', content: 'prod' },
        { path: 'staging/packmind.json', content: 'staging' },
      ]);
    });

    it('deletes the files of every target', () => {
      expect(
        mergeFileUpdatesAcrossTargets([prodUpdates, stagingUpdates]).delete,
      ).toEqual([
        { path: 'prod/gone.md', type: DeleteItemType.File },
        { path: 'staging/gone.md', type: DeleteItemType.File },
      ]);
    });
  });

  describe('when two targets write the same content to one path', () => {
    const updates: FileUpdates = {
      createOrUpdate: [{ path: 'shared/AGENTS.md', content: 'same' }],
      delete: [],
    };

    it('keeps one entry', () => {
      expect(
        mergeFileUpdatesAcrossTargets([updates, updates]).createOrUpdate,
      ).toEqual([{ path: 'shared/AGENTS.md', content: 'same' }]);
    });
  });

  describe('when two targets write different content to one path', () => {
    // Reachable when both targets are configured with the same path: nothing
    // enforces distinct paths, and their lock files never match anyway.
    const prodUpdates: FileUpdates = {
      createOrUpdate: [{ path: 'shared/packmind-lock.json', content: 'prod' }],
      delete: [],
    };
    const stagingUpdates: FileUpdates = {
      createOrUpdate: [
        { path: 'shared/packmind-lock.json', content: 'staging' },
      ],
      delete: [],
    };

    it('refuses to commit one of them as if it covered both', () => {
      expect(() =>
        mergeFileUpdatesAcrossTargets([prodUpdates, stagingUpdates]),
      ).toThrow(ConflictingTargetFilePathError);
    });

    it('names the conflicting path', () => {
      expect(() =>
        mergeFileUpdatesAcrossTargets([prodUpdates, stagingUpdates]),
      ).toThrow('shared/packmind-lock.json');
    });
  });

  describe('when one target writes a path another deletes', () => {
    const prodUpdates: FileUpdates = {
      createOrUpdate: [{ path: 'shared/command.md', content: 'prod' }],
      delete: [],
    };
    const stagingUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [{ path: 'shared/command.md', type: DeleteItemType.File }],
    };

    it('refuses to commit an outcome that contradicts one of them', () => {
      expect(() =>
        mergeFileUpdatesAcrossTargets([prodUpdates, stagingUpdates]),
      ).toThrow(ConflictingTargetFilePathError);
    });
  });

  describe('when a single target writes a path it also deletes', () => {
    // Whatever a target asks for on its own is left exactly as it is: merging
    // decides between targets, not within one.
    const updates: FileUpdates = {
      createOrUpdate: [{ path: 'prod/command.md', content: 'prod' }],
      delete: [{ path: 'prod/command.md', type: DeleteItemType.File }],
    };

    it('keeps the write', () => {
      expect(mergeFileUpdatesAcrossTargets([updates]).createOrUpdate).toEqual(
        updates.createOrUpdate,
      );
    });

    it('keeps the delete', () => {
      expect(mergeFileUpdatesAcrossTargets([updates]).delete).toEqual(
        updates.delete,
      );
    });
  });

  describe('when there are no targets', () => {
    it('commits nothing', () => {
      expect(mergeFileUpdatesAcrossTargets([])).toEqual({
        createOrUpdate: [],
        delete: [],
      });
    });
  });
});
