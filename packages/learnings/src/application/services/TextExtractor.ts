import { RecipeVersion, StandardVersion } from '@packmind/types';

/**
 * Utility class for extracting clean text from knowledge entities for embedding generation.
 * All markdown is stripped to produce plain text suitable for semantic search.
 */
export class TextExtractor {
  /**
   * Strip markdown formatting from text to produce plain text
   */
  private static stripMarkdown(text: string): string {
    let plainText = text;

    // Remove code blocks (```...```)
    plainText = plainText.replace(/```[\s\S]*?```/g, '');

    // Remove inline code (`...`)
    plainText = plainText.replace(/`([^`]+)`/g, '$1');

    // Remove images (![alt](url))
    plainText = plainText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // Remove links but keep text ([text](url))
    plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove headers (# ## ### etc) - including standalone # symbols
    plainText = plainText.replace(/^#{1,6}\s+/gm, '');
    plainText = plainText.replace(/\s*#\s*/g, ' '); // Remove any remaining # symbols

    // Remove bold/italic (**text** or *text* or __text__ or _text_)
    plainText = plainText.replace(/(\*\*|__)(.*?)\1/g, '$2');
    plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2');

    // Remove horizontal rules (--- or ***)
    plainText = plainText.replace(/^(-{3,}|\*{3,})$/gm, '');

    // Remove blockquotes (> )
    plainText = plainText.replace(/^>\s*/gm, '');
    plainText = plainText.replace(/\s*>\s*/g, ' '); // Remove any remaining > symbols

    // Remove list markers (- or * or 1. etc)
    plainText = plainText.replace(/^[\s]*[-*+]\s+/gm, '');
    plainText = plainText.replace(/^[\s]*\d+\.\s+/gm, '');
    // Remove numbered lists that appear after newlines (converted to spaces)
    plainText = plainText.replace(/\s+\d+\.\s+/g, ' ');

    // Normalize whitespace (multiple spaces/newlines to single space)
    plainText = plainText.replace(/\s+/g, ' ');

    // Trim
    plainText = plainText.trim();

    return plainText;
  }

  /**
   * Extract text from StandardVersion for embedding generation.
   * Combines name, description, and rules content, then strips all markdown.
   *
   * @param version StandardVersion to extract text from
   * @returns Clean plain text suitable for embedding
   */
  static extractStandardText(version: StandardVersion): string {
    const parts: string[] = [];

    // Add name
    if (version.name) {
      parts.push(version.name);
    }

    // Add description
    if (version.description) {
      parts.push(version.description);
    }

    // Add rules content
    if (version.rules && version.rules.length > 0) {
      const rulesText = version.rules.map((rule) => rule.content).join(' ');
      parts.push(rulesText);
    }

    // Combine all parts
    const combinedText = parts.join(' ');

    // Strip markdown and return
    return this.stripMarkdown(combinedText);
  }

  /**
   * Extract text from RecipeVersion for embedding generation.
   * Combines name and content, then strips all markdown.
   *
   * @param version RecipeVersion to extract text from
   * @returns Clean plain text suitable for embedding
   */
  static extractRecipeText(version: RecipeVersion): string {
    const parts: string[] = [];

    // Add name
    if (version.name) {
      parts.push(version.name);
    }

    // Add content
    if (version.content) {
      parts.push(version.content);
    }

    // Combine all parts
    const combinedText = parts.join(' ');

    // Strip markdown and return
    return this.stripMarkdown(combinedText);
  }
}
