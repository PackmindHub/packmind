export class DetectionProgramNotFoundError extends Error {
  constructor(detectionProgramId: string) {
    super(`Detection program with id ${detectionProgramId} not found`);
    this.name = 'DetectionProgramNotFoundError';
  }
}
