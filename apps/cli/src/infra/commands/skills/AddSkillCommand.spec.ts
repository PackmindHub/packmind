import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { resolveSkillInputPaths } from '../../../application/utils/resolveSkillInputPaths';
import {
  logConsole,
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import {
  addSkillHandler,
  AddSkillCommandDependencies,
} from './AddSkillCommand';

jest.mock('../../../PackmindCliHexaFactory', () => ({
  PackmindCliHexaFactory: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  formatCommand: (commandText: string) => commandText,
}));

jest.mock('../../../application/utils/resolveSkillInputPaths', () => ({
  resolveSkillInputPaths: jest.fn(),
}));

const mockLogConsole = logConsole as jest.Mock;
const mockLogErrorConsole = logErrorConsole as jest.Mock;
const mockLogInfoConsole = logInfoConsole as jest.Mock;
const mockLogSuccessConsole = logSuccessConsole as jest.Mock;
const mockedResolveSkillInputPaths =
  resolveSkillInputPaths as jest.MockedFunction<typeof resolveSkillInputPaths>;

function createUploadResult(name: string, version: number) {
  return {
    skillId: `${name}-id`,
    name,
    version,
    isNewSkill: true,
    versionCreated: true,
    fileCount: 2,
    totalSize: 2048,
  };
}

describe('addSkillHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<Pick<PackmindCliHexa, 'uploadSkill'>>;
  let mockExit: jest.Mock;
  let deps: AddSkillCommandDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      uploadSkill: jest.fn(),
    };

    mockExit = jest.fn();

    deps = {
      createPackmindCliHexa: () => mockPackmindCliHexa,
      exit: mockExit,
      getCwd: () => 'C:\\workspace',
    };

    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when multiple skill directories are provided', () => {
    describe('with all uploads succeeding', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([
          'C:\\skills\\skill-a',
          'C:\\skills\\skill-b',
        ]);
        mockPackmindCliHexa.uploadSkill
          .mockResolvedValueOnce(createUploadResult('skill-a', 1))
          .mockResolvedValueOnce(createUploadResult('skill-b', 2));

        await addSkillHandler(
          {
            skillPaths: ['C:\\skills\\skill-a', 'C:\\skills\\skill-b'],
            space: 'frontend',
            originSkill: 'origin-skill',
          },
          deps,
        );
      });

      it('uploads the first skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(1, {
          skillPath: 'C:\\skills\\skill-a',
          spaceSlug: 'frontend',
          originSkill: 'origin-skill',
        });
      });

      it('uploads the second skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(2, {
          skillPath: 'C:\\skills\\skill-b',
          spaceSlug: 'frontend',
          originSkill: 'origin-skill',
        });
      });

      it('logs the batch summary', () => {
        expect(mockLogSuccessConsole).toHaveBeenCalledWith(
          'Imported 2 of 2 skill directories successfully.',
        );
      });

      it('does not exit with an error code', () => {
        expect(mockExit).not.toHaveBeenCalled();
      });
    });

    describe('with one upload failing', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([
          'C:\\skills\\skill-a',
          'C:\\skills\\skill-b',
        ]);
        mockPackmindCliHexa.uploadSkill
          .mockRejectedValueOnce(
            new Error(
              'Multiple spaces found. Please specify one using --space',
            ),
          )
          .mockResolvedValueOnce(createUploadResult('skill-b', 1));

        await addSkillHandler(
          {
            skillPaths: ['C:\\skills\\skill-a', 'C:\\skills\\skill-b'],
          },
          deps,
        );
      });

      it('continues with the next skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenCalledTimes(2);
      });

      it('logs the failing skill path', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Upload failed for C:\\skills\\skill-a'),
        );
      });

      it('logs the multiple-space example for the failing path', () => {
        expect(mockLogConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            'packmind-cli skills add --space <slug> C:\\skills\\skill-a',
          ),
        );
      });

      it('logs the partial-failure summary', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          'Imported 1 of 2 skill directories successfully; 1 failed.',
        );
      });

      it('exits with code 1 after processing all skill paths', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when no skill path is provided', () => {
    beforeEach(async () => {
      mockedResolveSkillInputPaths.mockResolvedValue([]);
      await addSkillHandler({ skillPaths: [] }, deps);
    });

    it('logs the usage message', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        'Missing skill path. Usage: packmind-cli skills add <path> [additional-paths...]',
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not attempt any upload', () => {
      expect(mockPackmindCliHexa.uploadSkill).not.toHaveBeenCalled();
    });

    it('does not log upload progress', () => {
      expect(mockLogInfoConsole).not.toHaveBeenCalled();
    });
  });

  describe('when a single skill directory is provided', () => {
    describe('with the upload succeeding', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([
          'C:\\skills\\single-skill',
        ]);
        mockPackmindCliHexa.uploadSkill.mockResolvedValueOnce(
          createUploadResult('single-skill', 3),
        );

        await addSkillHandler(
          {
            skillPaths: ['C:\\skills\\single-skill'],
          },
          deps,
        );
      });

      it('logs the single-upload progress message', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          'Uploading skill from C:\\skills\\single-skill...',
        );
      });

      it('does not log the batch success summary', () => {
        expect(mockLogSuccessConsole).not.toHaveBeenCalledWith(
          'Imported 1 of 1 skill directory successfully.',
        );
      });
    });

    describe('with the upload failing', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([
          'C:\\skills\\single-skill',
        ]);
        mockPackmindCliHexa.uploadSkill.mockRejectedValueOnce(
          new Error('SKILL.md not found in skill directory'),
        );

        await addSkillHandler(
          {
            skillPaths: ['C:\\skills\\single-skill'],
          },
          deps,
        );
      });

      it('logs the single-upload failure summary', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          'Imported 0 of 1 skill directory successfully; 1 failed.',
        );
      });

      it('exits with code 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when an input path resolves to nested skill directories', () => {
    beforeEach(async () => {
      mockedResolveSkillInputPaths.mockResolvedValue([
        'C:\\workspace\\skills\\alpha',
        'C:\\workspace\\skills\\beta',
      ]);
      mockPackmindCliHexa.uploadSkill
        .mockResolvedValueOnce(createUploadResult('alpha', 1))
        .mockResolvedValueOnce(createUploadResult('beta', 1));

      await addSkillHandler(
        {
          skillPaths: ['skills'],
        },
        deps,
      );
    });

    it('discovers skill directories from the current working directory', () => {
      expect(mockedResolveSkillInputPaths).toHaveBeenCalledWith(
        ['skills'],
        'C:\\workspace',
      );
    });

    it('uploads each discovered skill directory', () => {
      expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(1, {
        skillPath: 'C:\\workspace\\skills\\alpha',
        spaceSlug: undefined,
        originSkill: undefined,
      });

      expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(2, {
        skillPath: 'C:\\workspace\\skills\\beta',
        spaceSlug: undefined,
        originSkill: undefined,
      });
    });
  });

  describe('when batch confirmation is needed and stdin is a TTY', () => {
    beforeEach(() => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });
    });

    describe('with the user declining the import', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([
          'C:\\skills\\skill-a',
          'C:\\skills\\skill-b',
        ]);

        jest
          .spyOn(process.stdin, 'once')
          .mockImplementation(
            (_event: string, callback: (line: string) => void) => {
              callback('n');
              return process.stdin;
            },
          );

        await addSkillHandler(
          {
            skillPaths: ['C:\\skills\\skill-a', 'C:\\skills\\skill-b'],
          },
          deps,
        );
      });

      it('does not upload any skills', () => {
        expect(mockPackmindCliHexa.uploadSkill).not.toHaveBeenCalled();
      });

      it('logs cancel message', () => {
        expect(mockLogConsole).toHaveBeenCalledWith('Import cancelled.');
      });

      it('does not exit with an error code', () => {
        expect(mockExit).not.toHaveBeenCalled();
      });
    });
  });
});
