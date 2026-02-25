import { Readable } from 'stream';

export async function readStdin(
  input: Readable = process.stdin,
): Promise<string> {
  if ('isTTY' in input && input.isTTY) {
    throw new Error(
      'No piped input detected. Please provide content via stdin or specify a file path.',
    );
  }

  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const content = Buffer.concat(chunks).toString('utf-8').trim();

  if (!content) {
    throw new Error('Stdin is empty. Please provide JSON content via pipe.');
  }

  return content;
}
