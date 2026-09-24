import { render } from '@testing-library/react';
import { createOrganizationId, createSpaceId } from '@packmind/types';
import { PackagesChangedSubscription } from './PackagesChangedSubscription';
import {
  GET_PACKAGE_BY_ID_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../api/queryKeys';
import { getCommandsBySpaceKey } from '../../commands/api/queryKeys';
import { getSkillsBySpaceKey } from '../../skills/api/queryKeys';
import { getStandardsBySpaceKey } from '../../standards/api/queryKeys';

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

describe('PackagesChangedSubscription', () => {
  beforeEach(() => {
    subscriptions.length = 0;
    invalidateQueries.mockClear();
    currentSpace = {
      spaceId: SPACE_ID,
      space: { organizationId: ORGANIZATION_ID },
    };
  });

  describe('when a space is open', () => {
    beforeEach(() => {
      render(<PackagesChangedSubscription />);
    });

    it('listens for changes to that space alone', () => {
      expect(subscriptions[0]).toMatchObject({
        eventType: 'PACKAGES_CHANGED',
        params: [SPACE_ID],
        enabled: true,
      });
    });
  });

  describe('when the space reports a package change', () => {
    beforeEach(() => {
      render(<PackagesChangedSubscription />);
      subscriptions[0].onEvent({} as MessageEvent);
    });

    it('drops the cached list of the space packages', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    });

    it('drops the cached package a detail pane is reading', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: GET_PACKAGE_BY_ID_KEY,
      });
    });

    /*
     * A package holds ids, and a row is drawn by finding each id in the space's
     * catalogue. A component created straight into the package is an id the
     * reader's catalogue has never seen, so refetching the memberships alone
     * moved the count and drew no row.
     */
    it('drops the cached standards the rows are named from', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getStandardsBySpaceKey(SPACE_ID),
      });
    });

    it('drops the cached commands the rows are named from', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getCommandsBySpaceKey(SPACE_ID),
      });
    });

    it('drops the cached skills the rows are named from', () => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getSkillsBySpaceKey(SPACE_ID),
      });
    });
  });

  // Subscribing under no space would ask the server for every space's changes.
  describe('when no space has resolved yet', () => {
    beforeEach(() => {
      currentSpace = {};
      render(<PackagesChangedSubscription />);
    });

    it('subscribes to nothing', () => {
      expect(subscriptions[0]).toMatchObject({ params: [], enabled: false });
    });
  });
});
