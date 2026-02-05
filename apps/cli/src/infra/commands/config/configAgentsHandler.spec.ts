import * as fs from 'fs';
import * as readline from 'readline';
import { CodingAgent } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';
import {
  configAgentsHandler,
  ConfigAgentsHandlerDependencies,
  SELECTABLE_AGENTS,
  AGENT_DISPLAY_NAMES,
} from './configAgentsHandler';
import * as consoleLogger from '../../utils/consoleLogger';

// Create mock functions before jest.mock to avoid hoisting issues
const mockInquirerPrompt = jest.fn();

// Mock inquirer with reference to the mock function
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: (...args: unknown[]) => mockInquirerPrompt(...args),
  },
}));

jest.mock('fs');
jest.mock('readline');
jest.mock('../../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockReadline = readline as jest.Mocked<typeof readline>;
const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('configAgentsHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockAgentDetectionService: jest.Mocked<IAgentArtifactDetectionService>;
  let deps: ConfigAgentsHandlerDependencies;
  let originalStdoutWrite: typeof process.stdout.write;

  beforeEach(() => {
    mockConfigRepository = {
      readConfig: jest.fn(),
      writeConfig: jest.fn(),
      configExists: jest.fn(),
      addPackagesToConfig: jest.fn(),
      findDescendantConfigs: jest.fn(),
      readHierarchicalConfig: jest.fn(),
      findAllConfigsInTree: jest.fn(),
      updateConfig: jest.fn(),
      updateAgentsConfig: jest.fn(),
    } as unknown as jest.Mocked<IConfigFileRepository>;

    mockAgentDetectionService = {
      detectAgentArtifacts: jest.fn(),
    } as unknown as jest.Mocked<IAgentArtifactDetectionService>;

    deps = {
      configRepository: mockConfigRepository,
      agentDetectionService: mockAgentDetectionService,
      baseDirectory: '/project',
      isTTY: true,
    };

    // Capture stdout to prevent test output pollution
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = jest.fn() as typeof process.stdout.write;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.stdout.write = originalStdoutWrite;
    delete process.env.PACKMIND_SIMPLE_PROMPT;
  });

  describe('SELECTABLE_AGENTS', () => {
    it('excludes packmind agent', () => {
      expect(SELECTABLE_AGENTS).not.toContain('packmind');
    });

    it('includes claude agent', () => {
      expect(SELECTABLE_AGENTS).toContain('claude');
    });

    it('includes cursor agent', () => {
      expect(SELECTABLE_AGENTS).toContain('cursor');
    });

    it('includes copilot agent', () => {
      expect(SELECTABLE_AGENTS).toContain('copilot');
    });

    it('includes continue agent', () => {
      expect(SELECTABLE_AGENTS).toContain('continue');
    });

    it('includes junie agent', () => {
      expect(SELECTABLE_AGENTS).toContain('junie');
    });

    it('includes agents_md agent', () => {
      expect(SELECTABLE_AGENTS).toContain('agents_md');
    });

    it('includes gitlab_duo agent', () => {
      expect(SELECTABLE_AGENTS).toContain('gitlab_duo');
    });
  });

  describe('AGENT_DISPLAY_NAMES', () => {
    it('maps claude to Claude Code', () => {
      expect(AGENT_DISPLAY_NAMES.claude).toBe('Claude Code');
    });

    it('maps cursor to Cursor', () => {
      expect(AGENT_DISPLAY_NAMES.cursor).toBe('Cursor');
    });

    it('maps copilot to GitHub Copilot', () => {
      expect(AGENT_DISPLAY_NAMES.copilot).toBe('GitHub Copilot');
    });

    it('maps continue to Continue.dev', () => {
      expect(AGENT_DISPLAY_NAMES.continue).toBe('Continue.dev');
    });

    it('maps junie to Junie', () => {
      expect(AGENT_DISPLAY_NAMES.junie).toBe('Junie');
    });

    it('maps agents_md to AGENTS.md', () => {
      expect(AGENT_DISPLAY_NAMES.agents_md).toBe('AGENTS.md');
    });

    it('maps gitlab_duo to GitLab Duo', () => {
      expect(AGENT_DISPLAY_NAMES.gitlab_duo).toBe('GitLab Duo');
    });

    it('maps packmind to Packmind', () => {
      expect(AGENT_DISPLAY_NAMES.packmind).toBe('Packmind');
    });
  });

  describe('when using TTY mode with inquirer', () => {
    beforeEach(() => {
      deps.isTTY = true;
    });

    describe('when config has agents field', () => {
      describe('when agents are valid selectable agents', () => {
        let capturedChoices: { value: CodingAgent; checked: boolean }[];

        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: ['claude', 'cursor'],
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockImplementation(
            async (
              questions: {
                choices: { value: CodingAgent; checked: boolean }[];
              }[],
            ) => {
              capturedChoices = questions[0].choices;
              return { selectedAgents: ['claude', 'cursor'] };
            },
          );

          await configAgentsHandler(deps);
        });

        it('pre-selects claude from config', () => {
          const claudeChoice = capturedChoices.find(
            (c) => c.value === 'claude',
          );
          expect(claudeChoice?.checked).toBe(true);
        });

        it('pre-selects cursor from config', () => {
          const cursorChoice = capturedChoices.find(
            (c) => c.value === 'cursor',
          );
          expect(cursorChoice?.checked).toBe(true);
        });

        it('does not pre-select other agents', () => {
          const copilotChoice = capturedChoices.find(
            (c) => c.value === 'copilot',
          );
          expect(copilotChoice?.checked).toBe(false);
        });

        it('does not call detectAgentArtifacts', () => {
          expect(
            mockAgentDetectionService.detectAgentArtifacts,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when agents include non-selectable agent', () => {
        let capturedChoices: { value: CodingAgent; checked: boolean }[];

        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: ['claude', 'packmind'] as CodingAgent[],
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockImplementation(
            async (
              questions: {
                choices: { value: CodingAgent; checked: boolean }[];
              }[],
            ) => {
              capturedChoices = questions[0].choices;
              return { selectedAgents: ['claude'] };
            },
          );

          await configAgentsHandler(deps);
        });

        it('pre-selects only selectable agents from config', () => {
          const claudeChoice = capturedChoices.find(
            (c) => c.value === 'claude',
          );
          expect(claudeChoice?.checked).toBe(true);
        });

        it('does not include packmind in choices', () => {
          const packmindChoice = capturedChoices.find(
            (c) => c.value === 'packmind',
          );
          expect(packmindChoice).toBeUndefined();
        });
      });

      describe('when agents field is empty array', () => {
        let capturedChoices: { value: CodingAgent; checked: boolean }[];

        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: [],
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([
            { agent: 'cursor', artifactPath: '/project/.cursor' },
          ]);

          mockInquirerPrompt.mockImplementation(
            async (
              questions: {
                choices: { value: CodingAgent; checked: boolean }[];
              }[],
            ) => {
              capturedChoices = questions[0].choices;
              return { selectedAgents: [] };
            },
          );

          await configAgentsHandler(deps);
        });

        it('falls back to detected artifacts', () => {
          expect(
            mockAgentDetectionService.detectAgentArtifacts,
          ).toHaveBeenCalledWith('/project');
        });

        it('pre-selects cursor from detected artifacts', () => {
          const cursorChoice = capturedChoices.find(
            (c) => c.value === 'cursor',
          );
          expect(cursorChoice?.checked).toBe(true);
        });
      });
    });

    describe('when config has no agents field', () => {
      describe('when artifacts are detected', () => {
        let capturedChoices: { value: CodingAgent; checked: boolean }[];

        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([
            { agent: 'claude', artifactPath: '/project/.claude' },
            {
              agent: 'copilot',
              artifactPath: '/project/.github/copilot-instructions.md',
            },
          ]);

          mockInquirerPrompt.mockImplementation(
            async (
              questions: {
                choices: { value: CodingAgent; checked: boolean }[];
              }[],
            ) => {
              capturedChoices = questions[0].choices;
              return { selectedAgents: ['claude', 'copilot'] };
            },
          );

          await configAgentsHandler(deps);
        });

        it('calls detectAgentArtifacts with base directory', () => {
          expect(
            mockAgentDetectionService.detectAgentArtifacts,
          ).toHaveBeenCalledWith('/project');
        });

        it('pre-selects claude from detected artifacts', () => {
          const claudeChoice = capturedChoices.find(
            (c) => c.value === 'claude',
          );
          expect(claudeChoice?.checked).toBe(true);
        });

        it('pre-selects copilot from detected artifacts', () => {
          const copilotChoice = capturedChoices.find(
            (c) => c.value === 'copilot',
          );
          expect(copilotChoice?.checked).toBe(true);
        });

        it('does not pre-select cursor without artifact', () => {
          const cursorChoice = capturedChoices.find(
            (c) => c.value === 'cursor',
          );
          expect(cursorChoice?.checked).toBe(false);
        });
      });

      describe('when no artifacts are detected', () => {
        let capturedChoices: { value: CodingAgent; checked: boolean }[];

        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockImplementation(
            async (
              questions: {
                choices: { value: CodingAgent; checked: boolean }[];
              }[],
            ) => {
              capturedChoices = questions[0].choices;
              return { selectedAgents: [] };
            },
          );

          await configAgentsHandler(deps);
        });

        it('does not pre-select any agents', () => {
          const checkedAgents = capturedChoices.filter((c) => c.checked);
          expect(checkedAgents).toHaveLength(0);
        });
      });
    });

    describe('when no config exists', () => {
      let capturedChoices: { value: CodingAgent; checked: boolean }[];

      beforeEach(async () => {
        mockConfigRepository.readConfig.mockResolvedValue(null);
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([
          { agent: 'junie', artifactPath: '/project/.junie' },
        ]);

        mockInquirerPrompt.mockImplementation(
          async (
            questions: {
              choices: { value: CodingAgent; checked: boolean }[];
            }[],
          ) => {
            capturedChoices = questions[0].choices;
            return { selectedAgents: ['junie'] };
          },
        );

        await configAgentsHandler(deps);
      });

      it('uses detected artifacts for pre-selection', () => {
        expect(
          mockAgentDetectionService.detectAgentArtifacts,
        ).toHaveBeenCalledWith('/project');
      });

      it('pre-selects junie from detected artifacts', () => {
        const junieChoice = capturedChoices.find((c) => c.value === 'junie');
        expect(junieChoice?.checked).toBe(true);
      });
    });

    describe('when saving selected agents', () => {
      describe('when multiple agents are selected', () => {
        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockResolvedValue({
            selectedAgents: ['claude', 'cursor', 'copilot'],
          });

          await configAgentsHandler(deps);
        });

        it('calls updateAgentsConfig with selected agents', () => {
          expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
            '/project',
            ['claude', 'cursor', 'copilot'],
          );
        });

        it('displays Claude Code in success message', () => {
          expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
            expect.stringContaining('Claude Code'),
          );
        });

        it('displays Cursor in success message', () => {
          expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
            expect.stringContaining('Cursor'),
          );
        });

        it('displays GitHub Copilot in success message', () => {
          expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
            expect.stringContaining('GitHub Copilot'),
          );
        });
      });

      describe('when empty selection is saved', () => {
        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockResolvedValue({
            selectedAgents: [],
          });

          await configAgentsHandler(deps);
        });

        it('calls updateAgentsConfig with empty array', () => {
          expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
            '/project',
            [],
          );
        });

        it('displays no agents selected message', () => {
          expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
            expect.stringContaining('No agents selected'),
          );
        });

        it('displays packmind artifacts message', () => {
          expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
            expect.stringContaining('packmind artifacts'),
          );
        });
      });

      describe('when single agent is selected', () => {
        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

          mockInquirerPrompt.mockResolvedValue({
            selectedAgents: ['gitlab_duo'],
          });

          await configAgentsHandler(deps);
        });

        it('calls updateAgentsConfig with single agent', () => {
          expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
            '/project',
            ['gitlab_duo'],
          );
        });

        it('displays GitLab Duo in success message', () => {
          expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
            expect.stringContaining('GitLab Duo'),
          );
        });
      });
    });

    describe('when inquirer prompt message', () => {
      let capturedMessage: string;

      beforeEach(async () => {
        mockConfigRepository.readConfig.mockResolvedValue(null);
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

        mockInquirerPrompt.mockImplementation(
          async (questions: { message: string }[]) => {
            capturedMessage = questions[0].message;
            return { selectedAgents: [] };
          },
        );

        await configAgentsHandler(deps);
      });

      it('includes message that packmind is always active', () => {
        expect(capturedMessage).toContain('packmind is always active');
      });
    });
  });

  describe('when using simple prompt mode', () => {
    let mockRlInterface: {
      question: jest.Mock;
      close: jest.Mock;
    };
    let mockInput: { destroy: jest.Mock };
    let mockOutput: { write: jest.Mock; destroy: jest.Mock };

    beforeEach(() => {
      mockRlInterface = {
        question: jest.fn(),
        close: jest.fn(),
      };
      mockInput = { close: jest.fn() };
      mockOutput = { write: jest.fn(), close: jest.fn() };

      mockReadline.createInterface.mockReturnValue(
        mockRlInterface as unknown as readline.Interface,
      );
      mockFs.createReadStream.mockReturnValue(
        mockInput as unknown as fs.ReadStream,
      );
      mockFs.createWriteStream.mockReturnValue(
        mockOutput as unknown as fs.WriteStream,
      );
    });

    describe('when PACKMIND_SIMPLE_PROMPT is set', () => {
      beforeEach(async () => {
        process.env.PACKMIND_SIMPLE_PROMPT = '1';
        deps.isTTY = true;
        mockConfigRepository.readConfig.mockResolvedValue(null);
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback('1,2');
          },
        );

        await configAgentsHandler(deps);
      });

      it('uses readline createInterface', () => {
        expect(mockReadline.createInterface).toHaveBeenCalled();
      });

      it('does not call inquirer prompt', () => {
        expect(mockInquirerPrompt).not.toHaveBeenCalled();
      });
    });

    describe('when isTTY is false', () => {
      beforeEach(async () => {
        deps.isTTY = false;
        mockConfigRepository.readConfig.mockResolvedValue(null);
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback('1');
          },
        );

        await configAgentsHandler(deps);
      });

      it('uses readline createInterface', () => {
        expect(mockReadline.createInterface).toHaveBeenCalled();
      });

      it('does not call inquirer prompt', () => {
        expect(mockInquirerPrompt).not.toHaveBeenCalled();
      });
    });

    describe('when selecting agents via readline', () => {
      beforeEach(() => {
        deps.isTTY = false;
        mockConfigRepository.readConfig.mockResolvedValue(null);
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);
      });

      it('parses comma-separated numbers correctly', async () => {
        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback('1,3,5');
          },
        );

        await configAgentsHandler(deps);

        // SELECTABLE_AGENTS[0]=claude, [2]=copilot, [4]=junie
        expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
          '/project',
          ['claude', 'copilot', 'junie'],
        );
      });

      it('handles whitespace in input', async () => {
        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback(' 1 , 2 ');
          },
        );

        await configAgentsHandler(deps);

        expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
          '/project',
          ['claude', 'cursor'],
        );
      });

      it('ignores invalid numbers', async () => {
        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback('1,abc,2,99');
          },
        );

        await configAgentsHandler(deps);

        expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
          '/project',
          ['claude', 'cursor'],
        );
      });

      describe('when input is empty', () => {
        beforeEach(async () => {
          mockConfigRepository.readConfig.mockResolvedValue(null);
          mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([
            { agent: 'claude', artifactPath: '/project/.claude' },
          ]);

          mockRlInterface.question.mockImplementation(
            (_: string, callback: (answer: string) => void) => {
              callback('');
            },
          );

          await configAgentsHandler(deps);
        });

        it('uses default preselected agents', () => {
          expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
            '/project',
            ['claude'],
          );
        });
      });

      it('displays agent list with pre-selection markers', async () => {
        mockConfigRepository.readConfig.mockResolvedValue({
          packages: {},
          agents: ['claude'],
        });
        mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

        mockRlInterface.question.mockImplementation(
          (_: string, callback: (answer: string) => void) => {
            callback('1');
          },
        );

        await configAgentsHandler(deps);

        // Verify output includes markers (now using process.stdout)
        expect(process.stdout.write).toHaveBeenCalledWith(
          expect.stringContaining('[*]'),
        );
      });

      describe('when cleanup', () => {
        beforeEach(async () => {
          mockRlInterface.question.mockImplementation(
            (_: string, callback: (answer: string) => void) => {
              callback('1');
            },
          );

          await configAgentsHandler(deps);
        });

        it('closes readline interface', () => {
          expect(mockRlInterface.close).toHaveBeenCalled();
        });
      });
    });
  });

  describe('when building choices for prompt', () => {
    let capturedChoices: {
      name: string;
      value: CodingAgent;
      checked: boolean;
    }[];

    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue(null);
      mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

      mockInquirerPrompt.mockImplementation(
        async (
          questions: {
            choices: { name: string; value: CodingAgent; checked: boolean }[];
          }[],
        ) => {
          capturedChoices = questions[0].choices;
          return { selectedAgents: [] };
        },
      );

      await configAgentsHandler(deps);
    });

    it('includes all selectable agents', () => {
      expect(capturedChoices).toHaveLength(SELECTABLE_AGENTS.length);
    });

    it('sets correct display name for claude', () => {
      const choice = capturedChoices.find((c) => c.value === 'claude');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.claude);
    });

    it('sets correct display name for cursor', () => {
      const choice = capturedChoices.find((c) => c.value === 'cursor');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.cursor);
    });

    it('sets correct display name for copilot', () => {
      const choice = capturedChoices.find((c) => c.value === 'copilot');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.copilot);
    });

    it('sets correct display name for continue', () => {
      const choice = capturedChoices.find((c) => c.value === 'continue');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.continue);
    });

    it('sets correct display name for junie', () => {
      const choice = capturedChoices.find((c) => c.value === 'junie');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.junie);
    });

    it('sets correct display name for agents_md', () => {
      const choice = capturedChoices.find((c) => c.value === 'agents_md');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.agents_md);
    });

    it('sets correct display name for gitlab_duo', () => {
      const choice = capturedChoices.find((c) => c.value === 'gitlab_duo');
      expect(choice?.name).toBe(AGENT_DISPLAY_NAMES.gitlab_duo);
    });

    it('preserves agent order from SELECTABLE_AGENTS', () => {
      const values = capturedChoices.map((c) => c.value);
      expect(values).toEqual(SELECTABLE_AGENTS);
    });
  });

  describe('when reading config', () => {
    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: { backend: '*' },
      });
      mockAgentDetectionService.detectAgentArtifacts.mockResolvedValue([]);

      mockInquirerPrompt.mockResolvedValue({
        selectedAgents: [],
      });

      await configAgentsHandler(deps);
    });

    it('calls readConfig with base directory', () => {
      expect(mockConfigRepository.readConfig).toHaveBeenCalledWith('/project');
    });
  });
});
