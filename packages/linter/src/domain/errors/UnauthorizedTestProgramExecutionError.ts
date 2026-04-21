export class UnauthorizedTestProgramExecutionError extends Error {
  constructor(detectionProgramId: string, organizationId: string) {
    super(
      `Unauthorized to test detection program ${detectionProgramId} for organization ${organizationId}`,
    );
    this.name = 'UnauthorizedTestProgramExecutionError';
  }
}
