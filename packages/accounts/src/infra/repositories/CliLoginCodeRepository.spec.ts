import { DataSource } from 'typeorm';
import { CliLoginCodeRepository } from './CliLoginCodeRepository';
import {
  CliLoginCode,
  createCliLoginCodeId,
  createCliLoginCodeToken,
} from '../../domain/entities/CliLoginCode';
import { createUserId, createOrganizationId } from '@packmind/types';
import { CliLoginCodeSchema } from '../schemas/CliLoginCodeSchema';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { organizationFactory, userFactory } from '../../../test';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('CliLoginCodeRepository', () => {
  let dataSource: DataSource;
  let repository: CliLoginCodeRepository;
  let logger: jest.Mocked<PackmindLogger>;

  const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

  const userId = createUserId('123e4567-e89b-12d3-a456-426614174210');
  const organizationId = createOrganizationId(
    '123e4567-e89b-12d3-a456-426614174211',
  );

  beforeAll(() => {
    mockConfiguration.getConfig.mockResolvedValue('test-encryption-key');
  });

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([
      CliLoginCodeSchema,
      UserSchema,
      OrganizationSchema,
      UserOrganizationMembershipSchema,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    repository = new CliLoginCodeRepository(
      dataSource.getRepository(CliLoginCodeSchema),
      logger,
    );

    const organization = await dataSource
      .getRepository(OrganizationSchema)
      .save(organizationFactory({ id: organizationId }));

    await dataSource.getRepository(UserSchema).save(
      userFactory({
        id: userId,
        email: 'test-user@packmind.com',
        memberships: [
          {
            userId,
            organizationId: createOrganizationId(organization.id),
            role: 'admin',
          },
        ],
      }),
    );
  });

  afterEach(async () => {
    await dataSource.destroy();
    jest.clearAllMocks();
  });

  describe('.add', () => {
    it('encrypts code at rest and returns decrypted code', async () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174001'),
        code: createCliLoginCodeToken('PLAIN_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const saved = await repository.add(cliLoginCode);

      expect(saved.code).toEqual(cliLoginCode.code);

      const persisted = await dataSource
        .getRepository(CliLoginCodeSchema)
        .findOne({ where: { id: cliLoginCode.id } });

      expect(persisted?.code).not.toEqual('PLAIN_CODE');
      expect(persisted?.code).toContain(':');
    });
  });

  describe('.findByCode', () => {
    it('returns decrypted CLI login code when found', async () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174002'),
        code: createCliLoginCodeToken('FIND_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await repository.add(cliLoginCode);

      const found = await repository.findByCode(
        createCliLoginCodeToken('FIND_CODE'),
      );

      expect(found).not.toBeNull();
      expect(found?.id).toEqual(cliLoginCode.id);
      expect(found?.code).toEqual('FIND_CODE');
    });

    it('returns null when code is not found', async () => {
      const found = await repository.findByCode(
        createCliLoginCodeToken('NON_EXISTENT'),
      );

      expect(found).toBeNull();
    });
  });

  describe('.findById', () => {
    it('returns decrypted CLI login code when found', async () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174003'),
        code: createCliLoginCodeToken('FINDBYID_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await repository.add(cliLoginCode);

      const found = await repository.findById(cliLoginCode.id);

      expect(found).not.toBeNull();
      expect(found?.code).toEqual('FINDBYID_CODE');
    });

    it('returns null when id is not found', async () => {
      const found = await repository.findById(
        createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174999'),
      );

      expect(found).toBeNull();
    });
  });

  describe('.delete', () => {
    it('removes the CLI login code', async () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174004'),
        code: createCliLoginCodeToken('DELETE_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await repository.add(cliLoginCode);
      await repository.delete(cliLoginCode.id);

      const found = await repository.findById(cliLoginCode.id);

      expect(found).toBeNull();
    });
  });

  describe('.deleteExpired', () => {
    it('deletes only expired codes', async () => {
      const expiredCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174005'),
        code: createCliLoginCodeToken('EXPIRED_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };

      const validCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174006'),
        code: createCliLoginCodeToken('VALID_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      };

      await repository.add(expiredCode);
      await repository.add(validCode);

      const deletedCount = await repository.deleteExpired();

      expect(deletedCount).toBe(1);

      const foundExpired = await repository.findById(expiredCode.id);
      const foundValid = await repository.findById(validCode.id);

      expect(foundExpired).toBeNull();
      expect(foundValid).not.toBeNull();
    });

    it('returns 0 when no expired codes exist', async () => {
      const validCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174007'),
        code: createCliLoginCodeToken('VALID_CODE_2'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await repository.add(validCode);

      const deletedCount = await repository.deleteExpired();

      expect(deletedCount).toBe(0);
    });
  });
});
