import chalk from 'chalk';
import {
  IOutput,
  HelpMessage,
  Artefact,
} from '../../domain/repositories/IOutput';
import logUpdate from 'log-update';

const CLI_PREFIX = 'packmind-cli';

class CliFormatter {
  public static success(message: string) {
    return `${chalk.bgGreen.bold(CLI_PREFIX)} ${chalk.green.bold(message)}`;
  }

  public static warning(message: string) {
    return `${chalk.bgYellow.bold(CLI_PREFIX)} ${chalk.yellow.bold(message)}`;
  }

  public static error(message: string) {
    return `${chalk.bgRed.bold(CLI_PREFIX)} ${chalk.red(message)}`;
  }

  public static command(command: string) {
    return chalk.yellow(command);
  }

  public static loader(text: string) {
    return chalk.dim.italic(text);
  }

  public static header(title: string) {
    return chalk.bold.underline(title);
  }

  public static subHeader(title: string) {
    return chalk.bold(title);
  }

  public static slug(slug: string) {
    return chalk.blue.bold(slug);
  }

  public static label(label: string) {
    return chalk.dim(label);
  }
}

export class CliOutput implements IOutput {
  constructor(private readonly logger = console) {}

  notifySuccess(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.success(message),
      (msg) => this.logger.log(msg),
      help,
    );
  }

  notifyWarning(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.warning(message),
      (msg) => this.logger.warn(msg),
      help,
    );
  }

  notifyError(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.error(message),
      (msg) => this.logger.error(msg),
      help,
    );
  }

  showLoader(message: string) {
    this.logger.log(CliFormatter.loader(message));
  }

  async withLoader<T>(message: string, loader: () => Promise<T>): Promise<T> {
    logUpdate(CliFormatter.loader(message));

    try {
      return loader();
    } finally {
      logUpdate.clear();
    }
  }

  showArtefact(artefact: Artefact, help?: HelpMessage) {
    this.logger.log(CliFormatter.label(artefact.slug));
    this.logger.log(CliFormatter.header(artefact.title));
    if (artefact.url) {
      this.logger.log(CliFormatter.label(artefact.url));
    }
    this.logger.log('');
    if (artefact.description) {
      this.logger.log(artefact.description);
    }

    this.logger.log('');
    this.displayHelp(help);
  }

  listArtefacts(title: string, artefacts: Artefact[], help?: HelpMessage) {
    this.logger.log(CliFormatter.header(title));
    this.logger.log('');

    this.displayList(artefacts);
    this.displayHelp(help);
  }

  listScopedArtefacts(
    title: string,
    scopedArtefacts: { title: string; artefacts: Artefact[] }[],
    help?: HelpMessage,
  ) {
    this.logger.log(CliFormatter.header(title));
    this.logger.log('');

    for (const { title, artefacts } of scopedArtefacts) {
      this.logger.log(CliFormatter.subHeader(title));
      this.logger.log('');
      this.displayList(artefacts);
    }

    this.displayHelp(help);
  }

  private notifyMessage(
    message: string,
    output: (message: string) => void,
    help?: HelpMessage,
  ) {
    output(message);
    this.displayHelp(help);
  }

  private displayList(artefacts: Artefact[]) {
    for (const artefact of artefacts) {
      this.logger.log(`- ${CliFormatter.label(artefact.slug)}`);
      this.logger.log(` Name: ${CliFormatter.header(artefact.title)}`);
      if (artefact.url) {
        this.logger.log(` ${CliFormatter.label(artefact.url)}`);
      }
      this.logger.log('');
    }
  }

  private displayHelp(help?: HelpMessage) {
    if (help) {
      this.logger.log(help.content);

      if (help.exampleCommand) {
        this.logger.log(
          `\n  Example: ${CliFormatter.command(help.exampleCommand)}`,
        );
      }

      if (help.command) {
        this.logger.log(`\n  ${CliFormatter.command(help.command)}`);
      }
    }
  }
}
