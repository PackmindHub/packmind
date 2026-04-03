import { queryClient } from '../../shared/data/queryClient';
import { setFlashToast } from '../../shared/utils/flashToast';
import { redirect } from 'react-router';
import { clientLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected';

// Ensure Response is available globally for instanceof checks in production code
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    headers: Map<string, string>;
    status: number;
    constructor(
      _body?: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) {
      this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
  } as unknown as typeof globalThis.Response;
}

jest.mock('../../shared/data/queryClient', () => ({
  queryClient: {
    ensureQueryData: jest.fn(),
    fetchQuery: jest.fn(),
    prefetchQuery: jest.fn(),
  },
}));

jest.mock('../../shared/utils/flashToast', () => ({
  setFlashToast: jest.fn(),
  consumeFlashToast: jest.fn(),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    pmToaster: {
      create: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

class RedirectResponse {
  readonly location: string;
  constructor(location: string) {
    this.location = location;
  }
}

jest.mock('react-router', () => {
  const actual = jest.requireActual('react-router');
  return {
    ...actual,
    redirect: jest.fn((url: string) => {
      throw new RedirectResponse(url);
    }),
  };
});

const ensureQueryDataMock = queryClient.ensureQueryData as jest.MockedFunction<
  typeof queryClient.ensureQueryData
>;
const fetchQueryMock = queryClient.fetchQuery as jest.MockedFunction<
  typeof queryClient.fetchQuery
>;
const prefetchQueryMock = queryClient.prefetchQuery as jest.MockedFunction<
  typeof queryClient.prefetchQuery
>;
const setFlashToastMock = setFlashToast as jest.Mock;
const redirectMock = redirect as jest.MockedFunction<typeof redirect>;

const me = {
  authenticated: true,
  user: { id: 'user-1', email: 'test@example.com' },
  organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
};

const loaderArgs = (spaceSlug: string) => ({
  params: { orgSlug: 'org-slug', spaceSlug },
});

async function runLoaderExpectingRedirect(spaceSlug: string) {
  try {
    await clientLoader(loaderArgs(spaceSlug));
  } catch {
    // Expected: loader throws a redirect
  }
}

describe('space-protected loader', () => {
  beforeEach(() => {
    ensureQueryDataMock.mockReset();
    fetchQueryMock.mockReset();
    prefetchQueryMock.mockReset();
    setFlashToastMock.mockReset();
    redirectMock.mockClear();
  });

  describe('when the user is a member of the space', () => {
    const space = { id: 'space-1', slug: 'my-space', name: 'My Space' };

    beforeEach(() => {
      ensureQueryDataMock
        .mockResolvedValueOnce(me)
        .mockResolvedValueOnce(space)
        .mockResolvedValueOnce([space]);
      prefetchQueryMock.mockResolvedValueOnce(undefined);
    });

    it('returns the space', async () => {
      const result = await clientLoader(loaderArgs('my-space'));

      expect(result).toEqual({ space });
    });

    it('does not set a flash toast', async () => {
      await clientLoader(loaderArgs('my-space'));

      expect(setFlashToastMock).not.toHaveBeenCalled();
    });
  });

  describe('when the user is not a member of the space', () => {
    const targetSpace = {
      id: 'space-2',
      slug: 'other-space',
      name: 'Other Space',
    };
    const userSpace = {
      id: 'space-1',
      slug: 'my-space',
      name: 'My Space',
    };

    beforeEach(async () => {
      ensureQueryDataMock
        .mockResolvedValueOnce(me)
        .mockResolvedValueOnce(targetSpace)
        .mockResolvedValueOnce([userSpace]);

      await runLoaderExpectingRedirect('other-space');
    });

    it('redirects to the first available user space', () => {
      expect(redirectMock).toHaveBeenCalledWith('/org/org-slug/space/my-space');
    });

    it('sets a permission error flash toast', () => {
      expect(setFlashToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Access denied',
        description: expect.stringContaining(
          'do not have permission to access',
        ),
      });
    });
  });

  describe('when the space does not exist', () => {
    const userSpace = {
      id: 'space-1',
      slug: 'my-space',
      name: 'My Space',
    };

    beforeEach(async () => {
      ensureQueryDataMock.mockResolvedValueOnce(me).mockResolvedValueOnce(null);
      fetchQueryMock.mockResolvedValueOnce([userSpace]);

      await runLoaderExpectingRedirect('nonexistent');
    });

    it('redirects to the first available user space', () => {
      expect(redirectMock).toHaveBeenCalledWith('/org/org-slug/space/my-space');
    });

    it('sets a space not found flash toast', () => {
      expect(setFlashToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Space not found',
        description: expect.stringContaining('does not exist'),
      });
    });
  });

  describe('when the space fetch throws an error', () => {
    const userSpace = {
      id: 'space-1',
      slug: 'my-space',
      name: 'My Space',
    };

    beforeEach(async () => {
      ensureQueryDataMock
        .mockResolvedValueOnce(me)
        .mockRejectedValueOnce(new Error('Network error'));
      fetchQueryMock.mockResolvedValueOnce([userSpace]);

      await runLoaderExpectingRedirect('broken-space');
    });

    it('redirects to the first available user space', () => {
      expect(redirectMock).toHaveBeenCalledWith('/org/org-slug/space/my-space');
    });

    it('sets an error loading space flash toast', () => {
      expect(setFlashToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error loading space',
        description: expect.stringContaining('Redirecting'),
      });
    });
  });
});
