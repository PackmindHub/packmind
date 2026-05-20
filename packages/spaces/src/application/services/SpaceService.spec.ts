import { SpaceSlugConflictError } from '../../domain/errors/SpaceSlugConflictError';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { spaceFactory } from '../../../test/spaceFactory';
import { SpaceService } from './SpaceService';

describe('SpaceService.updateSpace', () => {
  let repo: jest.Mocked<ISpaceRepository>;
  let service: SpaceService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOrganizationId: jest.fn(),
      add: jest.fn(),
      updateFields: jest.fn(),
      deleteById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<ISpaceRepository>;
    service = new SpaceService(repo);
  });

  describe('when updating only the name', () => {
    const space = spaceFactory({ name: 'secrurity', slug: 'secrurity' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.findBySlug.mockResolvedValue(null);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('persists the new name', async () => {
      const result = await service.updateSpace(space.id, { name: 'security' });

      expect(result.name).toBe('security');
    });

    it('does not update the slug', async () => {
      await service.updateSpace(space.id, { name: 'security' });

      expect(repo.updateFields).toHaveBeenCalledWith(
        space.id,
        expect.not.objectContaining({ slug: expect.anything() }),
      );
    });
  });

  describe('when renaming to a name whose slug collides with another space', () => {
    const target = spaceFactory({
      name: 'Security Connections',
      slug: 'security-connections',
    });
    const other = spaceFactory({
      organizationId: target.organizationId,
      name: 'Security',
      slug: 'security',
    });

    beforeEach(() => {
      repo.findById.mockResolvedValue(target);
      repo.findBySlug.mockResolvedValue(other);
    });

    it('throws SpaceSlugConflictError', async () => {
      await expect(
        service.updateSpace(target.id, { name: 'Security' }),
      ).rejects.toBeInstanceOf(SpaceSlugConflictError);
    });
  });

  describe('when renaming to a name whose slug equals its own slug', () => {
    const space = spaceFactory({ name: 'Security', slug: 'security' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.findBySlug.mockResolvedValue(space);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('allows the update', async () => {
      const result = await service.updateSpace(space.id, { name: 'security' });

      expect(result.name).toBe('security');
    });
  });

  describe('when updating the color', () => {
    const space = spaceFactory({ color: 'blue' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('persists the new color', async () => {
      const result = await service.updateSpace(space.id, { color: 'purple' });

      expect(result.color).toBe('purple');
    });
  });
});
