import AdmZip from 'adm-zip';
import { stubLogger } from '@packmind/test-utils';
import {
  DeployDefaultSkillsResponse,
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse,
  IAccountsPort,
  Organization,
  OrganizationId,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DeployDefaultSkillsUseCase } from './DeployDefaultSkillsUseCase';
import { DownloadDefaultSkillsZipFileUseCase } from './DownloadDefaultSkillsZipFileUseCase';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
});

describe('DownloadDefaultSkillsZipFileUseCase', () => {
  let deployDefaultSkillsUseCase: jest.Mocked<DeployDefaultSkillsUseCase>;
  let accountsPort: {
    getUserById: jest.Mock;
    getOrganizationById: jest.Mock;
  };
  let useCase: DownloadDefaultSkillsZipFileUseCase;
  let command: DownloadDefaultSkillsZipFileCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    deployDefaultSkillsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeployDefaultSkillsUseCase>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    };

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
    };

    accountsPort.getOrganizationById.mockResolvedValue(organization);
    accountsPort.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    useCase = new DownloadDefaultSkillsZipFileUseCase(
      deployDefaultSkillsUseCase,
      accountsPort as unknown as IAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when default skills are available', () => {
    let result: DownloadDefaultSkillsZipFileResponse;
    const fileUpdates: DeployDefaultSkillsResponse = {
      fileUpdates: {
        createOrUpdate: [
          {
            path: '.claude/skills/packmind/skill-creator/SKILL.md',
            content: '# Skill Creator',
          },
          {
            path: '.claude/skills/packmind/skill-creator/scripts/init.py',
            content: 'print("hello")',
          },
        ],
        delete: [],
      },
    };

    beforeEach(async () => {
      deployDefaultSkillsUseCase.execute.mockResolvedValue(fileUpdates);
      result = await useCase.execute(command);
    });

    it('returns packmind-default-skills.zip as file name', () => {
      expect(result.fileName).toBe('packmind-default-skills.zip');
    });

    it('returns base64 encoded content', () => {
      expect(() => Buffer.from(result.fileContent, 'base64')).not.toThrow();
    });

    it('creates a valid zip file', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      expect(entries).toHaveLength(2);
    });

    it('includes skill file with correct path', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const entry = zip.getEntry(
        '.claude/skills/packmind/skill-creator/SKILL.md',
      );

      expect(entry).toBeDefined();
    });

    it('includes skill file with correct content', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const content = zip.readAsText(
        '.claude/skills/packmind/skill-creator/SKILL.md',
      );

      expect(content).toBe('# Skill Creator');
    });

    it('includes script file with correct path', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const entry = zip.getEntry(
        '.claude/skills/packmind/skill-creator/scripts/init.py',
      );

      expect(entry).toBeDefined();
    });

    it('includes script file with correct content', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const content = zip.readAsText(
        '.claude/skills/packmind/skill-creator/scripts/init.py',
      );

      expect(content).toBe('print("hello")');
    });

    it('calls deployDefaultSkillsUseCase with command', () => {
      expect(deployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    });
  });

  describe('when no default skills are available', () => {
    let result: DownloadDefaultSkillsZipFileResponse;

    beforeEach(async () => {
      deployDefaultSkillsUseCase.execute.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
          delete: [],
        },
      });
      result = await useCase.execute(command);
    });

    it('returns packmind-default-skills.zip as file name', () => {
      expect(result.fileName).toBe('packmind-default-skills.zip');
    });

    it('returns base64 encoded content', () => {
      expect(() => Buffer.from(result.fileContent, 'base64')).not.toThrow();
    });

    it('creates an empty zip file', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      expect(entries).toHaveLength(0);
    });
  });

  describe('when files contain base64 encoded content', () => {
    let result: DownloadDefaultSkillsZipFileResponse;
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString(
      'base64',
    );

    beforeEach(async () => {
      deployDefaultSkillsUseCase.execute.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'image.png',
              content: binaryContent,
              isBase64: true,
            },
          ],
          delete: [],
        },
      });
      result = await useCase.execute(command);
    });

    it('correctly decodes base64 content in zip', () => {
      const buffer = Buffer.from(result.fileContent, 'base64');
      const zip = new AdmZip(buffer);
      const fileBuffer = zip.readFile('image.png');

      expect(fileBuffer).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
  });
});
