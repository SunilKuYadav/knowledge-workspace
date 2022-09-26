// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

/**
 * Parsed Markdown document with separated frontmatter and content.
 */
export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Parses a raw Markdown string containing optional YAML frontmatter.
 * Returns the parsed frontmatter as an object and the remaining content.
 */
export function parseMarkdownWithFrontmatter(raw: string): ParsedMarkdown {
  const { data, content } = matter(raw);
  return {
    frontmatter: data,
    content,
  };
}

/**
 * Serializes a ParsedMarkdown object back into a Markdown string
 * with YAML frontmatter delimiters.
 */
export function serializeMarkdownWithFrontmatter(data: ParsedMarkdown): string {
  return matter.stringify(data.content, data.frontmatter);
}
