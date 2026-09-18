/**
 * A union rather than an enum so a further vendor (say `'cursor'`) can be
 * appended without touching consumers.
 */
export type MarketplaceVendor = 'anthropic' | 'github';
