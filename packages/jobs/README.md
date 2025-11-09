# Jobs Package

This package provides a hexagonal architecture for job queue management using BullMQ and Redis.

## Architecture

The package follows the hexagonal architecture pattern with:

- **JobsHexa**: Main facade for jobs-related functionality and service instantiation
- **HelloWorldDelayedJob**: Example job implementation
- **AbstractAIDelayedJob**: Base class for all delayed jobs

## Usage

### Basic Setup

```typescript
import { JobsHexa, HelloWorldInput } from '@packmind/jobs';
import { HexaRegistry } from '@packmind/node-utils';

// Initialize with registry
const registry = new HexaRegistry();
const jobsHexa = new JobsHexa(registry);

// Initialize job queues
await jobsHexa.initJobQueues();

// Submit a job
const input: HelloWorldInput = { value: 'World' };
const jobId = await jobsHexa.submitJob(input);
console.log(`Job submitted with ID: ${jobId}`);
```

### Configuration

Make sure Redis is configured with these environment variables:

- `REDIS_URI` (default: "redis://redis:6379") - Full Redis connection URI including username and password if needed (e.g., "redis://username:password@host:port")
- `NO_WORKER` (optional: "true" to disable workers)

### Extending with Custom Jobs

```typescript
import { AbstractAIDelayedJob } from '@packmind/jobs';

export class CustomDelayedJob extends AbstractAIDelayedJob<
  CustomInput,
  CustomOutput
> {
  readonly logTitle = 'CustomJob';

  async runJob(
    jobId: string,
    input: CustomInput,
    controller: AbortController,
  ): Promise<CustomOutput> {
    // Your job logic here
    return { result: `Processed ${input.data}` };
  }

  // Implement other abstract methods...
}
```

## Services

### initJobQueues()

Initializes all job queues including the hello-world example queue.

### submitJob(input)

Submits a job to the appropriate queue and returns the job ID.
