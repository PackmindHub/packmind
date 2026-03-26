import {
  listSkillsHandler,
  ListSkillsHandlerDependencies,
} from './listSkillsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { Space } from '@packmind/types';

const spaceA: Space = {
  id: 'space-a-id' as Space['id'],
  slug: 'space-a',
  name: 'Space A',
};

const spaceB: Space = {
  id: 'space-b-id' as Space['id'],
  slug: 'space-b',
  name: 'Space B',
};

describe('listSkillsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<
    Pick<PackmindCliHexa, 'listSkills' | 'getSpaces'>
  >;
  let mockExit: jest.Mock;
  let deps: ListSkillsHandlerDependencies;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockReturnValue(undefined);
    jest.spyOn(console, 'error').mockReturnValue(undefined);

    mockPackmindCliHexa = {
      listSkills: jest.fn(),
      getSpaces: jest.fn(),
    };

    mockExit = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa as unknown as PackmindCliHexa,
      exit: mockExit,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no space filter is provided', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        {
          slug: 'zebra-skill',
          name: 'Zebra Skill',
          description: 'Desc Z',
          spaceId: 'space-a-id',
        },
        {
          slug: 'alpha-skill',
          name: 'Alpha Skill',
          description: 'Desc A',
          spaceId: 'space-b-id',
        },
      ]);

      await listSkillsHandler({}, deps);
    });

    it('calls listSkills with empty command', () => {
      expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({});
    });

    it('displays header with count', () => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skills (2)'),
      );
    });

    describe('displays space headers', () => {
      it('displays Space A header', () => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Space "Space A"'),
        );
      });

      it('displays Space B header', () => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Space "Space B"'),
        );
      });
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when space filter matches a space', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        {
          slug: 'my-skill',
          name: 'My Skill',
          description: 'A skill',
          spaceId: 'space-a-id',
        },
      ]);

      await listSkillsHandler({ space: 'space-a' }, deps);
    });

    it('calls listSkills with the matched space id', () => {
      expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
        spaceId: spaceA.id,
      });
    });

    it('displays the space header', () => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Space "Space A"'),
      );
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when space filter is provided with @ prefix', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        {
          slug: 'my-skill',
          name: 'My Skill',
          description: 'A skill',
          spaceId: 'space-a-id',
        },
      ]);

      await listSkillsHandler({ space: '@space-a' }, deps);
    });

    it('strips the @ prefix and matches the space', () => {
      expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
        spaceId: spaceA.id,
      });
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when space filter does not match any space', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA]);

      await listSkillsHandler({ space: 'unknown' }, deps);
    });

    it('logs an error about the missing space', () => {
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Space "unknown" not found.'),
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when no skills found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([]);

      await listSkillsHandler({}, deps);
    });

    it('displays empty message', () => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No skills found.'),
      );
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no skills found in a specific space', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([]);

      await listSkillsHandler({ space: 'space-a' }, deps);
    });

    it('displays space-specific empty message', () => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No skills found in space "space-a".'),
      );
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA]);
      mockPackmindCliHexa.listSkills.mockRejectedValue(
        new Error('Network error'),
      );

      await listSkillsHandler({}, deps);
    });

    it('logs error header', () => {
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Failed to list skills:'),
      );
    });

    it('logs error message', () => {
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Network error'),
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
