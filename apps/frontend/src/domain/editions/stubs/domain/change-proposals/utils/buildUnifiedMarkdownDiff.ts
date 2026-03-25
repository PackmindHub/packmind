export interface MarkdownBlock {
  html: string;
  isChanged: boolean;
  diffHtml?: string;
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'other';
}

export function buildUnifiedMarkdownDiff(
  _oldValue: string,
  _newValue: string,
): MarkdownBlock[] {
  return [];
}
