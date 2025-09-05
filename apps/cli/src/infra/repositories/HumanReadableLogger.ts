import { LintViolation } from '../../domain/entities/LintViolation';
import { ILogger } from '../../domain/repositories/ILogger';
import chalk from 'chalk';

export class HumanReadableLogger implements ILogger {
  logViolations(violations: LintViolation[]) {
    violations.forEach((violation) => {
      this.logViolation(violation);
    });

    if (violations.length > 0) {
      const totalViolationCount = violations.reduce(
        (acc, violation) => acc + violation.violations.length,
        0,
      );
      console.log(
        chalk.bgRed.bold('packmind-cli'),
        chalk.red(
          `❌ Found ${chalk.bold(totalViolationCount)} violation(s) in ${chalk.bold(violations.length)} file(s)`,
        ),
      );
    } else {
      console.log(
        chalk.bgGreen.bold('packmind-cli'),
        chalk.green.bold(`✅ No violations found`),
      );
    }
  }

  logViolation(violation: LintViolation) {
    console.log(chalk.underline.gray(violation.file));
    violation.violations.forEach(({ line, character, standard, rule }) => {
      console.log(
        chalk.red(`\t${line}:${character}\terror\t@${standard}/${rule}`),
      );
    });
  }
}
