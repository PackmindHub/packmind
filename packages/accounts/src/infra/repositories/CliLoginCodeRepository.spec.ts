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
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
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
  const fixture = createTestDatasourceFixture([
    CliLoginCodeSchema,
    UserSchema,
    OrganizationSchema,
    UserOrganizationMembershipSchema,
  ]);

  let repository: CliLoginCodeRepository;
  let logger: jest.Mocked<PackmindLogger>;

  const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

  const userId = createUserId('123e4567-e89b-12d3-a456-426614174210');
  const organizationId = createOrganizationId(
    '123e4567-e89b-12d3-a456-426614174211',
  );

  beforeAll(async () => {
    mockConfiguration.getConfig.mockResolvedValue('test-encryption-key');
    await fixture.initialize();
  });

  beforeEach(async () => {
    logger = stubLogger();
    repository = new CliLoginCodeRepository(
      fixture.datasource.getRepository(CliLoginCodeSchema),
      logger,
    );

    const organization = await fixture.datasource
      .getRepository(OrganizationSchema)
      .save(organizationFactory({ id: organizationId }));

    await fixture.datasource.getRepository(UserSchema).save(
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
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('.add', () => {
    const cliLoginCode: CliLoginCode = {
      id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174001'),
      code: createCliLoginCodeToken('PLAIN_CODE'),
      userId,
      organizationId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('returns decrypted code after saving', async () => {
      const saved = await repository.add(cliLoginCode);

      expect(saved.code).toEqual(cliLoginCode.code);
    });

    it('encrypts code at rest', async () => {
      await repository.add(cliLoginCode);

      const persisted = await fixture.datasource
        .getRepository(CliLoginCodeSchema)
        .findOne({ where: { id: cliLoginCode.id } });

      expect(persisted?.code).not.toEqual('PLAIN_CODE');
    });

    it('stores encrypted code with IV separator', async () => {
      await repository.add(cliLoginCode);

      const persisted = await fixture.datasource
        .getRepository(CliLoginCodeSchema)
        .findOne({ where: { id: cliLoginCode.id } });

      expect(persisted?.code).toContain(':');
    });
  });

  describe('.findByCode', () => {
    describe('when code exists', () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174002'),
        code: createCliLoginCodeToken('FIND_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      beforeEach(async () => {
        await repository.add(cliLoginCode);
      });

      it('returns a non-null result', async () => {
        const found = await repository.findByCode(
          createCliLoginCodeToken('FIND_CODE'),
        );

        expect(found).not.toBeNull();
      });

      it('returns the correct id', async () => {
        const found = await repository.findByCode(
          createCliLoginCodeToken('FIND_CODE'),
        );

        expect(found?.id).toEqual(cliLoginCode.id);
      });

      it('returns decrypted code', async () => {
        const found = await repository.findByCode(
          createCliLoginCodeToken('FIND_CODE'),
        );

        expect(found?.code).toEqual('FIND_CODE');
      });
    });

    describe('when code does not exist', () => {
      it('returns null', async () => {
        const found = await repository.findByCode(
          createCliLoginCodeToken('NON_EXISTENT'),
        );

        expect(found).toBeNull();
      });
    });
  });

  describe('.findById', () => {
    describe('when id exists', () => {
      const cliLoginCode: CliLoginCode = {
        id: createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174003'),
        code: createCliLoginCodeToken('FINDBYID_CODE'),
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      beforeEach(async () => {
        await repository.add(cliLoginCode);
      });

      it('returns a non-null result', async () => {
        const found = await repository.findById(cliLoginCode.id);

        expect(found).not.toBeNull();
      });

      it('returns decrypted code', async () => {
        const found = await repository.findById(cliLoginCode.id);

        expect(found?.code).toEqual('FINDBYID_CODE');
      });
    });

    describe('when id does not exist', () => {
      it('returns null', async () => {
        const found = await repository.findById(
          createCliLoginCodeId('123e4567-e89b-12d3-a456-426614174999'),
        );

        expect(found).toBeNull();
      });
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
    describe('when expired codes exist', () => {
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

      beforeEach(async () => {
        await repository.add(expiredCode);
        await repository.add(validCode);
      });

      it('returns 1 for deleted count', async () => {
        const deletedCount = await repository.deleteExpired();

        expect(deletedCount).toBe(1);
      });

      it('removes expired code from repository', async () => {
        await repository.deleteExpired();

        const foundExpired = await repository.findById(expiredCode.id);

        expect(foundExpired).toBeNull();
      });

      it('keeps valid code in repository', async () => {
        await repository.deleteExpired();

        const foundValid = await repository.findById(validCode.id);

        expect(foundValid).not.toBeNull();
      });
    });

    describe('when no expired codes exist', () => {
      it('returns 0', async () => {
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
});
