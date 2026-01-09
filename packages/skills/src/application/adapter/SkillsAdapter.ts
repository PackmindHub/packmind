import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CreateSkillCommand,
  DeleteSkillCommand,
  FindSkillBySlugCommand,
  GetLatestSkillVersionCommand,
  GetSkillByIdCommand,
  GetSkillVersionCommand,
  GetSkillWithFilesCommand,
  GetSkillWithFilesResponse,
  IAccountsPort,
  IAccountsPortName,
  ISkillsPort,
  ISpacesPort,
  ISpacesPortName,
  ListSkillsBySpaceCommand,
  ListSkillVersionsCommand,
  ListSkillVersionsResponse,
  OrganizationId,
  Skill,
  SkillFile,
  SkillId,
  SkillVersion,
  SkillVersionId,
  SpaceId,
  UpdateSkillCommand,
  UploadSkillCommand,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { SkillsServices } from '../services/SkillsServices';
import { CreateSkillUsecase } from '../useCases/createSkill/createSkill.usecase';
import { DeleteSkillUsecase } from '../useCases/deleteSkill/deleteSkill.usecase';
import { FindSkillBySlugUsecase } from '../useCases/findSkillBySlug/findSkillBySlug.usecase';
import { GetLatestSkillVersionUsecase } from '../useCases/getLatestSkillVersion/getLatestSkillVersion.usecase';
import { GetSkillByIdUsecase } from '../useCases/getSkillById/getSkillById.usecase';
import { GetSkillVersionUsecase } from '../useCases/getSkillVersion/getSkillVersion.usecase';
import { GetSkillWithFilesUsecase } from '../useCases/getSkillWithFiles/getSkillWithFiles.usecase';
import { ListSkillsBySpaceUsecase } from '../useCases/listSkillsBySpace/listSkillsBySpace.usecase';
import { ListSkillVersionsUsecase } from '../useCases/listSkillVersions/listSkillVersions.usecase';
import { UpdateSkillUsecase } from '../useCases/updateSkill/updateSkill.usecase';
import { UploadSkillUsecase } from '../useCases/uploadSkill/uploadSkill.usecase';

const origin = 'SkillsAdapter';

export class SkillsAdapter implements IBaseAdapter<ISkillsPort>, ISkillsPort {
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private eventEmitterService: PackmindEventEmitterService | null = null;

  // Use cases - all initialized in initialize()
  private _createSkill!: CreateSkillUsecase;
  private _uploadSkill!: UploadSkillUsecase;
  private _updateSkill!: UpdateSkillUsecase;
  private _deleteSkill!: DeleteSkillUsecase;
  private _getSkillById!: GetSkillByIdUsecase;
  private _getSkillWithFiles!: GetSkillWithFilesUsecase;
  private _findSkillBySlug!: FindSkillBySlugUsecase;
  private _listSkillsBySpace!: ListSkillsBySpaceUsecase;
  private _getSkillVersion!: GetSkillVersionUsecase;
  private _getLatestSkillVersion!: GetLatestSkillVersionUsecase;
  private _listSkillVersions!: ListSkillVersionsUsecase;

  constructor(
    private readonly services: SkillsServices,
    private readonly repositories: ISkillsRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info(
      'SkillsAdapter constructed - awaiting initialization with ports',
    );
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All use cases are created here with non-null dependencies.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.logger.info('Initializing SkillsAdapter with ports and services');

    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.eventEmitterService = ports.eventEmitterService;

    if (!this.accountsPort || !this.spacesPort || !this.eventEmitterService) {
      throw new Error(
        'SkillsAdapter: Required ports/services not provided. Ensure eventEmitterService is passed to initialize().',
      );
    }

    // Create all use cases with non-null dependencies
    this._createSkill = new CreateSkillUsecase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.eventEmitterService,
    );

    this._uploadSkill = new UploadSkillUsecase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.repositories.getSkillFileRepository(),
      this.eventEmitterService,
    );

    this._updateSkill = new UpdateSkillUsecase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.eventEmitterService,
    );

    this._deleteSkill = new DeleteSkillUsecase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.eventEmitterService,
    );

    this._getSkillById = new GetSkillByIdUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._getSkillWithFiles = new GetSkillWithFilesUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.services.getSkillFileService(),
    );

    this._findSkillBySlug = new FindSkillBySlugUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._listSkillsBySpace = new ListSkillsBySpaceUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._getSkillVersion = new GetSkillVersionUsecase(
      this.accountsPort,
      this.services.getSkillVersionService(),
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._getLatestSkillVersion = new GetLatestSkillVersionUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.spacesPort,
    );

    this._listSkillVersions = new ListSkillVersionsUsecase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
    );

    this.logger.info('SkillsAdapter initialized successfully');
  }

  /**
   * Returns the port interface for cross-domain access.
   */
  public getPort(): ISkillsPort {
    return this as ISkillsPort;
  }

  /**
   * Checks if the adapter is ready with all required ports initialized.
   */
  public isReady(): boolean {
    return (
      this.accountsPort !== null &&
      this.spacesPort !== null &&
      this.eventEmitterService !== null
    );
  }

  // ========================================================================
  // ISkillsPort Implementation (Read-Only Operations for Cross-Domain)
  // ========================================================================

  async getSkill(id: SkillId): Promise<Skill | null> {
    this.logger.info('getSkill called via port', { skillId: id });
    return this.services.getSkillService().getSkillById(id);
  }

  async getSkillVersion(id: SkillVersionId): Promise<SkillVersion | null> {
    this.logger.info('getSkillVersion called via port', { versionId: id });
    return this.services.getSkillVersionService().getSkillVersionById(id);
  }

  async getLatestSkillVersion(skillId: SkillId): Promise<SkillVersion | null> {
    this.logger.info('getLatestSkillVersion called via port', { skillId });
    return this.services
      .getSkillVersionService()
      .getLatestSkillVersion(skillId);
  }

  async listSkillVersions(skillId: SkillId): Promise<SkillVersion[]> {
    this.logger.info('listSkillVersions called via port', { skillId });
    return this.services.getSkillVersionService().listSkillVersions(skillId);
  }

  async listSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<Skill[]> {
    this.logger.info('listSkillsBySpace called via port', {
      spaceId,
      organizationId,
      userId: userId.substring(0, 6) + '*',
    });
    return this.services.getSkillService().listSkillsBySpace(spaceId);
  }

  async findSkillBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null> {
    this.logger.info('findSkillBySlug called via port', {
      slug,
      organizationId,
    });
    return this.services
      .getSkillService()
      .findSkillBySlug(slug, organizationId);
  }

  async getSkillFiles(skillVersionId: SkillVersionId): Promise<SkillFile[]> {
    this.logger.info('getSkillFiles called via port', { skillVersionId });
    return this.repositories
      .getSkillFileRepository()
      .findBySkillVersionId(skillVersionId);
  }

  // ========================================================================
  // Public Use Case Methods (For Internal/Direct Usage)
  // ========================================================================

  async createSkill(command: CreateSkillCommand): Promise<Skill> {
    this.logger.info('createSkill use case invoked', {
      name: command.name,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this._createSkill.execute(command);
  }

  async uploadSkill(command: UploadSkillCommand): Promise<Skill> {
    this.logger.info('uploadSkill use case invoked', {
      fileCount: command.files.length,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._uploadSkill.execute(command);
  }

  async updateSkill(command: UpdateSkillCommand): Promise<Skill> {
    this.logger.info('updateSkill use case invoked', {
      skillId: command.skillId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._updateSkill.execute(command);
  }

  async deleteSkill(
    command: DeleteSkillCommand,
  ): Promise<{ success: boolean }> {
    this.logger.info('deleteSkill use case invoked', {
      skillId: command.skillId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    await this._deleteSkill.execute(command);
    return { success: true };
  }

  async getSkillById(
    command: GetSkillByIdCommand,
  ): Promise<{ skill: Skill | null }> {
    this.logger.info('getSkillById use case invoked', {
      skillId: command.skillId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._getSkillById.execute(command);
  }

  async findSkillBySlugUseCase(
    command: FindSkillBySlugCommand,
  ): Promise<{ skill: Skill | null }> {
    this.logger.info('findSkillBySlug use case invoked', {
      slug: command.slug,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._findSkillBySlug.execute(command);
  }

  async listSkillsBySpaceUseCase(
    command: ListSkillsBySpaceCommand,
  ): Promise<Skill[]> {
    this.logger.info('listSkillsBySpace use case invoked', {
      spaceId: command.spaceId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._listSkillsBySpace.execute(command);
  }

  async getSkillVersionUseCase(
    command: GetSkillVersionCommand,
  ): Promise<{ skillVersion: SkillVersion | null }> {
    this.logger.info('getSkillVersion use case invoked', {
      skillId: command.skillId,
      version: command.version,
      spaceId: command.spaceId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._getSkillVersion.execute(command);
  }

  async getLatestSkillVersionUseCase(
    command: GetLatestSkillVersionCommand,
  ): Promise<{ skillVersion: SkillVersion | null }> {
    this.logger.info('getLatestSkillVersion use case invoked', {
      skillId: command.skillId,
      spaceId: command.spaceId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._getLatestSkillVersion.execute(command);
  }

  async getSkillWithFilesUseCase(
    command: GetSkillWithFilesCommand,
  ): Promise<GetSkillWithFilesResponse> {
    this.logger.info('getSkillWithFiles use case invoked', {
      slug: command.slug,
      spaceId: command.spaceId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._getSkillWithFiles.execute(command);
  }

  async listSkillVersionsUseCase(
    command: ListSkillVersionsCommand,
  ): Promise<ListSkillVersionsResponse> {
    this.logger.info('listSkillVersions use case invoked', {
      skillId: command.skillId,
      spaceId: command.spaceId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._listSkillVersions.execute(command);
  }

  /**
   * Helper: Convert string IDs to branded types for internal use case calls.
   */
  public createSkillIdFromString(id: string): SkillId {
    return createSkillId(id);
  }

  public createSkillVersionIdFromString(id: string): SkillVersionId {
    return createSkillVersionId(id);
  }

  public createUserIdFromString(id: string) {
    return createUserId(id);
  }
}
