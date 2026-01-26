import AdmZip from 'adm-zip';
import { ICodingAgentDeployer } from '@packmind/coding-agent';
import {
  CodingAgent,
  DownloadDefaultSkillsZipForAgentResponse,
  FileUpdates,
  ICodingAgentDeployerRegistry,
  ICodingAgentPort,
} from '@packmind/types';
import { DownloadDefaultSkillsZipForAgentUseCase } from './DownloadDefaultSkillsZipForAgentUseCase';

type MockDeployer = ICodingAgentDeployer & {
  deployDefaultSkills: jest.Mock;
};

describe('DownloadDefaultSkillsZipForAgentUseCase', () => {
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let deployerRegistry: jest.Mocked<ICodingAgentDeployerRegistry>;
  let deployer: MockDeployer;
  let useCase: DownloadDefaultSkillsZipForAgentUseCase;

  beforeEach(() => {
    deployer = {
      deployDefaultSkills: jest.fn(),
    } as unknown as MockDeployer;

    deployerRegistry = {
      getDeployer: jest.fn().mockReturnValue(deployer),
    } as unknown as jest.Mocked<ICodingAgentDeployerRegistry>;

    codingAgentPort = {
      getDeployerRegistry: jest.fn().mockReturnValue(deployerRegistry),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    useCase = new DownloadDefaultSkillsZipForAgentUseCase(codingAgentPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when agent is claude', () => {
    const agent: CodingAgent = 'claude';
    const command = { agent };

    describe('when default skills are available', () => {
      let result: DownloadDefaultSkillsZipForAgentResponse;
      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.claude/skills/packmind-create-skill/SKILL.md',
            content: '# Create Skill',
          },
          {
            path: '.claude/skills/packmind-create-skill/scripts/init.py',
            content: 'print("hello")',
          },
        ],
        delete: [],
      };

      beforeEach(async () => {
        deployer.deployDefaultSkills.mockResolvedValue(fileUpdates);
        result = await useCase.execute(command);
      });

      it('returns packmind-claude-default-skills.zip as file name', () => {
        expect(result.fileName).toBe('packmind-claude-default-skills.zip');
      });

      it('returns base64 encoded content', () => {
        expect(() => Buffer.from(result.fileContent, 'base64')).not.toThrow();
      });

      it('creates a valid zip file with README and skill files', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();

        expect(entries).toHaveLength(3);
      });

      it('includes README.md file', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entry = zip.getEntry('README.md');

        expect(entry).toBeDefined();
      });

      it('includes README.md with agent-specific content', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const content = zip.readAsText('README.md');

        expect(content).toContain('Packmind Default Skills for Claude');
      });

      it('includes skill file with correct path', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entry = zip.getEntry(
          '.claude/skills/packmind-create-skill/SKILL.md',
        );

        expect(entry).toBeDefined();
      });

      it('includes skill file with correct content', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const content = zip.readAsText(
          '.claude/skills/packmind-create-skill/SKILL.md',
        );

        expect(content).toBe('# Create Skill');
      });

      it('includes script file with correct path', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entry = zip.getEntry(
          '.claude/skills/packmind-create-skill/scripts/init.py',
        );

        expect(entry).toBeDefined();
      });

      it('includes script file with correct content', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const content = zip.readAsText(
          '.claude/skills/packmind-create-skill/scripts/init.py',
        );

        expect(content).toBe('print("hello")');
      });

      it('retrieves deployer for claude', () => {
        expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
      });
    });

    describe('when no default skills are available', () => {
      let result: DownloadDefaultSkillsZipForAgentResponse;

      beforeEach(async () => {
        deployer.deployDefaultSkills.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        });
        result = await useCase.execute(command);
      });

      it('returns packmind-claude-default-skills.zip as file name', () => {
        expect(result.fileName).toBe('packmind-claude-default-skills.zip');
      });

      it('creates a zip file with only README', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();

        expect(entries).toHaveLength(1);
      });

      it('includes README.md file', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entry = zip.getEntry('README.md');

        expect(entry).toBeDefined();
      });
    });

    describe('when deployer does not support default skills', () => {
      let result: DownloadDefaultSkillsZipForAgentResponse;

      beforeEach(async () => {
        deployer.deployDefaultSkills = undefined;
        result = await useCase.execute(command);
      });

      it('returns packmind-claude-default-skills.zip as file name', () => {
        expect(result.fileName).toBe('packmind-claude-default-skills.zip');
      });

      it('returns empty file content', () => {
        expect(result.fileContent).toBe('');
      });
    });
  });

  describe('when agent is copilot', () => {
    const agent: CodingAgent = 'copilot';
    const command = { agent };

    describe('when default skills are available', () => {
      let result: DownloadDefaultSkillsZipForAgentResponse;
      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.github/skills/packmind-create-skill/SKILL.md',
            content: '# Create Skill for Copilot',
          },
        ],
        delete: [],
      };

      beforeEach(async () => {
        deployer.deployDefaultSkills.mockResolvedValue(fileUpdates);
        result = await useCase.execute(command);
      });

      it('returns packmind-copilot-default-skills.zip as file name', () => {
        expect(result.fileName).toBe('packmind-copilot-default-skills.zip');
      });

      it('retrieves deployer for copilot', () => {
        expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('copilot');
      });

      it('includes skill file with correct copilot path', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const entry = zip.getEntry(
          '.github/skills/packmind-create-skill/SKILL.md',
        );

        expect(entry).toBeDefined();
      });

      it('includes README.md with copilot-specific content', () => {
        const buffer = Buffer.from(result.fileContent, 'base64');
        const zip = new AdmZip(buffer);
        const content = zip.readAsText('README.md');

        expect(content).toContain('Packmind Default Skills for Copilot');
      });
    });
  });

  describe('when files contain base64 encoded content', () => {
    let result: DownloadDefaultSkillsZipForAgentResponse;
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString(
      'base64',
    );

    beforeEach(async () => {
      deployer.deployDefaultSkills.mockResolvedValue({
        createOrUpdate: [
          {
            path: 'image.png',
            content: binaryContent,
            isBase64: true,
          },
        ],
        delete: [],
      });
      result = await useCase.execute({ agent: 'claude' });
    });

    it('correctly decodes base64 content in zip', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const fileBuffer = zip.readFile('image.png');

      expect(fileBuffer).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
  });
});
