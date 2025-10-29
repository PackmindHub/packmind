export class ExecuteLinterProgramsUseCase {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  execute() {
    console.log('Linter execution not available in Community Edition.');
    return Promise.resolve({
      file: '',
      violations: [],
    });
  }
}
