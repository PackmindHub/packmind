import { packageActivity } from './packageActivity';

const CREATED = '2026-08-01T10:00:00.000Z';
const CHANGED = '2026-09-01T10:00:00.000Z';

describe('packageActivity', () => {
  describe('when the package has changed since it was created', () => {
    it('reports both dates', () => {
      expect(
        packageActivity({ createdAt: CREATED, updatedAt: CHANGED }),
      ).toEqual({ createdAt: CREATED, changedAt: CHANGED });
    });
  });

  /*
   * The common case for a package made and filled in one sitting: the row's two
   * columns hold the same instant, and printing both would say one thing twice.
   */
  describe('when nothing has happened since creation', () => {
    it('reports no change', () => {
      expect(
        packageActivity({ createdAt: CREATED, updatedAt: CREATED }),
      ).toEqual({ createdAt: CREATED, changedAt: null });
    });
  });

  describe('when the payload carries no dates', () => {
    it('reports nothing rather than inventing one', () => {
      expect(packageActivity({})).toBeNull();
    });
  });

  describe('when a date cannot be read', () => {
    it('reports nothing', () => {
      expect(packageActivity({ createdAt: 'not a date' })).toBeNull();
    });

    it('ignores an unreadable change date rather than dropping the row', () => {
      expect(
        packageActivity({ createdAt: CREATED, updatedAt: 'not a date' }),
      ).toEqual({ createdAt: CREATED, changedAt: null });
    });
  });
});
