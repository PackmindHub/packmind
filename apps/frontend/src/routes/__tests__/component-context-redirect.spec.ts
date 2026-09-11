import { queryClient } from '../../shared/data/queryClient';
import type { MockedFunction } from 'vitest';
import { clientLoader as standardLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.standards.$standardId._index';
import { clientLoader as commandLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.commands.$commandId._index';
import { clientLoader as skillLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug._index';
import { clientLoader as skillFileLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug.files.$';

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
const fetchQueryMock = queryClient.fetchQuery as MockedFunction<
  typeof queryClient.fetchQuery
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

const SPACE = { id: 'space-1', slug: 'core', name: 'Core' };
const SKILL = { skill: { id: 'skill-1', slug: 'review-pr' } };

/**
 * The mode is pinned in the address rather than in storage, which is what an
 * e2e spec and a demo link do too. It also makes each case say which
 * navigation it is about without a `beforeEach` three screens up.
 */
function args(path: string, nav: string, params: Record<string, string>) {
  return {
    params: { orgSlug: 'acme', spaceSlug: 'core', ...params },
    request: new Request(
      `https://app.packmind.com/org/acme/space/core${path}?nav=${nav}`,
    ),
    context: {} as never,
  };
}

function location(result: unknown): string | null {
  return result instanceof Response ? result.headers.get('Location') : null;
}

describe('the component pages in the plugin-first navigation', () => {
  beforeEach(() => {
    ensureQueryDataMock.mockReset();
    fetchQueryMock.mockReset();
    ensureQueryDataMock.mockResolvedValue(ME);
    fetchQueryMock.mockImplementation((options: unknown) => {
      const key = (options as { queryKey: unknown[] }).queryKey;
      return Promise.resolve(
        JSON.stringify(key).includes('skill') ? SKILL : SPACE,
      ) as never;
    });
  });

  describe('a standard', () => {
    it('opens in the pane', async () => {
      const result = await standardLoader(
        args('/standards/standard-1', 'plugin-first', {
          standardId: 'standard-1',
        }),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?component=standard-1&nav=plugin-first',
      );
    });

    describe('when the reader is on the current navigation', () => {
      it('serves its own page', async () => {
        const result = await standardLoader(
          args('/standards/standard-1', 'today', {
            standardId: 'standard-1',
          }),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('a command', () => {
    it('opens in the pane', async () => {
      const result = await commandLoader(
        args('/commands/command-1', 'plugin-first', {
          commandId: 'command-1',
        }),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?component=command-1&nav=plugin-first',
      );
    });

    describe('when the reader is on the current navigation', () => {
      it('serves its own page', async () => {
        const result = await commandLoader(
          args('/commands/command-1', 'today', { commandId: 'command-1' }),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('a skill', () => {
    /* Addressed by slug, and named in the pane by id, so this one is resolved. */
    it('opens in the pane under its id', async () => {
      const result = await skillLoader(
        args('/skills/review-pr', 'plugin-first', { skillSlug: 'review-pr' }),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?component=skill-1&nav=plugin-first',
      );
    });

    describe('when the reader is on the current navigation', () => {
      it('serves its own page', async () => {
        const result = await skillLoader(
          args('/skills/review-pr', 'today', { skillSlug: 'review-pr' }),
        );

        expect(result).toBeNull();
      });
    });

    describe('when the slug names no skill', () => {
      it('serves the page, which knows how to answer for that', async () => {
        fetchQueryMock.mockImplementation((options: unknown) => {
          const key = (options as { queryKey: unknown[] }).queryKey;
          return Promise.resolve(
            JSON.stringify(key).includes('skill') ? null : SPACE,
          ) as never;
        });

        const result = await skillLoader(
          args('/skills/gone', 'plugin-first', { skillSlug: 'gone' }),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('one file of a skill', () => {
    it('opens the pane on that file', async () => {
      const result = await skillFileLoader(
        args('/skills/review-pr/files/setup/install.md', 'plugin-first', {
          skillSlug: 'review-pr',
          '*': 'setup/install.md',
        }),
      );

      expect(location(result)).toBe(
        '/org/acme/space/core/context?component=skill-1&file=setup%2Finstall.md&nav=plugin-first',
      );
    });

    describe('when the file is SKILL.md', () => {
      /* Not one of the skill's files: it is the skill, and the pane says so
         with an address naming no file at all. */
      it('opens the skill itself', async () => {
        const result = await skillFileLoader(
          args('/skills/review-pr/files/SKILL.md', 'plugin-first', {
            skillSlug: 'review-pr',
            '*': 'SKILL.md',
          }),
        );

        expect(location(result)).toBe(
          '/org/acme/space/core/context?component=skill-1&nav=plugin-first',
        );
      });
    });

    describe('when no file is named', () => {
      it('opens the skill itself', async () => {
        const result = await skillFileLoader(
          args('/skills/review-pr/files', 'plugin-first', {
            skillSlug: 'review-pr',
            '*': '',
          }),
        );

        expect(location(result)).toBe(
          '/org/acme/space/core/context?component=skill-1&nav=plugin-first',
        );
      });
    });

    describe('when the reader is on the current navigation', () => {
      it('serves its own page', async () => {
        const result = await skillFileLoader(
          args('/skills/review-pr/files/setup/install.md', 'today', {
            skillSlug: 'review-pr',
            '*': 'setup/install.md',
          }),
        );

        expect(result).toBeNull();
      });
    });
  });
});
