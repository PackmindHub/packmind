import { SSEEventPublisher } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { SpaceContentNotifier } from './SpaceContentNotifier';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: { publishSpaceContentChangedEvent: jest.fn() },
}));

const publish = SSEEventPublisher.publishSpaceContentChangedEvent as jest.Mock;

describe('SpaceContentNotifier', () => {
  let notifier: SpaceContentNotifier;

  beforeEach(() => {
    notifier = new SpaceContentNotifier(stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a space changed', () => {
    beforeEach(async () => {
      publish.mockResolvedValue(undefined);
      await notifier.spaceContentChanged('org-1', 'space-1');
    });

    it('tells the space it moved on', () => {
      expect(publish).toHaveBeenCalledWith('org-1', 'space-1');
    });
  });

  describe('when the announcement cannot be published', () => {
    let outcome: unknown;

    beforeEach(async () => {
      publish.mockRejectedValue(new Error('redis is down'));
      outcome = await notifier
        .spaceContentChanged('org-1', 'space-1')
        .then(() => 'resolved')
        .catch(() => 'rejected');
    });

    // The write has already landed and the caller has already been told so.
    // Failing here would report it as a write that did not happen.
    it('does not fail the write it was announcing', () => {
      expect(outcome).toBe('resolved');
    });
  });
});
