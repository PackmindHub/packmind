import { InvitationService } from './InvitationService';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { MailService, Configuration } from '@packmind/shared';
import {
  invitationFactory,
  organizationFactory,
  userFactory,
} from '../../../test';
import { Invitation } from '../../domain/entities/Invitation';
import { InvitationConfigurationError } from '../../domain/errors';

jest.mock('@packmind/shared', () => ({
  ...(jest.requireActual('@packmind/shared') as object),
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

    mockedConfiguration.getConfig.mockResolvedValue('https://app.packmind.com');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates invitations and sends emails with expected payload', async () => {
    const organization = organizationFactory({ name: 'Packmind Org' });
    const inviter = userFactory({ email: 'admin@packmind.com' });
    const targetUser = userFactory({
      email: 'invitee@packmind.com',
      active: false,
      memberships: [],
    });

    const savedInvitation: Invitation = invitationFactory({
      userId: targetUser.id,
    });
    mockInvitationRepository.addMany.mockResolvedValue([savedInvitation]);
    mockMailService.sendEmail.mockResolvedValue('queued');

    const result = await invitationService.createInvitations([
      {
        email: targetUser.email,
        user: targetUser,
        organization,
        inviter,
      },
    ]);

    expect(mockInvitationRepository.addMany).toHaveBeenCalledTimes(1);
    expect(mockInvitationRepository.addMany.mock.calls[0][0]).toHaveLength(1);
    expect(mockMailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: targetUser.email,
        subject: expect.stringContaining('Packmind Org'),
      }),
    );

    expect(result).toEqual([
      {
        email: targetUser.email,
        invitation: savedInvitation,
        userId: targetUser.id,
      },
    ]);
  });

  it('throws if application URL is not configured', async () => {
    mockedConfiguration.getConfig.mockResolvedValueOnce(null);

    const organization = organizationFactory();
    const inviter = userFactory();
    const user = userFactory();

    await expect(
      invitationService.createInvitations([
        {
          email: user.email,
          user,
          organization,
          inviter,
        },
      ]),
    ).rejects.toBeInstanceOf(InvitationConfigurationError);

    expect(mockInvitationRepository.addMany).not.toHaveBeenCalled();
    expect(mockMailService.sendEmail).not.toHaveBeenCalled();
  });
});
