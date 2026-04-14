import {
  listSkillsHandler,
  ListSkillsHandlerDependencies,
} from './listSkillsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IOutput } from '../../../domain/repositories/IOutput';
import { createMockOutput } from '../../../mocks/createMockRepositories';
import { spaceFactory } from '@packmind/spaces/test';
import { skillFactory } from '@packmind/skills/test';

describe('listSkillsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockOutput: jest.Mocked<IOutput>;
  let mockExit: jest.Mock;
  let deps: ListSkillsHandlerDependencies;

  const defaultSpace = spaceFactory({ name: 'Default', slug: 'default' });

  beforeEach(() => {
    mockOutput = createMockOutput();

    mockPackmindCliHexa = {
      listSkills: jest.fn(),
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

  describe('when skills are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        skillFactory({
          slug: 'zebra-skill',
          name: 'Zebra Skill',
          description: 'Desc Z',
          spaceId: defaultSpace.id,
        }),
        skillFactory({
          slug: 'alpha-skill',
          name: 'Alpha Skill',
          description: 'Desc A',
          spaceId: defaultSpace.id,
        }),
      ]);

      await listSkillsHandler({}, deps);
    });

    it('calls listSkills without space filter', () => {
      expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({});
    });

    it('displays skills grouped by space with count', () => {
      expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
        expect.stringContaining('Skills (2)'),
        expect.arrayContaining([
          expect.objectContaining({
            artefacts: expect.arrayContaining([
              expect.objectContaining({ slug: 'alpha-skill' }),
              expect.objectContaining({ slug: 'zebra-skill' }),
            ]),
          }),
        ]),
      );
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no skills are found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([]);
      await listSkillsHandler({}, deps);
    });

    it('displays no skills message', () => {
      expect(mockOutput.notifyInfo).toHaveBeenCalledWith('No skills found.');
    });

    it('exits with 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when spaces are available', () => {
    const spaceA = spaceFactory({ name: 'Space A', slug: 'space-a' });
    const spaceB = spaceFactory({ name: 'Space B', slug: 'space-b' });

    beforeEach(async () => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        skillFactory({
          slug: 'zebra-skill',
          name: 'Zebra Skill',
          spaceId: spaceA.id,
        }),
        skillFactory({
          slug: 'alpha-skill',
          name: 'Alpha Skill',
          spaceId: spaceB.id,
        }),
      ]);

      await listSkillsHandler({}, deps);
    });

    it('displays skills grouped under their respective spaces', () => {
      expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
        expect.stringContaining('Skills (2)'),
        expect.arrayContaining([
          expect.objectContaining({ title: 'Space: Space A' }),
          expect.objectContaining({ title: 'Space: Space B' }),
        ]),
      );
    });
  });

  describe('when filtering by space slug', () => {
    const spaceA = spaceFactory({ name: 'Backend', slug: 'backend' });
    const spaceB = spaceFactory({ name: 'Frontend', slug: 'frontend' });

    beforeEach(() => {
      mockPackmindCliHexa.getSpaces.mockResolvedValue([spaceA, spaceB]);
    });

    describe('only shows skills from the requested space', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listSkills.mockResolvedValue([
          skillFactory({
            slug: 'api-skill',
            name: 'API Skill',
            spaceId: spaceA.id,
          }),
        ]);

        await listSkillsHandler({ space: 'backend' }, deps);
      });

      it('calls listSkills with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('displays the matching skill', () => {
        expect(mockOutput.listScopedArtefacts).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              artefacts: expect.arrayContaining([
                expect.objectContaining({ slug: 'api-skill' }),
              ]),
            }),
          ]),
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('supports @-prefixed space slug', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listSkills.mockResolvedValue([
          skillFactory({
            slug: 'api-skill',
            name: 'API Skill',
            spaceId: spaceA.id,
          }),
        ]);

        await listSkillsHandler({ space: '@backend' }, deps);
      });

      it('calls listSkills with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });
    });

    describe('when the space slug does not exist', () => {
      beforeEach(async () => {
        await listSkillsHandler({ space: 'unknown' }, deps);
      });

      it('logs an error with available spaces', () => {
        expect(mockOutput.notifyError).toHaveBeenCalledWith(
          'Space "@unknown" not found.',
          expect.objectContaining({
            content: expect.stringContaining('Available spaces:'),
          }),
        );
      });

      it('does not call listSkills', () => {
        expect(mockPackmindCliHexa.listSkills).not.toHaveBeenCalled();
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when the space has no skills', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listSkills.mockResolvedValue([]);

        await listSkillsHandler({ space: 'backend' }, deps);
      });

      it('calls listSkills with the correct spaceId', () => {
        expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
          spaceId: spaceA.id,
        });
      });

      it('shows no-skills message for the space', () => {
        expect(mockOutput.notifyInfo).toHaveBeenCalledWith(
          'No skills found in space "@backend".',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when listing fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockRejectedValue(
        new Error('Network error'),
      );
      await listSkillsHandler({}, deps);
    });

    it('displays failed to list skills error with message', () => {
      expect(mockOutput.notifyError).toHaveBeenCalledWith(
        'Failed to list skills:',
        expect.objectContaining({ content: 'Network error' }),
      );
    });

    it('exits with 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
