import { CommandsIndexService } from './CommandsIndexService';

describe('CommandsIndexService', () => {
  let service: CommandsIndexService;

  beforeEach(() => {
    service = new CommandsIndexService();
  });

  describe('buildCommandsIndex', () => {
    describe('with a single command', () => {
      let result: string;

      beforeEach(() => {
        const commands = [
          {
            name: 'Test Command',
            slug: 'test-command',
            summary: 'A test command for testing',
          },
        ];
        result = service.buildCommandsIndex(commands);
      });

      it('includes the header', () => {
        expect(result).toContain('# Packmind Commands Index');
      });

      it('includes the available commands section', () => {
        expect(result).toContain('## Available Commands');
      });

      it('includes the footer', () => {
        expect(result).toContain(
          '*This file was automatically generated from deployed command versions.*',
        );
      });
    });

    describe('with multiple commands', () => {
      let result: string;

      beforeEach(() => {
        const commands = [
          {
            name: 'Command One',
            slug: 'command-one',
            summary: 'First command summary',
          },
          {
            name: 'Command Two',
            slug: 'command-two',
            summary: 'Second command summary',
          },
        ];
        result = service.buildCommandsIndex(commands);
      });

      it('lists first command with summary', () => {
        expect(result).toContain(
          '- [Command One](commands/command-one.md) : First command summary',
        );
      });

      it('lists second command with summary', () => {
        expect(result).toContain(
          '- [Command Two](commands/command-two.md) : Second command summary',
        );
      });
    });

    describe('when summary is null', () => {
      it('uses command name as summary', () => {
        const commands = [
          {
            name: 'Command Without Summary',
            slug: 'no-summary',
            summary: null,
          },
        ];

        const result = service.buildCommandsIndex(commands);

        expect(result).toContain(
          '- [Command Without Summary](commands/no-summary.md) : Command Without Summary',
        );
      });
    });

    describe('when summary is empty string', () => {
      it('uses command name as summary', () => {
        const commands = [
          {
            name: 'Command With Empty Summary',
            slug: 'empty-summary',
            summary: '  ',
          },
        ];

        const result = service.buildCommandsIndex(commands);

        expect(result).toContain(
          '- [Command With Empty Summary](commands/empty-summary.md) : Command With Empty Summary',
        );
      });
    });

    describe('when sorting commands alphabetically', () => {
      let commandLines: string[];

      beforeEach(() => {
        const commands = [
          {
            name: 'Zebra Command',
            slug: 'zebra',
            summary: 'Last alphabetically',
          },
          {
            name: 'Apple Command',
            slug: 'apple',
            summary: 'First alphabetically',
          },
          {
            name: 'Middle Command',
            slug: 'middle',
            summary: 'Middle alphabetically',
          },
        ];

        const result = service.buildCommandsIndex(commands);
        const lines = result.split('\n');
        commandLines = lines.filter((line) => line.startsWith('- ['));
      });

      it('places Apple Command first', () => {
        expect(commandLines[0]).toContain('Apple Command');
      });

      it('places Middle Command second', () => {
        expect(commandLines[1]).toContain('Middle Command');
      });

      it('places Zebra Command last', () => {
        expect(commandLines[2]).toContain('Zebra Command');
      });
    });

    describe('with empty command list', () => {
      it('displays no commands available message', () => {
        const result = service.buildCommandsIndex([]);

        expect(result).toContain('No commands available.');
      });
    });
  });
});
