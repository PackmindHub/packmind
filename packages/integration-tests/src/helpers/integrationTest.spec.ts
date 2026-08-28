import { integrationTestWithUser } from './integrationTest';

describe(
  'integrationTestWithUser',
  integrationTestWithUser((getContext) => {
    it('provides a signed-up user', async () => {
      const { user } = await getContext();

      expect(user.email).toBe('someone@example.com');
    });

    it('provides the organization default space', async () => {
      const { space } = await getContext();

      expect(space.slug).toBe('global');
    });

    it('provides a base command bound to that user, organization and space', async () => {
      const { basePackmindCommand, user, organization, space } =
        await getContext();

      expect(basePackmindCommand).toEqual({
        userId: user.id,
        organizationId: organization.id,
        spaceId: space.id,
      });
    });

    describe('when a test writes to the database', () => {
      it('sees what it wrote', async () => {
        const { testApp, basePackmindCommand } = await getContext();

        await testApp.commandsHexa.getAdapter().captureCommand({
          ...basePackmindCommand,
          name: 'Written by this test',
          content: 'content',
        });

        const commands = await testApp.commandsHexa
          .getAdapter()
          .listCommandsBySpace(basePackmindCommand);
        expect(commands.map((command) => command.name)).toEqual([
          'Written by this test',
        ]);
      });

      it('does not leak that write into the next test', async () => {
        const { testApp, basePackmindCommand } = await getContext();

        const commands = await testApp.commandsHexa
          .getAdapter()
          .listCommandsBySpace(basePackmindCommand);
        expect(commands).toEqual([]);
      });
    });
  }),
);
