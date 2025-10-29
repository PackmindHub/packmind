import { Worker } from 'bullmq';
import { AbstractQueue } from './AbstractQueue';

export class Queue<Input, Output> extends AbstractQueue<Input, Output> {
  async addWorker(): Promise<Worker<Input, Output, string> | null> {
    return null;
  }
}
