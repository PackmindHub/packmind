import { InvitationService } from './InvitationService';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { MailService, Configuration } from '@packmind/node-utils';
import {
  invitationFactory,
  organizationFactory,
  userFactory,
} from '../../../test';
import { Invitation } from '../../domain/entities/Invitation';

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
});
