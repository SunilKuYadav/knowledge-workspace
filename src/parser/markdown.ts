/**
 * Represents a heading extracted from Markdown content.
 */
export interface Heading {
  level: number;
  text: string;
}

/**
 * Renders Markdown to HTML using basic regex transformations.
 * For full rendering in React components, use react-markdown directly.
 * This utility is for non-React contexts (e.g., search indexing, previews).
 */
export function renderMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Fenced code blocks (must come before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = escapeHtml(code);
    const langAttr = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${langAttr}>${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headings (h1 - h6)
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Unordered lists
  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, "<li>$1</li>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr />");

  // Line breaks for paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>");

  // Wrap in paragraph if not already wrapped in block element
  if (!html.startsWith("<")) {
    html = `<p>${html}</p>`;
  }

  return html;
}

/**
 * Extracts all headings from Markdown content with their level and text.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;
  const headings: Heading[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return headings;
}

/**
 * Escapes HTML special characters to prevent XSS in rendered output.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
