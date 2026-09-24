import { SSEEventPublisher } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { PackageChangeNotifier } from './PackageChangeNotifier';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: { publishPackagesChangedEvent: jest.fn() },
}));

const publish = SSEEventPublisher.publishPackagesChangedEvent as jest.Mock;

describe('PackageChangeNotifier', () => {
  let notifier: PackageChangeNotifier;

  beforeEach(() => {
    notifier = new PackageChangeNotifier(stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a package changed', () => {
    beforeEach(async () => {
      publish.mockResolvedValue(undefined);
      await notifier.packagesChanged('org-1', 'space-1');
    });

    it('tells the space its packages moved on', () => {
      expect(publish).toHaveBeenCalledWith('org-1', 'space-1');
    });
  });

  describe('when the announcement cannot be published', () => {
    let outcome: unknown;

    beforeEach(async () => {
      publish.mockRejectedValue(new Error('redis is down'));
      outcome = await notifier
        .packagesChanged('org-1', 'space-1')
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
