import { render } from '@testing-library/react';
import { createOrganizationId, createSpaceId } from '@packmind/types';
import { SpaceContentSubscription } from './SpaceContentSubscription';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';
import { GET_RULES_BY_STANDARD_ID_KEY } from '../../standards/api/queryKeys';
import {
  GET_PACKAGE_BY_ID_KEY,
  GET_PACKAGE_RELEASE_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
  LIST_PACKAGE_RELEASES_KEY,
} from '../api/queryKeys';

const SPACE_ID = createSpaceId('space-1');
const ORGANIZATION_ID = createOrganizationId('org-1');

let currentSpace: { spaceId?: string; space?: { organizationId: string } } = {
  spaceId: SPACE_ID,
  space: { organizationId: ORGANIZATION_ID },
};

const subscriptions: {
  eventType: string;
  params: string[];
  enabled: boolean;
  onEvent: (event: MessageEvent) => void;
}[] = [];

const invalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => currentSpace,
}));

vi.mock('../../sse', () => ({
  useSSESubscription: (options: {
    eventType: string;
    params: string[];
    enabled: boolean;
    onEvent: (event: MessageEvent) => void;
  }) => {
    subscriptions.push(options);
  },
}));

vi.mock('../../../shared/data/queryClient', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
  },
}));

const announce = () => subscriptions[0].onEvent({} as MessageEvent);

describe('SpaceContentSubscription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscriptions.length = 0;
    currentSpace = {
      spaceId: SPACE_ID,
      space: { organizationId: ORGANIZATION_ID },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('when a space is open', () => {
    beforeEach(() => {
      render(<SpaceContentSubscription />);
    });

    it('listens for changes to that space alone', () => {
      expect(subscriptions[0]).toMatchObject({
        eventType: 'SPACE_CONTENT_CHANGED',
        params: [SPACE_ID],
        enabled: true,
      });
    });
  });

  describe('when the space reports a change', () => {
    beforeEach(() => {
      render(<SpaceContentSubscription />);
      announce();
      vi.runAllTimers();
    });

    /*
     * A package holds ids, and a row is drawn by finding each in the space's
     * catalogue. A component created straight into a package is an id the
     * reader's catalogue has never seen, so refetching the memberships alone
     * moved the count and drew no row.
     */
    it('drops everything the space scopes to itself', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [ORGANIZATION_QUERY_SCOPE, SPACES_SCOPE, SPACE_ID],
      });
    });

    it('drops the cached list of the space packages', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...LIST_PACKAGES_BY_SPACE_KEY, SPACE_ID],
      });
    });

    /*
     * The one key that names its package before its space, so the space cannot
     * be asked for as a prefix.
     */
    it('drops the cached package a detail pane is reading', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: GET_PACKAGE_BY_ID_KEY,
        predicate: expect.any(Function),
      });
    });

    it('keeps the cached package of another space', () => {
      const { predicate } = invalidateQueries.mock.calls
        .map(([options]) => options)
        .find(({ queryKey }) => queryKey === GET_PACKAGE_BY_ID_KEY);

      expect(
        predicate({
          queryKey: [
            ...GET_PACKAGE_BY_ID_KEY,
            'package-1',
            'space-2',
            ORGANIZATION_ID,
          ],
        }),
      ).toBe(false);
    });

    // A standard's rules hang off the standards scope, not the space prefix.
    it('drops the cached rules of a standard', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, ORGANIZATION_ID, SPACE_ID],
      });
    });

    /*
     * Whether a package is behind what it holds is a comparison, and both sides
     * of it move: a component gains a version, or someone cuts the release that
     * catches up.
     */
    it('drops the cached releases a package is judged against', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...LIST_PACKAGE_RELEASES_KEY, SPACE_ID],
      });
    });

    it('drops the cached release a pane is reading', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...GET_PACKAGE_RELEASE_KEY, SPACE_ID],
      });
    });
  });

  // Importing a folder of skills announces one event per skill.
  describe('when a burst of changes arrives', () => {
    beforeEach(() => {
      render(<SpaceContentSubscription />);
      announce();
      announce();
      announce();
      vi.runAllTimers();
    });

    it('refreshes once for the whole burst', () => {
      expect(invalidateQueries).toHaveBeenCalledTimes(6);
    });
  });

  /*
   * A long import announces faster than the wait, so a wait that restarts on
   * every event would refresh nothing until the import ended — which is when an
   * open picker is offering membership that has stopped being true.
   */
  describe('when changes keep arriving faster than the wait', () => {
    beforeEach(() => {
      render(<SpaceContentSubscription />);

      for (let elapsed = 0; elapsed < 5000; elapsed += 200) {
        announce();
        vi.advanceTimersByTime(200);
      }
    });

    it('refreshes without waiting for them to stop', () => {
      expect(invalidateQueries).toHaveBeenCalled();
    });
  });

  describe('when nothing has been announced', () => {
    beforeEach(() => {
      render(<SpaceContentSubscription />);
      vi.runAllTimers();
    });

    it('refetches nothing', () => {
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  // Subscribing under no space would ask the server for every space's changes.
  describe('when no space has resolved yet', () => {
    beforeEach(() => {
      currentSpace = {};
      render(<SpaceContentSubscription />);
    });

    it('subscribes to nothing', () => {
      expect(subscriptions[0]).toMatchObject({ params: [], enabled: false });
    });
  });
});
