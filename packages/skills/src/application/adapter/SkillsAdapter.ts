import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CreateSkillCommand,
  DeleteSkillCommand,
  DeleteSkillsBatchCommand,
  DeleteSkillsBatchResponse,
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
  QueryOption,
  SaveSkillVersionCommand,
  Skill,
  SkillFile,
  SkillId,
  SkillVersion,
  SkillVersionId,
  SpaceId,
  UpdateSkillCommand,
  UploadSkillCommand,
  UserId,
  UploadSkillResponse,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { SkillsServices } from '../services/SkillsServices';
import { CreateSkillUseCase } from '../useCases/createSkill/CreateSkillUseCase';
import { DeleteSkillUseCase } from '../useCases/deleteSkill/DeleteSkillUseCase';
import { DeleteSkillsBatchUseCase } from '../useCases/deleteSkillsBatch/DeleteSkillsBatchUseCase';
import { FindSkillBySlugUseCase } from '../useCases/findSkillBySlug/FindSkillBySlugUseCase';
import { GetLatestSkillVersionUseCase } from '../useCases/getLatestSkillVersion/GetLatestSkillVersionUseCase';
import { GetSkillByIdUseCase } from '../useCases/getSkillById/GetSkillByIdUseCase';
import { GetSkillVersionUseCase } from '../useCases/getSkillVersion/GetSkillVersionUseCase';
import { GetSkillWithFilesUseCase } from '../useCases/getSkillWithFiles/GetSkillWithFilesUseCase';
import { ListSkillsBySpaceUseCase } from '../useCases/listSkillsBySpace/ListSkillsBySpaceUseCase';
import { ListSkillVersionsUseCase } from '../useCases/listSkillVersions/ListSkillVersionsUseCase';
import { SaveSkillVersionUseCase } from '../useCases/saveSkillVersion/SaveSkillVersionUseCase';
import { UpdateSkillUseCase } from '../useCases/updateSkill/UpdateSkillUseCase';
import { UploadSkillUseCase } from '../useCases/uploadSkill/UploadSkillUseCase';

const origin = 'SkillsAdapter';

export class SkillsAdapter implements IBaseAdapter<ISkillsPort>, ISkillsPort {
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private eventEmitterService: PackmindEventEmitterService | null = null;

  // Use cases - all initialized in initialize()
  private _createSkill!: CreateSkillUseCase;
  private _uploadSkill!: UploadSkillUseCase;
  private _updateSkill!: UpdateSkillUseCase;
  private _deleteSkill!: DeleteSkillUseCase;
  private _deleteSkillsBatch!: DeleteSkillsBatchUseCase;
  private _getSkillById!: GetSkillByIdUseCase;
  private _getSkillWithFiles!: GetSkillWithFilesUseCase;
  private _findSkillBySlug!: FindSkillBySlugUseCase;
  private _listSkillsBySpace!: ListSkillsBySpaceUseCase;
  private _getSkillVersion!: GetSkillVersionUseCase;
  private _getLatestSkillVersion!: GetLatestSkillVersionUseCase;
  private _listSkillVersions!: ListSkillVersionsUseCase;
  private _saveSkillVersion!: SaveSkillVersionUseCase;

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
    this._createSkill = new CreateSkillUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.eventEmitterService,
    );

    this._uploadSkill = new UploadSkillUseCase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.repositories.getSkillFileRepository(),
      this.eventEmitterService,
    );

    this._updateSkill = new UpdateSkillUseCase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.eventEmitterService,
    );

    this._deleteSkill = new DeleteSkillUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getSkillService(),
      this.eventEmitterService,
    );

    this._deleteSkillsBatch = new DeleteSkillsBatchUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getSkillService(),
      this.eventEmitterService,
    );

    this._getSkillById = new GetSkillByIdUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getSkillService(),
    );

    this._getSkillWithFiles = new GetSkillWithFilesUseCase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.services.getSkillFileService(),
    );

    this._findSkillBySlug = new FindSkillBySlugUseCase(
      this.accountsPort,
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._listSkillsBySpace = new ListSkillsBySpaceUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getSkillService(),
    );

    this._getSkillVersion = new GetSkillVersionUseCase(
      this.accountsPort,
      this.services.getSkillVersionService(),
      this.services.getSkillService(),
      this.spacesPort,
    );

    this._getLatestSkillVersion = new GetLatestSkillVersionUseCase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.spacesPort,
    );

    this._listSkillVersions = new ListSkillVersionsUseCase(
      this.accountsPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
    );

    this._saveSkillVersion = new SaveSkillVersionUseCase(
      this.accountsPort,
      this.spacesPort,
      this.services.getSkillService(),
      this.services.getSkillVersionService(),
      this.services.getSkillFileService(),
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

  /**
   * Batch read of skills by IDs (mirrors getSkill for a set of IDs) so
   * cross-domain package hydration avoids per-id fan-out.
   */
  async getSkillsByIds(ids: SkillId[]): Promise<Skill[]> {
    this.logger.info('getSkillsByIds called via port', { count: ids.length });
    return this.services.getSkillService().getSkillsByIds(ids);
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

  async getSkillVersionByNumber(
    skillId: SkillId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<SkillVersion | null> {
    this.logger.info('getSkillVersionByNumber called via port', {
      skillId,
      version,
    });
    return this.services
      .getSkillVersionService()
      .getSkillVersion(skillId, version, allowedSpaceIds);
  }

  async listSkillVersions(skillId: SkillId): Promise<SkillVersion[]> {
    this.logger.info('listSkillVersions called via port', { skillId });
    return this.services.getSkillVersionService().listSkillVersions(skillId);
  }

  async listSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]> {
    this.logger.info('listSkillsBySpace called via port', {
      spaceId,
      organizationId,
      userId: userId.substring(0, 6) + '*',
      includeDeleted: opts?.includeDeleted ?? false,
    });
    return this._listSkillsBySpace.execute({
      spaceId,
      organizationId,
      userId,
      includeDeleted: opts?.includeDeleted ?? false,
    });
  }

  /**
   * List all skills across every space of an organization, bypassing space
   * membership checks. Used for organization-scoped aggregations where the
   * caller is already authorized at the organization level.
   */
  async listAllSkillsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Skill[]> {
    if (!this.spacesPort) {
      this.logger.warn('SpacesPort not available, returning empty results');
      return [];
    }

    const spaces =
      await this.spacesPort.listSpacesByOrganization(organizationId);
    const skillsPerSpace = await Promise.all(
      spaces.map((space) =>
        this.services.getSkillService().listSkillsBySpace(space.id),
      ),
    );
    return skillsPerSpace.flat();
  }

  public countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
    return this.services.getSkillService().countBySpaceIds(spaceIds);
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

  async saveSkillVersion(
    command: SaveSkillVersionCommand,
  ): Promise<SkillVersion> {
    this.logger.info('saveSkillVersion called via port', {
      skillId: command.skillVersion.skillId,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._saveSkillVersion.execute(command);
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

  async uploadSkill(command: UploadSkillCommand): Promise<UploadSkillResponse> {
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

  async deleteSkillsBatch(
    command: DeleteSkillsBatchCommand,
  ): Promise<DeleteSkillsBatchResponse> {
    this.logger.info('deleteSkillsBatch use case invoked', {
      skillCount: command.skillIds.length,
      userId: command.userId.substring(0, 6) + '*',
      organizationId: command.organizationId,
    });
    return this._deleteSkillsBatch.execute(command);
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

  async duplicateSkillToSpace(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Skill> {
    return this.services
      .getSkillService()
      .duplicateSkillToSpace(skillId, destinationSpaceId, newUserId);
  }

  async markSkillAsMoved(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    return this.services
      .getSkillService()
      .markSkillAsMoved(skillId, destinationSpaceId);
  }

  async hardDeleteSkill(skillId: SkillId): Promise<void> {
    this.logger.info('Hard deleting skill', { skillId });
    await this.services.getSkillService().hardDeleteSkill(skillId);
  }

  async hardDeleteSkillVersion(versionId: SkillVersionId): Promise<void> {
    this.logger.info('Hard deleting skill version', { versionId });
    await this.services.getSkillService().hardDeleteSkillVersion(versionId);
  }
}
