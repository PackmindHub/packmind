import type { LoaderFunctionArgs } from 'react-router';
import { clientLoader } from '../../../app/routes/org.$orgSlug._protected';
import { AuthService } from '../../services/auth/AuthService';

jest.mock('../../services/auth/AuthService', () => ({
  AuthService: {
    getInstance: jest.fn(),
  },
}));

const getInstanceMock = AuthService.getInstance as jest.MockedFunction<
  typeof AuthService.getInstance
>;

const buildLoaderArgs = (params: LoaderFunctionArgs['params']) =>
  ({ params }) as LoaderFunctionArgs;

describe('org protected clientLoader', () => {
  beforeEach(() => {
    getInstanceMock.mockReset();
  });

  describe('when URL slug mismatches current org', () => {
    it('redirects to the active organization dashboard', async () => {
      const getMe = jest.fn().mockResolvedValue({
        authenticated: true,
        organization: { slug: 'packmind', name: 'Packmind' },
      });

      getInstanceMock.mockReturnValue({
        getMe,
      } as unknown as AuthService);

      let caught: Response | null = null;
      try {
        await clientLoader(
          buildLoaderArgs({
            orgSlug: 'hello',
          }),
        );
      } catch (error) {
        caught = error as Response;
      }

      expect(caught).toBeTruthy();
      expect(getMe).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the URL slug matches the active organization', () => {
    it('returns the user data', async () => {
      const getMe = jest.fn().mockResolvedValue({
        authenticated: true,
        organization: { slug: 'packmind', name: 'Packmind' },
      });

      getInstanceMock.mockReturnValue({
        getMe,
      } as unknown as AuthService);

      const result = await clientLoader(
        buildLoaderArgs({
          orgSlug: 'packmind',
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          me: expect.objectContaining({
            organization: expect.objectContaining({ slug: 'packmind' }),
          }),
        }),
      );
    });
  });
});
