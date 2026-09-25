import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';

const origin = 'SpaceContentNotifier';

/**
 * Tells everyone reading this space that they are looking at something stale.
 *
 * Two kinds of write call it: the package writes, which change what each
 * package carries, and — through the listener — the component writes in the
 * other three domains, which change what there is to carry. Both together,
 * because a surface reads them together: a package holds ids, and a row is
 * drawn by finding each id in the space's catalogue, so a reader told about one
 * half and not the other sees a count move with no row under it.
 *
 * Package membership is decided against exactly that reading. Two people
 * working in the same space — or one person with it open in two tabs — were
 * each choosing from a picture that had stopped being true, which is how the
 * same component could be placed twice.
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
export class SpaceContentNotifier {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async spaceContentChanged(
    organizationId: string,
    spaceId: string,
  ): Promise<void> {
    try {
      await SSEEventPublisher.publishSpaceContentChangedEvent(
        organizationId,
        spaceId,
      );
    } catch (error) {
      this.logger.warn('Could not announce a space change to its readers', {
        organizationId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
