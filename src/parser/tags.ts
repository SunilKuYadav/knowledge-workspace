/**
 * Extracts hashtags from Markdown content.
 * Matches #tag-name patterns (alphanumeric and hyphens).
 * Ignores headings (lines starting with #) and tags inside code blocks.
 */
export function extractTags(content: string): string[] {
  // Remove code blocks to avoid matching inside them
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, "");

  // Match hashtags: # followed by word chars and hyphens, not at line start (headings)
  const tagPattern = /(?:^|[^\w#])#([a-zA-Z][a-zA-Z0-9-]*)/gm;
  const tags = new Set<string>();

  // Filter out lines that are headings (start with one or more #)
  const lines = withoutCodeBlocks.split("\n");
  for (const line of lines) {
    // Skip heading lines
    if (/^\s*#{1,6}\s/.test(line)) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(line)) !== null) {
      tags.add(match[1]);
    }
  }

  return Array.from(tags);
}

/**
 * Represents a fenced code block extracted from Markdown.
 */
export interface CodeBlock {
  language: string;
  code: string;
}

/**
 * Extracts fenced code blocks from Markdown content.
 * Matches ```language ... ``` patterns.
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];

  let match: RegExpExecArray | null;
  while ((match = codeBlockPattern.exec(content)) !== null) {
    blocks.push({
      language: match[1] || "",
      code: match[2],
    });
  }

  return blocks;
}
