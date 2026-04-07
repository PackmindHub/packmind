import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISpacesPort,
  JoinSpaceCommand,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { JoinSpaceUseCase } from './JoinSpaceUseCase';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

describe('JoinSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  let useCase: JoinSpaceUseCase;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'getSpaceById' | 'findMembership' | 'addSpaceMembership'>
  >;

  const buildCommand = (
    overrides?: Partial<JoinSpaceCommand>,
  ): JoinSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId: spaceId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn(),
      addSpaceMembership: jest.fn(),
    };
    useCase = new JoinSpaceUseCase(spacesPort as unknown as ISpacesPort);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when joining an open space successfully', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue(null);
      spacesPort.addSpaceMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('adds the user as a member', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not add a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the space belongs to another organization', () => {
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      name: 'Other Org Space',
      organizationId: createOrganizationId('other-org'),
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(otherOrgSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is private', () => {
    const privateSpace = spaceFactory({
      id: spaceId,
      name: 'Private Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(privateSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is restricted', () => {
    const restrictedSpace = spaceFactory({
      id: spaceId,
      name: 'Restricted Space',
      organizationId,
      type: SpaceType.restricted,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(restrictedSpace);
    });

    it('throws SpaceNotJoinableError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotJoinableError,
      );
    });
  });

  describe('when the user is already a member', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('does not add a duplicate membership', async () => {
      await useCase.execute(buildCommand());
      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });
});
