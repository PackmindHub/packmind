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
  addResolvedSkillPath: jest.requireActual(
    '../../../application/utils/resolveSkillInputPaths',
  ).addResolvedSkillPath,
  resolveSkillInputPaths: jest.fn(),
}));

const WORKSPACE_DIRECTORY_PATH = String.raw`C:\workspace`;
const SKILL_A_PATH = String.raw`C:\skills\skill-a`;
const SKILL_B_PATH = String.raw`C:\skills\skill-b`;
const SINGLE_SKILL_PATH = String.raw`C:\skills\single-skill`;
const BLOCKED_SKILL_PATH = String.raw`C:\skills\blocked`;
const EMPTY_DIRECTORY_PATH = String.raw`C:\workspace\empty-dir`;
const NESTED_ALPHA_SKILL_PATH = String.raw`C:\workspace\skills\alpha`;
const NESTED_BETA_SKILL_PATH = String.raw`C:\workspace\skills\beta`;

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

function createPermissionDeniedError(): Error & { code: string } {
  return Object.assign(new Error('EACCES: permission denied'), {
    code: 'EACCES',
  });
}

describe('addSkillHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<Pick<PackmindCliHexa, 'uploadSkill'>>;
  let mockCreatePackmindCliHexa: jest.Mock<
    Pick<PackmindCliHexa, 'uploadSkill'>,
    []
  >;
  let mockExit: jest.Mock;
  let deps: AddSkillCommandDependencies;

  beforeEach(() => {
    mockedResolveSkillInputPaths.mockReset();
    mockPackmindCliHexa = {
      uploadSkill: jest.fn(),
    };
    mockCreatePackmindCliHexa = jest.fn(() => mockPackmindCliHexa);
    mockExit = jest.fn();

    deps = {
      createPackmindCliHexa: mockCreatePackmindCliHexa,
      exit: mockExit,
      getCwd: () => WORKSPACE_DIRECTORY_PATH,
    };

    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('when multiple skill directories are provided', () => {
    describe('with all uploads succeeding', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([SKILL_A_PATH, SKILL_B_PATH]);
        mockPackmindCliHexa.uploadSkill
          .mockResolvedValueOnce(createUploadResult('skill-a', 1))
          .mockResolvedValueOnce(createUploadResult('skill-b', 2));

        await addSkillHandler(
          {
            skillPaths: [SKILL_A_PATH, SKILL_B_PATH],
            space: 'frontend',
            originSkill: 'origin-skill',
          },
          deps,
        );
      });

      it('uploads the first skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(1, {
          skillPath: SKILL_A_PATH,
          spaceSlug: 'frontend',
          originSkill: 'origin-skill',
        });
      });

      it('uploads the second skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(2, {
          skillPath: SKILL_B_PATH,
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

      it('resolves the batch in a single call', () => {
        expect(mockedResolveSkillInputPaths).toHaveBeenCalledTimes(1);
      });
    });

    describe('with one upload failing', () => {
      beforeEach(async () => {
        mockedResolveSkillInputPaths.mockResolvedValue([SKILL_A_PATH, SKILL_B_PATH]);
        mockPackmindCliHexa.uploadSkill
          .mockRejectedValueOnce(
            new Error(
              'Multiple spaces found. Please specify one using --space',
            ),
          )
          .mockResolvedValueOnce(createUploadResult('skill-b', 1));

        await addSkillHandler(
          {
            skillPaths: [SKILL_A_PATH, SKILL_B_PATH],
          },
          deps,
        );
      });

      it('continues with the next skill path', () => {
        expect(mockPackmindCliHexa.uploadSkill).toHaveBeenCalledTimes(2);
      });

      it('logs the failing skill path', () => {
        expect(mockLogErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining(`Upload failed for ${SKILL_A_PATH}`),
        );
      });

      it('logs the multiple-space example for the failing path', () => {
        expect(mockLogConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            `packmind-cli skills add --space <slug> ${SKILL_A_PATH}`,
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
        mockedResolveSkillInputPaths.mockResolvedValue([SINGLE_SKILL_PATH]);
        mockPackmindCliHexa.uploadSkill.mockResolvedValueOnce(
          createUploadResult('single-skill', 3),
        );

        await addSkillHandler(
          {
            skillPaths: [SINGLE_SKILL_PATH],
          },
          deps,
        );
      });

      it('logs the single-upload progress message', () => {
        expect(mockLogInfoConsole).toHaveBeenCalledWith(
          `Uploading skill from ${SINGLE_SKILL_PATH}...`,
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
        mockedResolveSkillInputPaths.mockResolvedValue([SINGLE_SKILL_PATH]);
        mockPackmindCliHexa.uploadSkill.mockRejectedValueOnce(
          new Error('SKILL.md not found in skill directory'),
        );

        await addSkillHandler(
          {
            skillPaths: [SINGLE_SKILL_PATH],
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
        NESTED_ALPHA_SKILL_PATH,
        NESTED_BETA_SKILL_PATH,
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
        WORKSPACE_DIRECTORY_PATH,
      );
    });

    it('uploads each discovered skill directory', () => {
      expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(1, {
        skillPath: NESTED_ALPHA_SKILL_PATH,
        spaceSlug: undefined,
        originSkill: undefined,
      });

      expect(mockPackmindCliHexa.uploadSkill).toHaveBeenNthCalledWith(2, {
        skillPath: NESTED_BETA_SKILL_PATH,
        spaceSlug: undefined,
        originSkill: undefined,
      });
    });
  });

  describe('when the provided paths resolve to no skill directories', () => {
    beforeEach(async () => {
      mockedResolveSkillInputPaths.mockResolvedValue([]);

      await addSkillHandler(
        {
          skillPaths: [EMPTY_DIRECTORY_PATH],
        },
        deps,
      );
    });

    it('logs the no-skill-found usage message', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        'No skill directories found in the provided paths. Usage: packmind-cli skills add <path> [additional-paths...]',
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not attempt any upload', () => {
      expect(mockPackmindCliHexa.uploadSkill).not.toHaveBeenCalled();
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
        mockedResolveSkillInputPaths.mockResolvedValue([SKILL_A_PATH, SKILL_B_PATH]);

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
            skillPaths: [SKILL_A_PATH, SKILL_B_PATH],
          },
          deps,
        );
      });

      it('does not upload any skills', () => {
        expect(mockPackmindCliHexa.uploadSkill).not.toHaveBeenCalled();
      });

      it('does not initialize the CLI services', () => {
        expect(mockCreatePackmindCliHexa).not.toHaveBeenCalled();
      });

      it('logs cancel message', () => {
        expect(mockLogConsole).toHaveBeenCalledWith('Import cancelled.');
      });

      it('does not exit with an error code', () => {
        expect(mockExit).not.toHaveBeenCalled();
      });
    });
  });

  describe('when one input path fails skill discovery in a batch', () => {
    beforeEach(async () => {
      mockedResolveSkillInputPaths
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockResolvedValueOnce([SKILL_A_PATH]);
      mockPackmindCliHexa.uploadSkill.mockResolvedValueOnce(
        createUploadResult('skill-a', 1),
      );

      await addSkillHandler(
        {
          skillPaths: [BLOCKED_SKILL_PATH, SKILL_A_PATH],
        },
        deps,
      );
    });

    it('retries resolution one input at a time after the batch failure', () => {
      expect(mockedResolveSkillInputPaths).toHaveBeenNthCalledWith(
        2,
        [BLOCKED_SKILL_PATH],
        WORKSPACE_DIRECTORY_PATH,
      );
    });

    it('uploads the readable skill path', () => {
      expect(mockPackmindCliHexa.uploadSkill).toHaveBeenCalledWith({
        skillPath: SKILL_A_PATH,
        spaceSlug: undefined,
        originSkill: undefined,
      });
    });

    it('logs the discovery failure with the original error', () => {
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        `Skill discovery failed for ${BLOCKED_SKILL_PATH}: EACCES: permission denied`,
      );
    });

    it('exits with code 1 after the partial success', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when a discovery failure is followed by user cancellation', () => {
    beforeEach(() => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });
    });

    beforeEach(async () => {
      mockedResolveSkillInputPaths
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockResolvedValueOnce([SKILL_A_PATH])
        .mockResolvedValueOnce([SKILL_B_PATH]);

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
          skillPaths: [BLOCKED_SKILL_PATH, SKILL_A_PATH, SKILL_B_PATH],
        },
        deps,
      );
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when the batch resolver fails for a non-permission error', () => {
    it('rethrows the error instead of falling back to per-input discovery', async () => {
      mockedResolveSkillInputPaths.mockRejectedValueOnce(
        new Error('unexpected resolver failure'),
      );

      await expect(
        addSkillHandler(
          {
            skillPaths: [SKILL_A_PATH, SKILL_B_PATH],
          },
          deps,
        ),
      ).rejects.toThrow('unexpected resolver failure');
    });
  });

  describe('when fallback discovery hits a non-permission error', () => {
    it('rethrows the unexpected error', async () => {
      mockedResolveSkillInputPaths
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(new Error('unexpected resolver failure'));

      await expect(
        addSkillHandler(
          {
            skillPaths: [BLOCKED_SKILL_PATH, SKILL_A_PATH],
          },
          deps,
        ),
      ).rejects.toThrow('unexpected resolver failure');
    });
  });
});
