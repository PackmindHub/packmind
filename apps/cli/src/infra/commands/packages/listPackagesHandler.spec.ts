import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  ListHandlerDependencies,
  listPackagesHandler,
} from './listPackagesHandler';
import { IOutput } from '../../../domain/repositories/IOutput';
import { createMockOutput } from '../../../mocks/createMockRepositories';
import { spaceFactory } from '@packmind/spaces/test';
import { packageFactory } from '@packmind/deployments/test';

describe('listPackagesHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockOutput: jest.Mocked<IOutput>;
  let mockExit: jest.Mock;
  let deps: ListHandlerDependencies;

  const defaultSpace = spaceFactory({ name: 'Default', slug: 'default' });

  beforeEach(() => {
    mockOutput = createMockOutput();

    mockPackmindCliHexa = {
      listPackages: jest.fn(),
      getSpaces: jest.fn().mockResolvedValue([defaultSpace]),
      output: mockOutput,
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when packages are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({
          slug: 'zebra',
          name: 'Zebra Package',
          description: 'A zebra package',
          spaceId: defaultSpace.id,
        }),
        packageFactory({
          slug: 'alpha',
          name: 'Alpha Package',
          description: 'An alpha package',
          spaceId: defaultSpace.id,
        }),
      ]);

      await listPackagesHandler({}, deps);
    });

    it('calls listPackages without space filter', () => {
      expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({});
    });

    it('displays packages grouped by space', () => {
      expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
        expect.stringContaining('Packages (2)'),
        expect.arrayContaining([
          expect.objectContaining({
            artefacts: expect.arrayContaining([
              expect.objectContaining({ slug: '@default/alpha' }),
              expect.objectContaining({ slug: '@default/zebra' }),
            ]),
          }),
        ]),
        expect.anything(),
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no packages are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockResolvedValue([]);
      await listPackagesHandler({}, deps);
    });

    it('displays no packages message', () => {
      expect(mockOutput.notifyInfo).toHaveBeenCalledWith('No packages found.');
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when spaces are available', () => {
    const space = spaceFactory({ name: 'Global', slug: 'global' });

    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([space]);
      mockPackmindCliHexa.listPackages.mockResolvedValue([
        packageFactory({ slug: 'backend', name: 'Backend', spaceId: space.id }),
        packageFactory({ slug: 'alpha', name: 'Alpha', spaceId: space.id }),
      ]);

      await listPackagesHandler({}, deps);
    });

    it('displays packages grouped under the space', () => {
      expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
        expect.stringContaining('Packages (2)'),
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Space: Global',
            artefacts: expect.arrayContaining([
              expect.objectContaining({ slug: '@global/alpha' }),
              expect.objectContaining({ slug: '@global/backend' }),
            ]),
          }),
        ]),
        expect.anything(),
      );
    });

    it('uses @space/slug format in install example', () => {
      expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          exampleCommand: expect.stringContaining(
            'packmind-cli install @global/alpha',
          ),
        }),
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when filtering by space slug', () => {
    const spaceA = spaceFactory({ name: 'Backend', slug: 'backend' });
    const spaceB = spaceFactory({ name: 'Frontend', slug: 'frontend' });

    beforeEach(() => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
    });

    describe('only shows packages from the requested space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          packageFactory({ slug: 'api', name: 'API', spaceId: spaceA.id }),
        ]);

        await listPackagesHandler({ space: 'backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('displays the matching package', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              artefacts: expect.arrayContaining([
                expect.objectContaining({ slug: '@backend/api' }),
              ]),
            }),
          ]),
          expect.anything(),
        );
      });

      it('does not display packages from other spaces', () => {
        const calls = mockOutput.listScopedArtefacts.mock.calls;
        const allSlugs = calls.flatMap(([, groups]) =>
          groups.flatMap((g) => g.artefacts.map((a) => a.slug)),
        );
        expect(allSlugs).not.toContain('@frontend/ui');
      });
    });

    describe('supports @-prefixed space slug', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          packageFactory({ slug: 'api', name: 'API', spaceId: spaceA.id }),
        ]);

        await listPackagesHandler({ space: '@backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('displays the matching package', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              artefacts: expect.arrayContaining([
                expect.objectContaining({ slug: '@backend/api' }),
              ]),
            }),
          ]),
          expect.anything(),
        );
      });
    });

    describe('when the space slug does not exist', () => {
      beforeEach(async () => {
        await listPackagesHandler({ space: 'unknown' }, deps);
      });

      it('logs an error with available spaces', () => {
        expect(mockOutput.notifyError).toHaveBeenCalledWith(
          'Space "@unknown" not found.',
          expect.objectContaining({
            content: expect.stringContaining('Available spaces:'),
          }),
        );
      });

      it('does not call listPackages', () => {
        expect(mockPackmindCliHexa.listPackages).not.toHaveBeenCalled();
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when the space has no packages', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([]);

        await listPackagesHandler({ space: 'backend' }, deps);
      });

      it('calls listPackages with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listPackages).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('shows no-packages message', () => {
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          'No packages found in space "@backend".',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when filtering by an unknown space', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([
        spaceFactory({ slug: 'global', name: 'Global' }),
        spaceFactory({ slug: 'backend', name: 'Backend' }),
      ]);

      await listPackagesHandler({ space: 'unknown' }, deps);
    });

    it('logs space not found with available spaces', () => {
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        'Space "@unknown" not found.',
        expect.objectContaining({
          content: expect.stringContaining('Available spaces:'),
        }),
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when spaces cannot be fetched', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([]);
      await listPackagesHandler({}, deps);
    });

    it('displays unable to list spaces error', () => {
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        'Failed to list packages:',
        expect.objectContaining({
          content: 'Unable to list organization spaces.',
        }),
      );
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when listing fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listPackages.mockRejectedValue(
        new Error('Network error'),
      );
      await listPackagesHandler({}, deps);
    });

    it('displays failed to list packages error with message', () => {
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        'Failed to list packages:',
        expect.objectContaining({ content: 'Network error' }),
      );
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
