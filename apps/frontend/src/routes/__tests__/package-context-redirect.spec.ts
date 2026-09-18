import { queryClient } from '../../shared/data/queryClient';
import { makeLoaderArgs } from '../../test/loaderArgs';
import type { MockedFunction } from 'vitest';
import { clientLoader as packageLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.packages.$packageId._index';
import { clientLoader as packagesLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.packages._index';

vi.mock('../../shared/data/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
    fetchQuery: vi.fn(),
    prefetchQuery: vi.fn(),
  },
}));

const ensureQueryDataMock = queryClient.ensureQueryData as MockedFunction<
  typeof queryClient.ensureQueryData
>;

const ME = {
  authenticated: true,
  user: { id: 'user-1', email: 'someone@example.com' },
  organization: {
    id: 'org-1',
    slug: 'acme',
    name: 'Acme',
    role: 'member',
  },
};

/**
 * The mode is pinned in the address rather than in storage, the way
 * `component-context-redirect.spec.ts` pins it and for the same reason: each
 * case says which navigation it is about without a `beforeEach` three screens
 * up.
 */
function args(path: string, search: string, params: Record<string, string>) {
  return makeLoaderArgs({
    url: `https://app.packmind.com/org/acme/space/core${path}?${search}`,
    params: { orgSlug: 'acme', spaceSlug: 'core', ...params },
  });
}

function location(result: unknown): string | null {
  return result instanceof Response ? result.headers.get('Location') : null;
}

describe('the package pages in the plugin-first navigation', () => {
  beforeEach(() => {
    ensureQueryDataMock.mockReset();
    ensureQueryDataMock.mockResolvedValue(ME);
  });

  describe('one package', () => {
    it('opens in the rail', async () => {
      const result = await packageLoader(
        args('/packages/pkg-1', 'nav=plugin-first', { packageId: 'pkg-1' }),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?package=pkg-1&nav=plugin-first',
      );
    });

    describe('when the address asks for its distributions', () => {
      /* The two surfaces spell the same half differently, and the address in
         the wild carries the page's spelling. */
      it('opens on the tab that answers', async () => {
        const result = await packageLoader(
          args('/packages/pkg-1', 'tab=distributions&nav=plugin-first', {
            packageId: 'pkg-1',
          }),
        );

        expect(location(result)).toBe(
          '/org/acme/space/core/context?package=pkg-1&tab=distribution&nav=plugin-first',
        );
      });
    });

    describe('when the address asks for its content', () => {
      /* The page's default, which is the pane's default too, so it is dropped
         rather than translated: one address for the plain reading. */
      it('names no tab', async () => {
        const result = await packageLoader(
          args('/packages/pkg-1', 'tab=content&nav=plugin-first', {
            packageId: 'pkg-1',
          }),
        );

        expect(location(result)).toBe(
          '/org/acme/space/core/context?package=pkg-1&nav=plugin-first',
        );
      });
    });

    describe('when the reader is on the current navigation', () => {
      it('serves its own page', async () => {
        const result = await packageLoader(
          args('/packages/pkg-1', 'nav=today', { packageId: 'pkg-1' }),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('the list of packages', () => {
    /* No package to name: the rail is the list, and it answers with its own
       first entry the way Context does with no parameters at all. */
    it('opens Context on no package in particular', async () => {
      const result = await packagesLoader(
        args('/packages', 'nav=plugin-first', {}),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?nav=plugin-first',
      );
    });

    describe('when the reader is on the current navigation', () => {
      it('serves the list, which is a sidebar entry there', async () => {
        const result = await packagesLoader(args('/packages', 'nav=today', {}));

        expect(result).toBeNull();
      });
    });
  });
});
