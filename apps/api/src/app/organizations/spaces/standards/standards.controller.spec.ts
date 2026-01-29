import { BadRequestException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  createRuleId,
  createStandardId,
  CreateStandardSamplesResponse,
  RuleId,
  SampleInput,
  Standard,
} from '@packmind/types';
import { StandardsService } from '../../../standards/standards.service';
import { OrganizationsSpacesStandardsController } from './standards.controller';

describe('OrganizationsSpacesStandardsController', () => {
  let controller: OrganizationsSpacesStandardsController;
  let standardsService: jest.Mocked<StandardsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardsService = {
      getStandardsBySpace: jest.fn(),
      updateStandard: jest.fn(),
      createStandardSamples: jest.fn(),
    } as unknown as jest.Mocked<StandardsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesStandardsController(
      standardsService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStandards', () => {
    describe('when standards exist', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const mockStandards: Standard[] = [
        {
          id: createStandardId('standard-1'),
          slug: 'test-standard',
          name: 'Test Standard',
          description: 'Test description',
          userId,
          spaceId,
          version: 1,
          scope: null,
        },
      ];

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      let result: { standards: Standard[] };

      beforeEach(async () => {
        standardsService.getStandardsBySpace.mockResolvedValue({
          standards: mockStandards,
        });
        result = await controller.getStandards(orgId, spaceId, request);
      });

      it('returns standards', () => {
        expect(result).toEqual({ standards: mockStandards });
      });

      it('calls service with correct params', () => {
        expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const error = new Error('Database error');

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      standardsService.getStandardsBySpace.mockRejectedValue(error);

      await expect(
        controller.getStandards(orgId, spaceId, request),
      ).rejects.toThrow('Database error');
    });

    describe('when standard list is empty', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      let result: { standards: Standard[] };

      beforeEach(async () => {
        standardsService.getStandardsBySpace.mockResolvedValue({
          standards: [],
        });
        result = await controller.getStandards(orgId, spaceId, request);
      });

      it('returns empty array', () => {
        expect(result).toEqual({ standards: [] });
      });

      it('calls service with correct params', () => {
        expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });
  });

  describe('updateStandard', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');
    const standardId = createStandardId('standard-1');
    const ruleId = createRuleId('rule-1');

    const request = {
      organization: {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        role: 'admin',
      },
      user: {
        userId,
        name: 'Test User',
      },
      clientSource: 'ui',
    } as unknown as AuthenticatedRequest;

    const validStandard = {
      name: 'Updated Standard',
      description: 'Updated description',
      rules: [
        {
          id: ruleId,
          content: 'Updated rule content',
        },
      ],
      scope: 'backend',
    };

    describe('when update is successful', () => {
      const mockUpdatedStandard: Standard = {
        id: standardId,
        slug: 'updated-standard',
        name: 'Updated Standard',
        description: 'Updated description',
        userId,
        spaceId,
        version: 2,
        scope: 'backend',
      };
      let result: Standard;

      beforeEach(async () => {
        standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);
        result = await controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          validStandard,
          request,
        );
      });

      it('returns updated standard', () => {
        expect(result).toEqual(mockUpdatedStandard);
      });

      it('calls service with correct params', () => {
        expect(standardsService.updateStandard).toHaveBeenCalledWith(
          standardId,
          validStandard,
          orgId,
          userId,
          spaceId,
          'ui',
        );
      });
    });

    describe('when name is missing', () => {
      const invalidStandard = {
        ...validStandard,
        name: '',
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when description is missing', () => {
      const invalidStandard = {
        ...validStandard,
        description: '',
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when rules is not an array', () => {
      const invalidStandard = {
        ...validStandard,
        rules: null as unknown as Array<{ id: RuleId; content: string }>,
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when rule content is missing', () => {
      const invalidStandard = {
        ...validStandard,
        rules: [
          {
            id: ruleId,
            content: '',
          },
        ],
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    it('propagates errors from service', async () => {
      const error = new Error('Database error');
      standardsService.updateStandard.mockRejectedValue(error);

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          validStandard,
          request,
        ),
      ).rejects.toThrow('Database error');
    });

    describe('when scope is null', () => {
      const standardWithNullScope = {
        ...validStandard,
        scope: null,
      };

      const mockUpdatedStandard: Standard = {
        id: standardId,
        slug: 'updated-standard',
        name: 'Updated Standard',
        description: 'Updated description',
        userId,
        spaceId,
        version: 2,
        scope: null,
      };

      let result: Standard;

      beforeEach(async () => {
        standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);
        result = await controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          standardWithNullScope,
          request,
        );
      });

      it('returns updated standard', () => {
        expect(result).toEqual(mockUpdatedStandard);
      });

      it('calls service with correct params', () => {
        expect(standardsService.updateStandard).toHaveBeenCalledWith(
          standardId,
          standardWithNullScope,
          orgId,
          userId,
          spaceId,
          'ui',
        );
      });
    });
  });

  describe('createStandardSamples', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');

    const request = {
      organization: {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        role: 'admin',
      },
      user: {
        userId,
        name: 'Test User',
      },
    } as unknown as AuthenticatedRequest;

    const validSamples: SampleInput[] = [
      { type: 'language', id: 'java' },
      { type: 'framework', id: 'react' },
    ];

    describe('when samples are created successfully', () => {
      const mockResponse: CreateStandardSamplesResponse = {
        created: [
          {
            id: createStandardId('standard-1'),
            slug: 'java-standard',
            name: 'Java Standard',
            description: 'Java coding standard',
            userId,
            spaceId,
            version: 1,
            scope: '**/*.java',
          },
          {
            id: createStandardId('standard-2'),
            slug: 'react-standard',
            name: 'React Standard',
            description: 'React coding standard',
            userId,
            spaceId,
            version: 1,
            scope: '**/*.tsx',
          },
        ],
        errors: [],
      };

      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        standardsService.createStandardSamples.mockResolvedValue(mockResponse);
        result = await controller.createStandardSamples(
          orgId,
          spaceId,
          { samples: validSamples },
          request,
        );
      });

      it('returns created standards', () => {
        expect(result).toEqual(mockResponse);
      });

      it('calls service with correct params', () => {
        expect(standardsService.createStandardSamples).toHaveBeenCalledWith(
          orgId,
          spaceId,
          userId,
          validSamples,
        );
      });
    });

    describe('when some samples fail to create', () => {
      const mockResponse: CreateStandardSamplesResponse = {
        created: [
          {
            id: createStandardId('standard-1'),
            slug: 'java-standard',
            name: 'Java Standard',
            description: 'Java coding standard',
            userId,
            spaceId,
            version: 1,
            scope: '**/*.java',
          },
        ],
        errors: [
          {
            sampleId: 'react',
            type: 'framework',
            error: 'Sample file not found: react',
          },
        ],
      };

      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        standardsService.createStandardSamples.mockResolvedValue(mockResponse);
        result = await controller.createStandardSamples(
          orgId,
          spaceId,
          { samples: validSamples },
          request,
        );
      });

      it('returns partial response with created and errors', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when samples is not an array', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.createStandardSamples(
            orgId,
            spaceId,
            { samples: null as unknown as SampleInput[] },
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call service', async () => {
        await controller
          .createStandardSamples(
            orgId,
            spaceId,
            { samples: null as unknown as SampleInput[] },
            request,
          )
          .catch(() => {
            /* expected */
          });
        expect(standardsService.createStandardSamples).not.toHaveBeenCalled();
      });
    });

    describe('when samples array is empty', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.createStandardSamples(
            orgId,
            spaceId,
            { samples: [] },
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call service', async () => {
        await controller
          .createStandardSamples(orgId, spaceId, { samples: [] }, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.createStandardSamples).not.toHaveBeenCalled();
      });
    });

    describe('when sample has invalid type', () => {
      const invalidSamples = [
        { type: 'invalid' as 'language' | 'framework', id: 'java' },
      ];

      it('throws BadRequestException', async () => {
        await expect(
          controller.createStandardSamples(
            orgId,
            spaceId,
            { samples: invalidSamples },
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call service', async () => {
        await controller
          .createStandardSamples(
            orgId,
            spaceId,
            { samples: invalidSamples },
            request,
          )
          .catch(() => {
            /* expected */
          });
        expect(standardsService.createStandardSamples).not.toHaveBeenCalled();
      });
    });

    describe('when sample has missing id', () => {
      const invalidSamples = [{ type: 'language', id: '' }] as SampleInput[];

      it('throws BadRequestException', async () => {
        await expect(
          controller.createStandardSamples(
            orgId,
            spaceId,
            { samples: invalidSamples },
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call service', async () => {
        await controller
          .createStandardSamples(
            orgId,
            spaceId,
            { samples: invalidSamples },
            request,
          )
          .catch(() => {
            /* expected */
          });
        expect(standardsService.createStandardSamples).not.toHaveBeenCalled();
      });
    });

    it('propagates errors from service', async () => {
      const error = new Error('Database error');
      standardsService.createStandardSamples.mockRejectedValue(error);

      await expect(
        controller.createStandardSamples(
          orgId,
          spaceId,
          { samples: validSamples },
          request,
        ),
      ).rejects.toThrow('Database error');
    });
  });
});
