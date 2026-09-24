import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';

const origin = 'PackageChangeNotifier';

/**
 * Tells everyone reading this space's packages that they are looking at
 * something stale.
 *
 * Every write that changes what a package surface shows calls this: the list
 * itself, a package's identity, and which artefacts each one carries. The
 * surfaces answer by refetching, so two readers who opened the page minutes
 * apart no longer act on two different pictures of the same space — which is
 * the whole reason a membership decision could be made twice over.
 *
 * A failure here is swallowed, deliberately. The write has already landed and
 * the caller has already been told it did; a refresh hint that could not be
 * published is a page that stays stale until its next fetch, which is exactly
 * where every reader was before this existed. Failing the request instead would
 * report a write that happened as a write that did not.
 *
 * Injected rather than reached for statically so a use case's spec can say
 * whether it announced its write, and so the one place that decides to swallow
 * is one place.
 */
export class PackageChangeNotifier {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async packagesChanged(
    organizationId: string,
    spaceId: string,
  ): Promise<void> {
    try {
      await SSEEventPublisher.publishPackagesChangedEvent(
        organizationId,
        spaceId,
      );
    } catch (error) {
      this.logger.warn('Could not announce a package change to readers', {
        organizationId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
