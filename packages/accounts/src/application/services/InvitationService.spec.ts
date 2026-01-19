import { InvitationService } from './InvitationService';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { MailService, Configuration } from '@packmind/node-utils';
import {
  invitationFactory,
  organizationFactory,
  userFactory,
} from '../../../test';
import { Invitation } from '../../domain/entities/Invitation';
import { User } from '../../domain/entities/User';
import { Organization } from '../../domain/entities/Organization';
import { InvitationCreationRecord } from './InvitationService';

jest.mock('@packmind/node-utils', () => ({
  ...(jest.requireActual('@packmind/node-utils') as object),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockedConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('InvitationService', () => {
  let invitationService: InvitationService;
  let mockInvitationRepository: jest.Mocked<IInvitationRepository>;
  let mockMailService: jest.Mocked<MailService>;

  beforeEach(() => {
    mockInvitationRepository = {
      addMany: jest.fn(),
    } as unknown as jest.Mocked<IInvitationRepository>;

    mockMailService = {
      isConfigured: jest.fn(),
      sendEmail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    invitationService = new InvitationService(
      mockInvitationRepository,
      mockMailService,
    );

    mockedConfiguration.getConfig.mockResolvedValue('https://app.packmind.ai');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitations', () => {
    let organization: Organization;
    let inviter: User;
    let targetUser: User;
    let savedInvitation: Invitation;
    let result: InvitationCreationRecord[];

    beforeEach(() => {
      organization = organizationFactory({ name: 'Packmind Org' });
      inviter = userFactory({ email: 'admin@packmind.com' });
      targetUser = userFactory({
        email: 'invitee@packmind.com',
        active: false,
        memberships: [],
      });
      savedInvitation = invitationFactory({
        userId: targetUser.id,
      });
    });

    describe('when creating a single invitation', () => {
      beforeEach(async () => {
        mockInvitationRepository.addMany.mockResolvedValue([savedInvitation]);
        mockMailService.sendEmail.mockResolvedValue('queued');

        result = await invitationService.createInvitations([
          {
            email: targetUser.email,
            user: targetUser,
            organization,
            inviter,
          },
        ]);
      });

      it('calls repository addMany once', () => {
        expect(mockInvitationRepository.addMany).toHaveBeenCalledTimes(1);
      });

      it('passes one invitation to the repository', () => {
        expect(mockInvitationRepository.addMany.mock.calls[0][0]).toHaveLength(
          1,
        );
      });

      it('sends email to the target user with organization name in subject', () => {
        expect(mockMailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            recipient: targetUser.email,
            subject: expect.stringContaining('Packmind Org'),
          }),
        );
      });

      it('returns the invitation result with correct email', () => {
        expect(result[0].email).toEqual(targetUser.email);
      });

      it('returns the invitation result with correct invitation', () => {
        expect(result[0].invitation).toEqual(savedInvitation);
      });

      it('returns the invitation result with correct userId', () => {
        expect(result[0].userId).toEqual(targetUser.id);
      });
    });
  });
});
