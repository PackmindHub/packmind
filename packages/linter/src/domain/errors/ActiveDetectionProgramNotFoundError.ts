export class ActiveDetectionProgramNotFoundError extends Error {
  constructor(activeDetectionProgramId: string) {
    super(
      `Active detection program with id ${activeDetectionProgramId} not found`,
    );
    this.name = 'ActiveDetectionProgramNotFoundError';
  }
}
