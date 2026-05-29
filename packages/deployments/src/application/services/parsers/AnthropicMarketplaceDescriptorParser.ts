import { z } from 'zod';
import {
  IMarketplaceDescriptorParser,
  MarketplaceDescriptor,
  PluginRef,
} from '@packmind/types';
import { MarketplaceDescriptorParseError } from '../../../domain/errors';

/**
 * Zod schema describing the minimum Anthropic marketplace descriptor shape.
 *
 * The descriptor is intentionally permissive — fields beyond the required
 * `name` + `plugins[]` (e.g. `metadata`, `owner`, plugin `source` info) are
 * preserved unparsed on `MarketplaceDescriptor.raw` so the reconciliation job
 * can deep-diff against future fetches.
 */
const anthropicPluginSchema = z
  .object({
    name: z.string().min(1, 'plugin.name is required'),
    version: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

const anthropicDescriptorSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    version: z.string().optional(),
    vendor: z.literal('anthropic').optional(),
    plugins: z.array(anthropicPluginSchema),
  })
  .passthrough();

type AnthropicDescriptorShape = z.infer<typeof anthropicDescriptorSchema>;

/**
 * Marketplace descriptor parser for the Anthropic Claude Code marketplace
 * format.
 *
 * Claim heuristic: the raw JSON must be a plain object containing a `plugins`
 * array (the structural backbone of the format). Either:
 *   - `vendor === 'anthropic'` is explicitly set, OR
 *   - no `vendor` field is set (treated as anthropic-by-default in v1).
 *
 * If a different vendor is declared, the parser declines (`canParse` returns
 * false) so the next parser in the registry can claim it.
 */
export class AnthropicMarketplaceDescriptorParser implements IMarketplaceDescriptorParser {
  canParse(rawJson: unknown): boolean {
    if (!this.isPlainObject(rawJson)) {
      return false;
    }
    if (!Array.isArray((rawJson as { plugins?: unknown }).plugins)) {
      return false;
    }

    const vendor = (rawJson as { vendor?: unknown }).vendor;
    if (vendor !== undefined && vendor !== 'anthropic') {
      return false;
    }

    return true;
  }

  parse(rawJson: unknown): MarketplaceDescriptor {
    const result = anthropicDescriptorSchema.safeParse(rawJson);
    if (!result.success) {
      throw new MarketplaceDescriptorParseError(
        'Anthropic marketplace descriptor failed schema validation',
        result.error.issues,
      );
    }

    const parsed: AnthropicDescriptorShape = result.data;

    const plugins: PluginRef[] = parsed.plugins.map((plugin) => {
      const ref: PluginRef = {
        slug: this.toSlug(plugin.name),
        name: plugin.name,
      };
      if (plugin.version !== undefined) {
        ref.version = plugin.version;
      }
      return ref;
    });

    const descriptor: MarketplaceDescriptor = {
      vendor: 'anthropic',
      name: parsed.name,
      plugins,
      raw: rawJson,
    };
    if (parsed.version !== undefined) {
      descriptor.version = parsed.version;
    }
    return descriptor;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }

  private toSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
